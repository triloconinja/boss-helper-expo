// src/components/Calendar.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  Platform,
} from 'react-native';
import { COLORS } from '../theme';
import MonthYearPicker from './MonthYearPicker';
import TaskModal, { Member, Household, TaskSubmitPayload } from './TaskModal';

const BLUE = '#0268EE';
const LIME = '#D6F031';
const DARK = '#1A1E23';

export type CalendarEvent = {
  start: string;                // YYYY-MM-DD
  end?: string;                 // YYYY-MM-DD inclusive
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
// Sunday-first (0..6)
function sundayIndex(d: Date) { return d.getDay(); }

/* ---------- Grid data types ---------- */
type GridItem =
  | { type: 'spacer'; key: string }
  | { type: 'day'; key: string; date: number; fill: 'none' | 'blue' | 'lime'; sub?: string };

const COLS = 7; // ✅ keep only this declaration

/* ---------- Day cell (memo) ---------- */
const DayCell = React.memo(function DayCell({
  item,
  onPress,
}: {
  item: Extract<GridItem, { type: 'day' }>;
  onPress: (key: string) => void;
}) {
  const isBlue = item.fill === 'blue';
  const isLime = item.fill === 'lime';
  const bg = isBlue ? BLUE : isLime ? LIME : DARK;
  const border = isBlue || isLime ? 'transparent' : '#2E3338';
  const numColor = isBlue ? '#fff' : isLime ? '#000' : '#fff';
  const subColor = isBlue ? '#DCE7FF' : isLime ? '#000000B3' : '#AAB2B9';

  return (
    <Pressable
      onPress={() => onPress(item.key)}
      style={styles.col}
      hitSlop={10}
      android_ripple={Platform.OS === 'android' ? { color: '#ffffff15', borderless: false } : undefined}
    >
      <View style={[styles.cellBox, { backgroundColor: bg, borderColor: border }]}>
        <Text style={[styles.num, { color: numColor }]}>{String(item.date).padStart(2, '0')}</Text>
        {!!item.sub && (
          <Text numberOfLines={1} style={[styles.sub, { color: subColor }]}>
            {item.sub}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

/* ---------- Spacer (memo) ---------- */
const SpacerCell = React.memo(function SpacerCell() {
  return <View style={styles.col} />;
});

/* ---------- Calendar ---------- */
export default function Calendar({
  events = [] as CalendarEvent[],
  members = [] as Member[],
  households = [] as Household[],
  onCreateTask,
}: {
  events?: CalendarEvent[];
  members?: Member[];
  households?: Household[];
  onCreateTask: (payload: TaskSubmitPayload) => Promise<void> | void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedDateYMD, setSelectedDateYMD] = useState<string>(ymd(today));

  // keep modal mounted once (avoids heavy remount cost)
  const mountedModal = useRef(false);
  if (!mountedModal.current) mountedModal.current = true;

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const leadingSpacers = sundayIndex(firstOfMonth);

  const gridData: GridItem[] = useMemo(() => {
    const items: GridItem[] = [];
    for (let i = 0; i < leadingSpacers; i++) {
      items.push({ type: 'spacer', key: `sp-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = ymd(date);
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
      items.push({ type: 'day', key, date: d, fill, sub });
    }
    // pad tail
    const remainder = items.length % COLS;
    if (remainder !== 0) {
      const pad = COLS - remainder;
      for (let i = 0; i < pad; i++) {
        items.push({ type: 'spacer', key: `tail-${i}` });
      }
    }
    return items;
  }, [daysInMonth, events, leadingSpacers, month, year]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }, [month]);
  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }, [month]);

  const openTaskForDay = useCallback((dateYMD: string) => {
    setSelectedDateYMD(dateYMD);
    requestAnimationFrame(() => setTaskModalOpen(true));
  }, []);

  const handleCreateTask = useCallback(async (payload: TaskSubmitPayload) => {
    await onCreateTask({ ...payload, dateYMD: payload.dateYMD ?? selectedDateYMD });
  }, [onCreateTask, selectedDateYMD]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GridItem>) => {
      if (item.type === 'spacer') return <SpacerCell />;
      return <DayCell item={item} onPress={openTaskForDay} />;
    },
    [openTaskForDay]
  );

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={prevMonth} hitSlop={12}><Text style={styles.chev}>{'‹'}</Text></Pressable>
        <Pressable onPress={() => setPickerOpen(true)} style={{ alignItems: 'center' }}>
          <Text style={styles.hMonth}>{MONTHS[month]}</Text>
          <Text style={styles.hYear}>{year}</Text>
        </Pressable>
        <Pressable onPress={nextMonth} hitSlop={12}><Text style={styles.chev}>{'›'}</Text></Pressable>
      </View>

      {/* Weekdays (Sunday first) */}
      <View style={styles.weekHeaderRow}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <View key={d} style={styles.col}>
            <View style={styles.dowChip}><Text style={styles.dowText}>{d}</Text></View>
          </View>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={gridData}
        keyExtractor={(it) => it.key}
        numColumns={COLS}
        renderItem={renderItem}
        scrollEnabled={false}
        removeClippedSubviews
        initialNumToRender={42}
        windowSize={3}
        contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 6 }}
      />

      {/* Month/Year popup */}
      <MonthYearPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        month={month}
        year={year}
        yearRange={[2020, 2026]}
        onSelect={(m, y) => { setPickerOpen(false); setMonth(m); setYear(y); }}
      />

      {/* Task Modal (kept mounted) */}
      {mountedModal.current && (
        <TaskModal
          visible={taskModalOpen}
          dateYMD={selectedDateYMD}
          members={members}
          households={households}
          onClose={() => setTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  wrap: { paddingTop: 22, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 10, marginBottom: 8,
  },
  chev: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 34, width: 34, textAlign: 'center' },
  hMonth: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 36, lineHeight: 40, textAlign: 'center' },
  hYear: { color: COLORS.textMuted, fontFamily: 'Montserrat_700Bold', fontSize: 24, lineHeight: 28, textAlign: 'center', marginTop: 2 },

  weekHeaderRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 2 },

  // exact 7 equal columns; padding/border on inner box, not on the column itself
  col: {
    flex: 1 / COLS,
    paddingRight: 4,
    paddingBottom: 4,
  },

  dowChip: {
    height: 36,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2E3338',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dowText: { color: COLORS.text, fontFamily: 'Montserrat_500Medium', fontSize: 14 },

  cellBox: {
    height: 88,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 5,
    paddingVertical: 10,
    justifyContent: 'space-between',
    backgroundColor: '#1A1E23',
    borderColor: '#2E3338',
  },
  num: { fontFamily: 'Montserrat_700Bold', fontSize: 12, letterSpacing: 0.1, color: '#fff' },
  sub: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: '#AAB2B9' },
});
