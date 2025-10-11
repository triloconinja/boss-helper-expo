// src/screens/JoinByCode.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { COLORS } from '../theme';

export default function JoinByCode() {
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const c = contact.trim();
    const k = code.trim();
    if (!c || !k) { Alert.alert('Missing', 'Enter contact and code.'); return; }
    if (!/^\d{6}$/.test(k)) { Alert.alert('Invalid', 'Code must be 6 digits.'); return; }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('accept_invite_code', { p_contact: c, p_code: k });
      if (error) throw error;
      Alert.alert('Joined', 'You have been added to the household.');
      // TODO: navigate to household/home
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Join Household</Text>
          <Text style={styles.sub}>Enter the email or phone number that received the code, plus the 6-digit code.</Text>

          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="Email or +65XXXXXXXX"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Pressable style={[styles.btn, styles.btnPrimary, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
            <Text style={[styles.btnText, { color: '#000' }]}>{loading ? 'Joining…' : 'Join'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 28 },
  sub: { color: '#AEB4BA', fontFamily: 'Montserrat_500Medium', marginBottom: 6 },
  input: {
    backgroundColor: '#1A1E23',
    borderWidth: 1, borderColor: '#41474E',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontFamily: 'Montserrat_500Medium', fontSize: 16,
  },
  btn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14 },
  btnPrimary: { backgroundColor: '#D6F031' },
  btnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },
});
