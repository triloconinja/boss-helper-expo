import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Screen from '../components/Screens';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
};
type MembershipRow = { role: 'boss' | 'helper'; household_id: string };
type RoleCount = { role: 'boss' | 'helper'; count: number };

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initialsFromEmail(email?: string | null) {
  if (!email) return 'U';
  const base = email.split('@')[0] || 'U';
  return base.slice(0, 2).toUpperCase();
}

/* ---------- Elegant circular backdrop ---------- */
function CircleBackdrop() {
  return (
    <Svg
      width="180%"
      height="180%"
      viewBox="0 0 200 200"
      style={{
        position: 'absolute',
        top: -40,
        left: -40,
        opacity: 0.2,
        transform: [{ rotate: '25deg' }],
      }}
    >
      <Defs>
        <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#1A1E23" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#0F1317" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="100" cy="100" r="90" fill="url(#grad)" />
    </Svg>
  );
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [householdsCount, setHouseholdsCount] = useState(0);
  const [plannedCount, setPlannedCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<RoleCount[]>([]);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setLoading(false);
          Alert.alert('Not signed in', 'Please log in again.');
          return;
        }
        setEmail(user.email ?? null);

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (pErr && pErr.code !== 'PGRST116') throw pErr;

        let row = prof as ProfileRow | null;
        if (!row) {
          const suggestedName = (user.email || '').split('@')[0] || 'User';
          const { data: created, error: iErr } = await supabase
            .from('profiles')
            .insert({ user_id: user.id, full_name: suggestedName, avatar_url: null })
            .select('user_id, full_name, avatar_url, created_at, updated_at')
            .single();
          if (iErr) throw iErr;
          row = created as ProfileRow;
        }

        const { data: mems, error: mErr } = await supabase
          .from('memberships')
          .select('role, household_id')
          .eq('user_id', user.id);
        if (mErr) throw mErr;

        const uniqueHouseholds = new Set((mems ?? []).map((m) => m.household_id));
        const counts = countRoles(mems ?? []);

        const { count: planned } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('completed', false)
          .eq('assignee', user.id);
        const { count: done } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('completed', true)
          .eq('assignee', user.id);

        if (!mounted) return;
        setProfile(row);
        setNameInput(row?.full_name ?? '');
        setMemberSince(row?.created_at ?? user.created_at ?? null);
        setHouseholdsCount(uniqueHouseholds.size);
        setRoleCounts(counts);
        setPlannedCount(planned ?? 0);
        setDoneCount(done ?? 0);
      } catch (e: any) {
        console.log('Profile load error', e);
        Alert.alert('Load failed', e?.message ?? 'Unable to load profile.');
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile() {
    if (!profile) return;
    const newName = nameInput.trim();
    if (!newName) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: profile.user_id, full_name: newName, avatar_url: profile.avatar_url },
          { onConflict: 'user_id' }
        )
        .select('user_id, full_name, avatar_url, created_at, updated_at')
        .single();
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: newName } });
      setProfile(data as ProfileRow);
      setEditing(false);
    } catch (e: any) {
      console.log('Save profile error', e);
      Alert.alert('Save failed', e?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.full_name || (email ? email.split('@')[0] : 'User');
  const initials = useMemo(() => initialsFromEmail(email), [email]);

  if (loading) {
    return (
      <Screen topGutter={24}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen topGutter={24}>
      {/* Header */}
      <View style={styles.headRow}>
        <Text style={styles.h1}>Profile</Text>
        <Pressable onPress={() => setEditing(true)} hitSlop={12}>
          <Ionicons name="create-outline" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Profile Card */}
      <View style={[styles.hero, styles.shadow]}>
        <CircleBackdrop />
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email || '—'}
          </Text>
          <Text style={styles.since}>Member since {formatDate(memberSince)}</Text>
        </View>
      </View>

      {/* Roles */}
      <View style={styles.rolesRow}>
        {roleCounts.length === 0 ? (
          <View style={[styles.roleCard, styles.shadow, { opacity: 0.7 }]}>
            <Ionicons name="information-circle-outline" size={18} color="#9AA0A6" />
            <Text style={styles.roleTitle}>No role yet</Text>
            <Text style={styles.roleSub}>Ask an owner to invite you</Text>
          </View>
        ) : (
          roleCounts.map((r) => <RoleBadge key={r.role} role={r.role} count={r.count} />)
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <SmallStat label="Households" value={householdsCount} />
        <SmallStat label="Tasks planned" value={plannedCount} />
        <SmallStat label="Tasks done" value={doneCount} />
      </View>

      {/* Edit Modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => !saving && setEditing(false)}>
          <Pressable style={[styles.sheet, styles.shadow]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <Text style={styles.inputLabel}>Display name</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor="#8E98A3"
              autoFocus
              style={styles.input}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={saveProfile}
            />
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable
                disabled={saving}
                style={[styles.btn, styles.btnGhost, saving && { opacity: 0.6 }]}
                onPress={() => setEditing(false)}
              >
                <Text style={[styles.btnText, { color: COLORS.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.6 }]}
                onPress={saveProfile}
              >
                <Text style={[styles.btnText, { color: '#0A0D12' }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/* --- Reuse small stat + roles --- */
function SmallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={[stat.card, styles.shadow]}>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

function RoleBadge({ role, count }: { role: 'boss' | 'helper'; count: number }) {
  const isBoss = role === 'boss';
  const icon = isBoss ? 'shield-checkmark' : 'people';
  const title = isBoss ? 'Boss' : 'Helper';
  const sub = count === 1 ? '1 home' : `${count} homes`;
  return (
    <View style={[styles.roleCard, styles.shadow, isBoss ? styles.roleBoss : styles.roleHelper]}>
      <View style={styles.roleIcon}>
        <Ionicons name={`${icon}-outline` as any} size={18} color={isBoss ? '#0A0D12' : '#000'} />
      </View>
      <Text style={[styles.roleTitle, { color: isBoss ? '#0A0D12' : '#000' }]}>{title}</Text>
      <Text style={[styles.roleSub, { color: isBoss ? '#0A0D12AA' : '#000000AA' }]}>{sub}</Text>
    </View>
  );
}

/* --- Helpers --- */
function countRoles(memberships: MembershipRow[]): RoleCount[] {
  const byRole = memberships.reduce<Record<'boss' | 'helper', Set<string>>>((acc, m) => {
    if (!acc[m.role]) acc[m.role] = new Set<string>();
    acc[m.role].add(m.household_id);
    return acc;
  }, { boss: new Set<string>(), helper: new Set<string>() });

  const out: RoleCount[] = [];
  (['boss', 'helper'] as const).forEach((r) => {
    const c = byRole[r].size;
    if (c > 0) out.push({ role: r, count: c });
  });
  return out;
}

/* --- Styles --- */
const styles = StyleSheet.create({
  h1: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 40, lineHeight: 44 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hero: {
    backgroundColor: '#0F1317',
    borderWidth: 1,
    borderColor: '#20262C',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#151A1F',
    borderWidth: 1,
    borderColor: '#242A31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 28,
    letterSpacing: 1,
  },
  displayName: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 24, lineHeight: 28 },
  email: { marginTop: 4, color: '#9AA0A6', fontFamily: 'Montserrat_400Regular' },
  since: { marginTop: 6, color: '#8C96A2', fontFamily: 'Montserrat_500Medium', fontSize: 12 },
  rolesRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  roleCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  roleBoss: { backgroundColor: '#D6F031', borderColor: '#C3D82C' },
  roleHelper: { backgroundColor: '#FFFFFF', borderColor: '#E6E8EB' },
  roleIcon: { marginBottom: 6 },
  roleTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },
  roleSub: { fontFamily: 'Montserrat_500Medium', fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', padding: 20, justifyContent: 'center' },
  sheet: {
    backgroundColor: '#13181E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262D34',
  },
  sheetTitle: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 18, marginBottom: 10 },
  inputLabel: { color: '#9AA0A6', fontFamily: 'Montserrat_500Medium', marginBottom: 6 },
  input: {
    backgroundColor: '#0F1317',
    borderWidth: 1,
    borderColor: '#2A3139',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
  },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  btnGhost: { backgroundColor: '#FFFFFF12', borderWidth: 1, borderColor: '#FFFFFF20' },
  btnPrimary: { backgroundColor: '#D6F031' },
  btnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },
  shadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 6 },
    }),
  },
});

const stat = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1A1E23',
    borderColor: '#2E3338',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  value: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 24, marginBottom: 4 },
  label: { color: '#9AA0A6', fontFamily: 'Montserrat_500Medium', fontSize: 12 },
});
