// supabase/functions/send-invite/index.ts
// Deno Edge Function — OTP invites via Resend (email) or Twilio (SMS)
// Uses only fetch (no Node SDKs). Supports RESEND_FROM secret (optional).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

// ──────────────────────────────
// Types
// ──────────────────────────────
type Body = {
  household_id: string;
  role?: "helper" | "boss";
  contact: string;                 // email OR phone in E.164 format
  contact_kind: "email" | "phone";
  ttl_minutes?: number;            // default 15 (1..60)
};

// ──────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Env (Supabase injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Email (Resend)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
// ✅ Optional secret — if not set, defaults to Resend sandbox sender so you can test without DNS
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";

// SMS (Twilio)
const TWILIO_SID = Deno.env.get("TWILIO_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM = Deno.env.get("TWILIO_FROM") || "";

// DB
const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ──────────────────────────────
// Utilities
// ──────────────────────────────
const isEmail = (x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
const isPhone = (x: string) => /^\+?[1-9]\d{6,15}$/.test(x.trim()); // simple E.164-ish
const genCode = () => String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────────
serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
    }

    // Auth (keep verify_jwt enabled on the function)
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    const { data: u } = await db.auth.getUser(jwt);
    const user = u?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    // Body
    const body = (await req.json()) as Body;
    const { household_id, contact, contact_kind } = body;
    const role = body.role ?? "helper";
    const ttl = Math.max(1, Math.min(60, body.ttl_minutes ?? 15)); // clamp 1..60

    // Validate
    if (!household_id) throw new Error("household_id is required");
    if (!contact) throw new Error("contact is required");
    if (!contact_kind) throw new Error("contact_kind is required");
    if (role !== "helper" && role !== "boss") throw new Error("role must be helper or boss");
    if (contact_kind === "email" && !isEmail(contact)) throw new Error("Invalid email");
    if (contact_kind === "phone" && !isPhone(contact)) throw new Error("Invalid phone (E.164)");

    // Ensure caller is a boss for that household
    const { data: mem, error: memErr } = await db
      .from("memberships")
      .select("role")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();
    if (memErr || mem?.role !== "boss") {
      return new Response(JSON.stringify({ error: "Only bosses can send invites for this household" }), {
        status: 403, headers: CORS,
      });
    }

    // Generate & store OTP (hashed)
    const code = genCode();
    const hash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

    // Revoke any prior pending invite for same contact+household (optional safety)
    await db
      .from("invitations")
      .update({ status: "revoked" })
      .eq("household_id", household_id)
      .eq("contact", contact)
      .eq("status", "pending");

    // Insert invite
    const { data: inv, error: invErr } = await db
      .from("invitations")
      .insert({
        household_id,
        inviter_id: user.id,
        role,
        contact,
        contact_kind,
        otp_code_hash: hash,
        otp_expires_at: expiresAt,
        status: "pending",
      })
      .select("id")
      .single();
    if (invErr) throw invErr;

    const messageText =
      `Your Boss Helper code is ${code}. It expires in ${ttl} minutes.\n` +
      `Enter this code in the app to join the household. Do not share this code.`;

    if (contact_kind === "email") {
      // EMAIL via Resend
      if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
      // If you haven't verified a domain yet, use the default sandbox sender `onboarding@resend.dev`.
      // To use your own domain, set RESEND_FROM to e.g. noreply@yourdomain.com and verify it in Resend.
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Boss Helper <${RESEND_FROM}>`,
          to: [contact],
          subject: "Your Boss Helper code",
          text: messageText,
          html: `<p>${messageText.replace(/\n/g, "<br/>")}</p>`,
        }),
      });
      if (!r.ok) throw new Error(`Resend error: ${await r.text()}`);
    } else {
      // SMS via Twilio
      if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM)
        throw new Error("Missing Twilio env (TWILIO_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM)");

      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To: contact,
          Body: messageText,
        }),
      });
      if (!r.ok) throw new Error(`Twilio error: ${await r.text()}`);
    }

    return new Response(JSON.stringify({ ok: true, invitation_id: inv.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    console.error("send-invite error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
