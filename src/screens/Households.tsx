// src/screens/Households.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from '@gorhom/portal';
import { COLORS } from '../theme';
import { supabase } from '../supabase';
import countryData from 'country-telephone-data';

type Household = { id: string; name: string };
const CREATOR_ROLE = 'boss';
const ASEAN_PRIORITY = ['SG', 'MY', 'PH', 'TH', 'ID', 'VN', 'BN', 'KH', 'LA', 'MM', 'TL'];

const RAW_COUNTRIES = (countryData as any).allCountries.map((c: any) => ({
  code: String(c.iso2 || '').toUpperCase(),
  name: String(c.name || ''),
  dial: `+${c.dialCode}`,
}));

const COUNTRIES = [
  ...RAW_COUNTRIES
    .filter((c) => ASEAN_PRIORITY.includes(c.code))
    .sort((a, b) => (a.code === 'SG' ? -1 : b.code === 'SG' ? 1 : a.name.localeCompare(b.name))),
  ...RAW_COUNTRIES.filter((c) => !ASEAN_PRIORITY.includes(c.code)),
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isE164 = (v: string) => /^\+?[1-9]\d{6,15}$/.test(v.trim());

export default function HouseholdsScreen() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [inviteOpen, setInviteOpen] = useState<Household | null>(null);
  const [inviteKind, setInviteKind] = useState<'email' | 'phone'>('email');
  const [inviteContact, setInviteContact] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  const [countryModal, setCountryModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] =
    useState(COUNTRIES.find((c) => c.code === 'SG') || COUNTRIES[0]);

  const [successOverlay, setSuccessOverlay] = useState<{
    visible: boolean;
    kind: 'email' | 'sms' | null;
  }>({ visible: false, kind: null });

  const phoneMaxDigits = useMemo(() => {
    const dialDigits = selectedCountry.dial.replace('+', '').length;
    return Math.max(1, 15 - dialDigits);
  }, [selectedCountry.dial]);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        setHouseholds([]);
        return;
      }

      const { data: mems, error: memErr } = await supabase
        .from('memberships')
        .select('household_id')
        .eq('user_id', uid);

      if (memErr) throw memErr;

      const ids = (mems ?? []).map((m: any) => m.household_id).filter(Boolean);
      if (!ids.length) {
        setHouseholds([]);
        return;
      }

      const { data: hhs, error: hhErr } = await supabase
        .from('households')
        .select('id, name')
        .in('id', ids);

      if (hhErr) throw hhErr;

      setHouseholds((hhs ?? []) as Household[]);
    } catch (e) {
      console.log('Load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setSaving(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not authenticated');

      const { data: hh, error: insErr } = await supabase
        .from('households')
        .insert({ name: trimmed, created_by: uid })
        .select('id, name')
        .single();

      if (insErr) throw insErr;

      await supabase
        .from('memberships')
        .upsert(
          { user_id: uid, household_id: (hh as any).id, role: CREATOR_ROLE },
          { onConflict: 'user_id,household_id', ignoreDuplicates: true }
        );

      setHouseholds((prev) => [hh as Household, ...prev]);
      setAdding(false);
      setName('');
    } catch (e) {
      console.log(e);
    } finally {
      setSaving(false);
    }
  };

  const onToggleInviteKind = (next: 'email' | 'phone') => {
    setInviteKind(next);
    setInviteContact('');
    setSearch('');
  };

  const sendInvite = async () => {
    const local = inviteContact.trim();
    const contact =
      inviteKind === 'phone' ? `${selectedCountry.dial}${local}` : inviteContact.trim();

    if (inviteKind === 'email') {
      if (!isEmail(contact)) return;
    } else {
      if (!/^\d+$/.test(local)) return;
      if (!isE164(contact)) return;
    }
    if (!inviteOpen) return;

    try {
      Keyboard.dismiss();
      setInviteSaving(true);

      const { data: sess } = await supabase.auth.getSession();
      const fnUrl = process.env.EXPO_PUBLIC_SB_FUNCTION_URL || '';
      if (!fnUrl) throw new Error('Missing EXPO_PUBLIC_SB_FUNCTION_URL');

      const res = await fetch(`${fnUrl}/send-invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sess.session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          household_id: inviteOpen.id,
          role: 'helper',
          contact,
          contact_kind: inviteKind,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Failed to send code: ${res.status} ${t}`);
      }

      // success → close modal, reset input, show overlay
      setInviteOpen(null);
      setCountryModal(false);
      setInviteContact('');
      setSuccessOverlay({ visible: true, kind: inviteKind === 'email' ? 'email' : 'sms' });
    } catch (e) {
      console.log(e);
    } finally {
      setInviteSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Households</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : households.length === 0 ? (
          <View style={[styles.card, styles.cardDark]}>
            <Text style={styles.cardTitle}>No households yet</Text>
            <Text style={styles.cardSub}>Create your first household to start assigning tasks.</Text>
          </View>
        ) : (
          households.map((h) => (
            <View key={h.id} style={[styles.card, styles.cardDark]}>
              <Text style={styles.cardTitle}>{h.name}</Text>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setInviteOpen(h)}>
                <Text style={[styles.btnText, { color: '#000' }]}>Invite Helper</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable style={[styles.addBtn]} onPress={() => setAdding(true)}>
          <Text style={styles.addBtnText}>Add Household</Text>
        </Pressable>
      </ScrollView>

      {/* Add Household Modal */}
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAdding(false)}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>New Household</Text>
              <TextInput
                placeholder="Household name"
                placeholderTextColor="#889"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
              <Pressable
                style={[styles.btn, styles.btnPrimary, { marginTop: 10, opacity: saving ? 0.6 : 1 }]}
                onPress={add}
                disabled={saving}
              >
                {saving ? <ActivityIndicator /> : <Text style={[styles.btnText, { color: '#000' }]}>Create</Text>}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={!!inviteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteOpen(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setInviteOpen(null)}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.inviteHeader}>
                <Text style={styles.sheetTitle}>Invite Helper</Text>
                <View style={styles.kindTabs}>
                  <Pressable
                    onPress={() => onToggleInviteKind('email')}
                    style={[styles.kindTab, inviteKind === 'email' && styles.kindTabActive]}
                  >
                    <Text style={[styles.kindTabText, inviteKind === 'email' && styles.kindTabTextActive]}>
                      Email
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onToggleInviteKind('phone')}
                    style={[styles.kindTab, inviteKind === 'phone' && styles.kindTabActive]}
                  >
                    <Text style={[styles.kindTabText, inviteKind === 'phone' && styles.kindTabTextActive]}>
                      SMS
                    </Text>
                  </Pressable>
                </View>
              </View>

              {inviteKind === 'email' ? (
                <>
                  <TextInput
                    placeholder="helper@email.com"
                    placeholderTextColor="#889"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    value={inviteContact}
                    onChangeText={setInviteContact}
                  />
                </>
              ) : (
                <>
                  <Pressable style={styles.countryRow} onPress={() => setCountryModal(true)}>
                    <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                    <Text style={styles.countryName}>{selectedCountry.name}</Text>
                    <Ionicons name="chevron-down" size={18} color="#A6ADBA" />
                  </Pressable>
                  <TextInput
                    placeholder="Phone number (no leading 0)"
                    placeholderTextColor="#889"
                    keyboardType="number-pad"
                    style={styles.input}
                    value={inviteContact}
                    onChangeText={(v) => {
                      const next = v.replace(/[^\d]/g, '').slice(0, phoneMaxDigits);
                      setInviteContact(next);
                    }}
                  />
                </>
              )}

              <Pressable
                style={[styles.btn, styles.btnPrimary, { marginTop: 10, opacity: inviteSaving ? 0.6 : 1 }]}
                onPress={sendInvite}
                disabled={inviteSaving}
              >
                {inviteSaving ? <ActivityIndicator /> : <Text style={[styles.btnText, { color: '#000' }]}>Send Invite</Text>}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Country Picker */}
      <Modal
        visible={countryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryModal(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCountryModal(false)}>
          <Pressable style={[styles.sheet, { maxHeight: '70%' }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select Country</Text>
            <TextInput
              placeholder="Search country / dial code"
              placeholderTextColor="#889"
              style={styles.input}
              value={search}
              onChangeText={setSearch}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setCountryModal(false);
                  }}
                >
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemDial}>{item.dial}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Paper plane success overlay */}
      {successOverlay.visible && (
        <Portal hostName="global-toast">
          <View style={styles.overlay}>
            <View style={styles.overlayBox}>
              <Ionicons
                name="paper-plane-outline"
                size={64}
                color="#D6F031"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.overlayText}>
                {successOverlay.kind === 'email' ? 'Email code sent!' : 'SMS code sent!'}
              </Text>
              <Pressable
                style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]}
                onPress={() => setSuccessOverlay({ visible: false, kind: null })}
              >
                <Text style={[styles.btnText, { color: '#000' }]}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Portal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
    paddingBottom: 140,
    paddingHorizontal: 20,
    gap: 20,
  },
  h1: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 48,
  },
  card: {
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardDark: {
    backgroundColor: '#1A1E23',
    borderWidth: 1,
    borderColor: '#2E3338',
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    marginBottom: 10,
  },
  cardSub: {
    color: '#A6ADBA',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
  },
  addBtn: {
    marginTop: 20,
    backgroundColor: '#D6F031',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#000',
  },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  btnPrimary: { backgroundColor: '#D6F031' },
  btnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#2A2F35',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  sheetTitle: {
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },

  input: {
    backgroundColor: '#1F242A',
    borderColor: '#2E3338',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    color: '#FFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
  },

  inviteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kindTabs: {
    flexDirection: 'row',
    backgroundColor: '#1F242A',
    borderRadius: 999,
    padding: 4,
  },
  kindTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  kindTabActive: { backgroundColor: '#D6F031' },
  kindTabText: { color: '#A6ADBA', fontFamily: 'Montserrat_700Bold' },
  kindTabTextActive: { color: '#000' },

  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F242A',
    borderColor: '#2E3338',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  countryDial: { color: '#FFF', fontFamily: 'Montserrat_700Bold' },
  countryName: { color: '#A6ADBA', flex: 1, fontFamily: 'Montserrat_500Medium' },

  countryItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#2E3338',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryItemName: { color: '#FFF', fontFamily: 'Montserrat_500Medium', flex: 1 },
  countryItemDial: { color: '#D6F031', fontFamily: 'Montserrat_700Bold' },

  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  overlayBox: {
    backgroundColor: '#2A2F35',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '75%',
  },
  overlayText: {
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
});
