import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { COLORS } from '../theme';
import MonthYearPicker from './MonthYearPicker';

const BLUE = '#0268EE';
const LIME = '#D6F031';
const DARK = '#1A1E23';

const SIDE = 10;                    // same side padding as cards
const GAP = 4;                      // gap between boxes
const COLS = 7;                     // 7 columns (Mo–Su)
const SCREEN_W = Dimensions.get('window').width;
const CELL_W = Math.floor((SCREEN_W - SIDE * 2 - GAP * (COLS - 1)) / COLS);

export type CalendarEvent = {
  start: string;               // YYYY-MM-DD
  end?: string;                // YYYY-MM-DD inclusive
  color: 'blue' | 'lime';
  sub?: string;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function ymd(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function isBetween(day: string, start: string, end?: string) {
  if (!end) return day === start;
  return day >= start && day <= end;
}

/** Convert JS getDay() (0=Sun..6=Sat) -> Monday-first index (0=Mon..6=Sun) */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export default function Calendar({ events = [] as CalendarEvent[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0..11
  const [pickerOpen, setPickerOpen] = useState(false);  // <-- NEW

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const firstColOffset = mondayIndex(firstOfMonth); // how many columns to shift the 1st

  const dayCells = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const key = ymd(d);

      let fill: 'none' | 'blue' | 'lime' = 'none';
      let sub: string | undefined;
      for (const ev of events) {
        const s = ev.start;
        const e = ev.end ?? ev.start;
        if (isBetween(key, s, e)) {
          fill = ev.color;
          sub = ev.sub;
          break;
        }
      }

      return { key, date: i + 1, fill, sub };
    });
  }, [year, month, daysInMonth, events]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={prevMonth} hitSlop={12}><Text style={styles.chev}>{'‹'}</Text></Pressable>

        {/* Make month/year tappable to open the popup */}
        <Pressable onPress={() => setPickerOpen(true)} style={{ alignItems: 'center' }}>
          <Text style={styles.hMonth}>{MONTHS[month]}</Text>
          <Text style={styles.hYear}>{year}</Text>
        </Pressable>

        <Pressable onPress={nextMonth} hitSlop={12}><Text style={styles.chev}>{'›'}</Text></Pressable>
      </View>

      {/* Weekday chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, paddingVertical: 10, paddingHorizontal: SIDE }}
      >
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d) => (
          <View key={d} style={styles.dowChip}><Text style={styles.dowText}>{d}</Text></View>
        ))}
      </ScrollView>

      {/* Grid – first cell is offset so day 1 sits under the correct weekday */}
      <View style={styles.grid}>
        {dayCells.map(({ key, date, fill, sub }, idx) => {
          const isFirst = idx === 0;
          const offsetStyle = isFirst
            ? { marginLeft: firstColOffset * (CELL_W + GAP) }
            : null;

          const isBlue = fill === 'blue';
          const isLime = fill === 'lime';
          const bg = isBlue ? BLUE : isLime ? LIME : DARK;
          const border = isBlue || isLime ? 'transparent' : '#2E3338';
          const numColor = isBlue ? '#fff' : isLime ? '#000' : '#fff';
          const subColor = isBlue ? '#DCE7FF' : isLime ? '#000000B3' : '#AAB2B9';

          return (
            <View key={key} style={[styles.cell, offsetStyle, { backgroundColor: bg, borderColor: border }]}>
              <Text style={[styles.num, { color: numColor }]}>{String(date).padStart(2, '0')}</Text>
              {!!sub && <Text numberOfLines={1} style={[styles.sub, { color: subColor }]}>{sub}</Text>}
            </View>
          );
        })}
      </View>

      {/* Month/Year popup */}
      <MonthYearPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        month={month}
        year={year}
        yearRange={[2020, 2026]}         // adjust if you want a wider range
        onSelect={(m, y) => {
          setPickerOpen(false);
          setMonth(m);
          setYear(y);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 22, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SIDE, marginBottom: 8,
  },
  chev: {
    color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 34, width: 34, textAlign: 'center',
  },
  hMonth: {
    color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 36, lineHeight: 40, textAlign: 'center',
  },
  hYear: {
    color: COLORS.textMuted, fontFamily: 'Montserrat_700Bold', fontSize: 24, lineHeight: 28, textAlign: 'center',
    marginTop: 2,
  },
  dowChip: {
    borderRadius: 20, borderWidth: 1, borderColor: '#2E3338',
    paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  dowText: { color: COLORS.text, fontFamily: 'Montserrat_500Medium', fontSize: 14 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: SIDE, paddingTop: 8,
  },
  cell: {
    width: CELL_W, height: 88, borderRadius: 15, borderWidth: 1,
    paddingHorizontal: 5, paddingVertical: 10, justifyContent: 'space-between',
  },
  num: { fontFamily: 'Montserrat_700Bold', fontSize: 12, letterSpacing: 0.1 },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 10 },
});
