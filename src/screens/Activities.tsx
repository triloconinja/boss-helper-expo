import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';

const rows = [
  { title: 'Dodong completed "Wash Dishes"', time: '10:45' },
  { title: 'Maid added "Dish Soap" to Grocery', time: '09:15' },
  { title: 'Boss created task "Mop Living Room"', time: '08:02' },
];

export default function Activities() {
  return (
    <Screen topGutter={24}>
      <Text style={styles.h1}>Activities</Text>
      <View style={{ height: 16 }} />
      {rows.map((r, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.title}>{r.title}</Text>
          <Text style={styles.time}>{r.time}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 40, lineHeight: 44,
  },
  card: {
    borderRadius: 24, padding: 18, marginBottom: 14,
    backgroundColor: '#1A1E23', borderWidth: 1, borderColor: '#2E3338',
  },
  title: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 18, marginBottom: 6 },
  time: { color: COLORS.textMuted, fontFamily: 'Montserrat_500Medium' },
});
