import React, { useState } from 'react';
import { TextInput, Pressable, Text, View, StyleSheet } from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';

export default function Login() {
  const [email, setEmail] = useState('');

  return (
    <Screen topGutter={24}>
      <Text style={styles.h1}>Login</Text>

      <View style={{ height: 16 }} />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#9AA0A6"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <View style={{ height: 16 }} />

      <Pressable style={styles.btn}>
        <Text style={styles.btnText}>Send Magic Link</Text>
      </Pressable>
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
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E3338',
    backgroundColor: '#14171B',
    paddingHorizontal: 14,
    color: COLORS.text,
    fontFamily: 'Montserrat_500Medium',
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
});
