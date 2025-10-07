import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import Calendar, { CalendarEvent } from '../components/Calender';

const EVENTS: CalendarEvent[] = [
  { start: '2025-10-01', end: '2025-10-04', color: 'blue', sub: 'Deadline 4.10' },
  { start: '2025-10-06', end: '2025-10-08', color: 'lime', sub: '15:00' },
  { start: '2025-10-12', color: 'lime', sub: '13:00' },
  { start: '2025-10-15', color: 'blue', sub: '15:30' },
  { start: '2025-10-16', color: 'lime', sub: '9:00' },
  { start: '2025-10-19', color: 'blue', sub: '16:00' },
  { start: '2025-10-22', end: '2025-10-25', color: 'lime', sub: 'Deadline 25.10' },
  { start: '2025-10-26', end: '2025-10-28', color: 'blue', sub: '11:00' },
];

export default function CalendarView() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Calendar events={EVENTS} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
});
