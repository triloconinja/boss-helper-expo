// src/components/AuthDebug.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';

export default function AuthDebug() {
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string>('');
  const [sessionStr, setSessionStr] = useState<string>('loading…');

  useEffect(() => {
    setRedirectTo(makeRedirectUri({ scheme: 'bosshelper' }));

    (async () => {
      const u = await Linking.getInitialURL();
      setInitialUrl(u ?? null);
    })();

    const sub = Linking.addEventListener('url', ({ url }) => {
      setLastUrl(url);
    });

    const updateSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionStr(JSON.stringify(data.session, null, 2));
    };

    updateSession();
    const { data: authSub } = supabase.auth.onAuthStateChange(updateSession);

    return () => {
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Auth Debug</Text>
      <Text style={styles.kv}>redirectTo:</Text>
      <Text style={styles.val}>{redirectTo}</Text>

      <Text style={styles.kv}>initialUrl:</Text>
      <Text style={styles.val}>{initialUrl ?? '—'}</Text>

      <Text style={styles.kv}>lastUrl (live):</Text>
      <Text style={styles.val}>{lastUrl ?? '—'}</Text>

      <Text style={styles.kv}>session:</Text>
      <ScrollView style={{ maxHeight: 160 }}>
        <Text style={styles.val}>{sessionStr}</Text>
      </ScrollView>

      <Pressable
        style={styles.btn}
        onPress={async () => {
          const { error } = await supabase.auth.signOut();
          if (error) console.log('signOut error', error);
        }}
      >
        <Text style={styles.btnText}>Force Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2E3338' },
  h: { fontWeight: '700', marginBottom: 6 },
  kv: { marginTop: 8, fontWeight: '600' },
  val: { fontFamily: 'Courier', fontSize: 12 },
  btn: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#22262B' },
  btnText: { color: '#fff', textAlign: 'center' },
});
