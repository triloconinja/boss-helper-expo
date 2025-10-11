import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TextInput,
  Pressable,
  Text,
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

export default function Login() {
  const [phase, setPhase] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // resend cooldown
  const [seconds, setSeconds] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop timer when entering/exiting verify phase
  useEffect(() => {
    if (phase !== 'verify') {
      timerRef.current && clearInterval(timerRef.current);
      setSeconds(60);
      return;
    }
    timerRef.current && clearInterval(timerRef.current);
    setSeconds(60);
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

  const sendCode = useCallback(async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setPhase('verify');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const verifyCode = useCallback(async () => {
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
        type: 'email',
      });
      if (error) throw error;
      // AuthGate should take over on success
    } catch (err: any) {
      Alert.alert('Verify failed', err?.message ?? 'The code is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  }, [email, code]);

  const resendCode = useCallback(async () => {
    if (seconds > 0) return;
    await sendCode();
  }, [seconds, sendCode]);

  const onChangeCode = (v: string) => {
    setCode(v.replace(/[^0-9]/g, '').slice(0, 6));
  };

  return (
    <Screen topGutter={24}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.h1}>Login</Text>
          <View style={{ height: 12 }} />
          <Text style={styles.subtle}>Welcome back! Sign in with a one-time code sent to your email.</Text>
          <View style={{ height: 24 }} />

          {phase === 'request' && (
            <>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#9AA0A6"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
              />
              <View style={{ height: 16 }} />
              <Pressable style={[styles.btnPrimary, loading && { opacity: 0.6 }]} onPress={sendCode} disabled={loading}>
                <Text style={styles.btnPrimaryTxt}>{loading ? 'Sending…' : 'Send 6-digit code'}</Text>
              </Pressable>
            </>
          )}

          {phase === 'verify' && (
            <>
              <Text style={styles.subtle}>
                We sent a 6-digit code to{' '}
                <Text style={{ color: COLORS.text, fontFamily: 'Montserrat_700Bold' }}>{email}</Text>
              </Text>
              <View style={{ height: 12 }} />
              <Text style={styles.label}>Enter code</Text>
              <TextInput
                placeholder="123456"
                placeholderTextColor="#9AA0A6"
                value={code}
                onChangeText={onChangeCode}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
                editable={!loading}
              />
              <View style={{ height: 16 }} />
              <Pressable style={[styles.btnLime, loading && { opacity: 0.6 }]} onPress={verifyCode} disabled={loading}>
                <Text style={styles.btnLimeTxt}>{loading ? 'Verifying…' : 'Verify & Sign in'}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: {
    color: '#E6EAF0',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 6,
    marginBottom: 6,
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
  btnPrimary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0268EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryTxt: {
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  btnLime: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#D6F031',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLimeTxt: {
    color: '#000',
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
