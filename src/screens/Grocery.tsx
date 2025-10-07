import React from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';

const items = [
  { name: 'Rice 5kg', qty: '1 bag' },
  { name: 'Eggs', qty: '30 pcs' },
  { name: 'Chicken breast', qty: '2 kg' },
];

export default function Grocery() {
  return (
    <Screen topGutter={24}>
      <Text style={styles.h1}>Grocery</Text>
      <View style={{ height: 16 }} />
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.left}>{it.name}</Text>
          <Text style={styles.right}>{it.qty}</Text>
        </View>
      ))}
      <View style={{ height: 18 }} />
      <Pressable style={styles.btn}>
        <Text style={styles.btnText}>Add Item</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 40, lineHeight: 44,
  },
  row: {
    height: 64, borderRadius: 24, paddingHorizontal: 18, marginBottom: 12,
    backgroundColor: '#1A1E23', borderWidth: 1, borderColor: '#2E3338',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  left: { color: COLORS.text, fontFamily: 'Montserrat_500Medium', fontSize: 16 },
  right: { color: COLORS.textMuted, fontFamily: 'Montserrat_500Medium', fontSize: 15 },
  btn: {
    height: 56, borderRadius: 20, backgroundColor: '#0268EE',
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 16 },
});
