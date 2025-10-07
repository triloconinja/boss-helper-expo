import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

function StatCard({
  value,
  title,
  bg = '#1A1E23',
  titleColor = COLORS.textMuted,
  valueColor = COLORS.text,
}: {
  value: string | number;
  title: string;
  bg?: string;
  titleColor?: string;
  valueColor?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.cardValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.cardTitle, { color: titleColor }]}>{title}</Text>
    </View>
  );
}

export default function Dashboard() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.h1}>You have</Text>
        <Text style={styles.h1}>12 tasks today</Text>

        {/* Task Planned - Green */}
        <StatCard
          value="12"
          title="Tasks planned"
          bg="#D6F031"
          valueColor="#000"
          titleColor="#000000B0"
        />

        {/* Pending Task Today - Blue */}
        <StatCard
          value="8"
          title="Pending tasks today"
          bg="#0268EE"
          valueColor="#fff"
          titleColor="#E8EEFF"
        />

        {/* Task Done - Gray */}
        <StatCard
          value="48"
          title="Tasks done"
          bg="#1A1E23"
          valueColor="#fff"
          titleColor={COLORS.textMuted}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  h1: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 48,
  },
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2E3338',
  },
  cardValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 48,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
  },
});
