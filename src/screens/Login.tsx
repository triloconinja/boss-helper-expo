import React, { useEffect, useRef, useState } from 'react';
import { TextInput, Pressable, Text, View, StyleSheet, Alert } from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);

  // 6-digit code
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(60); // resend cooldown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (phase !== 'verify') return;
    // start countdown when we enter verify phase
    setSeconds(60);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          timerRef.current && clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      timerRef.current && clearInterval(timerRef.current);
    };
  }, [phase]);

  async function sendCode() {
    const e = email.trim();
    if (!e) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: {
          shouldCreateUser: true, // allow sign-up on first try
        },
      });
      if (error) throw error;
      setPhase('verify');
      Alert.alert('Code sent', 'Check your email for the 6-digit code.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    const e = email.trim();
    const t = code.trim();
    if (t.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: e,
        token: t,
        type: 'email', // email magic code
      });
      if (error) throw error;

      // Optional cleanup: reset form for next time.
      setPhase('request');
      setCode('');
      // No manual navigation needed — AuthGate will switch to the app automatically.
    } catch (err: any) {
      Alert.alert('Verify failed', err?.message ?? 'The code is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (seconds > 0) return;
    await sendCode();
  }

  const onChangeCode = (v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };

  return (
    <Screen topGutter={24}>
      <Text style={styles.h1}>Login</Text>
      <View style={{ height: 16 }} />

      {phase === 'request' && (
        <>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#9AA0A6"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
          />
          <View style={{ height: 16 }} />
          <Pressable style={[styles.btn, loading && { opacity: 0.6 }]} onPress={sendCode} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send 6-digit Code'}</Text>
          </Pressable>
        </>
      )}

      {phase === 'verify' && (
        <>
          <Text style={styles.subtle}>We sent a 6-digit code to</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={{ height: 12 }} />
          <TextInput
            placeholder="Enter 6-digit code"
            placeholderTextColor="#9AA0A6"
            value={code}
            onChangeText={onChangeCode}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={6}
            editable={!loading}
          />
          <View style={{ height: 16 }} />
          <Pressable style={[styles.btn, loading && { opacity: 0.6 }]} onPress={verifyCode} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & Sign In'}</Text>
          </Pressable>

          <View style={{ height: 12 }} />
          <Text style={styles.resendRow}>
            Didn’t get it?{' '}
            <Text
              onPress={resendCode}
              style={[styles.resendLink, seconds > 0 && { opacity: 0.5 }]}
              suppressHighlighting
            >
              Resend{seconds > 0 ? ` (${seconds})` : ''}
            </Text>
          </Text>

          <View style={{ height: 12 }} />
          <Pressable
            onPress={() => {
              setPhase('request');
              setCode('');
            }}
          >
            <Text style={styles.changeEmail}>Use a different email</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 40,
    lineHeight: 44,
  },
  subtle: {
    color: '#9AA0A6',
    fontFamily: 'Montserrat_400Regular',
  },
  email: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E3338',
    backgroundColor: '#14171B',
    paddingHorizontal: 14,
    color: COLORS.text,
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 1,
  },
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0268EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  resendRow: {
    color: '#9AA0A6',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  resendLink: {
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
    textDecorationLine: 'underline',
  },
  changeEmail: {
    color: '#9AA0A6',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
