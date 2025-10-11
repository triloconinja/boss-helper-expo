// src/screens/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

/* ---------------------- Decorative Components ---------------------- */
function CornerArt({ stroke = '#00000040', style }: { stroke?: string; style?: any }) {
  return (
    <Svg width={92} height={92} viewBox="0 0 92 92" style={[styles.art, style]}>
      <Path d="M2 70c24-26 60-40 88-36" stroke={stroke} strokeWidth={1.5} fill="none" />
      <Path d="M14 84c23-25 54-38 78-34" stroke={stroke} strokeWidth={1.5} fill="none" />
      <Path d="M0 56c26-24 58-34 90-30" stroke={stroke} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

function ArrowArt({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={46} height={16} viewBox="0 0 46 16" style={styles.arrow}>
      <Path d="M0 8h38" stroke={color} strokeWidth={2} />
      <Path d="M30 2l8 6-8 6" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function StatCard({
  value,
  title,
  bg,
  titleColor,
  valueColor,
  borderColor,
  style,
  showArt = true,
  artStroke,
  showArrow = false,
  artPosition = 'topRight',
}: {
  value: string | number;
  title: string;
  bg: string;
  titleColor: string;
  valueColor: string;
  borderColor?: string;
  style?: any;
  showArt?: boolean;
  artStroke?: string;
  showArrow?: boolean;
  artPosition?: 'topRight' | 'topLeft';
}) {
  return (
    <View style={[styles.cardBase, styles.shadow, { backgroundColor: bg, borderColor }, style]}>
      {showArt && (
        <CornerArt
          stroke={artStroke}
          style={artPosition === 'topLeft' ? styles.artLeft : styles.artRight}
        />
      )}
      {showArrow && <ArrowArt color={valueColor} />}
      <Text style={[styles.cardValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.cardTitle, { color: titleColor }]}>{title}</Text>
    </View>
  );
}

/* ---------------------- Date Utilities ---------------------- */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfWeekSunday(d = new Date()) {
  const out = new Date(d);
  const diff = out.getDay();
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function endOfWeekSunday(d = new Date()) {
  const start = startOfWeekSunday(d);
  const out = new Date(start);
  out.setDate(start.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}
const toISO = (d: Date) => d.toISOString();

/* ---------------------- Dashboard Screen ---------------------- */
export default function Dashboard() {
  const [role, setRole] = useState<'boss' | 'helper' | 'unknown'>('unknown');
  const [userId, setUserId] = useState<string | null>(null);
  const [householdIds, setHouseholdIds] = useState<string[]>([]);

  const [todayPending, setTodayPending] = useState(0);
  const [plannedPending, setPlannedPending] = useState(0);
  const [completedWeek, setCompletedWeek] = useState(0);
  const [pendingWeek, setPendingWeek] = useState(0);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  /* Load user + memberships */
  const loadIdentity = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setRole('unknown');
      setHouseholdIds([]);
      return;
    }

    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('household_id, role')
      .eq('user_id', uid);

    if (error) {
      console.log('Memberships error', error);
      setRole('unknown');
      setHouseholdIds([]);
      return;
    }

    const hh = memberships?.map((m) => m.household_id) ?? [];
    setHouseholdIds(hh);
    const isBoss = memberships?.some((m) => m.role === 'boss');
    const isHelper = memberships?.some((m) => m.role === 'helper');
    setRole(isBoss ? 'boss' : isHelper ? 'helper' : 'unknown');
  }, []);

  /* Fetch KPIs */
  const loadKpis = useCallback(async () => {
    if (!userId) return;

    const dayStart = toISO(startOfToday());
    const dayEnd = toISO(endOfToday());
    const weekStart = toISO(startOfWeekSunday());
    const weekEnd = toISO(endOfWeekSunday());

    const scope = (q: any) => {
      if (role === 'boss')
        return householdIds.length ? q.in('household_id', householdIds) : q.eq('household_id', '__none__');
      if (role === 'helper') return q.eq('assignee', userId);
      return q.eq('household_id', '__none__');
    };

    try {
      // Tasks today
      {
        const { count, error } = await scope(
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('completed', false)
            .gte('due_at', dayStart)
            .lte('due_at', dayEnd)
        );
        if (!error) setTodayPending(count ?? 0);
      }

      // Pending overall
      {
        const { count, error } = await scope(
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false)
        );
        if (!error) setPlannedPending(count ?? 0);
      }

      // Pending this week
      {
        const { count, error } = await scope(
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('completed', false)
            .gte('due_at', weekStart)
            .lte('due_at', weekEnd)
        );
        if (!error) setPendingWeek(count ?? 0);
      }

      // Completed this week
      {
        const { count, error } = await scope(
          supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('completed', true)
            .gte('due_at', weekStart)
            .lte('due_at', weekEnd)
        );
        if (!error) setCompletedWeek(count ?? 0);
      }
    } catch (e) {
      console.log('KPI load error', e);
    }
  }, [userId, role, householdIds]);

  useFocusEffect(
    useCallback(() => {
      loadIdentity();
    }, [loadIdentity])
  );

  useEffect(() => {
    if (userId) loadKpis();
  }, [userId, role, householdIds, loadKpis]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        loadIdentity().then(loadKpis);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [loadIdentity, loadKpis]);

  const blueTitle = useMemo(() => {
    if (role === 'boss') return 'Tasks assigned this week';
    if (role === 'helper') return 'Your tasks this week';
    return 'Tasks this week';
  }, [role]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.h1}>You have</Text>
        <Text style={styles.h1}>{todayPending} tasks today</Text>

        {/* Row 1 */}
        <View style={styles.row}>
          {/* White card → done this week */}
          <StatCard
            value={completedWeek}
            title="Tasks done this week"
            bg="#FFFFFF"
            titleColor="#00000090"
            valueColor="#000"
            borderColor="#E6E8EB"
            artStroke="#00000025"
            style={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              flex: 1,
            }}
          />

          {/* Lime card → planned overall */}
          <StatCard
            value={plannedPending}
            title="Tasks planned"
            bg="#D6F031"
            titleColor="#000000B0"
            valueColor="#000"
            borderColor="#C3D82C"
            artStroke="#00000030"
            style={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 0,
              flex: 1,
            }}
          />
        </View>

        {/* Blue card → week role-aware */}
        <StatCard
          value={pendingWeek}
          title={blueTitle}
          bg="#0268EE"
          titleColor="#E8EEFF"
          valueColor="#FFFFFF"
          borderColor="#015FDB"
          artStroke="#E8EEFF33"
          showArrow
          artPosition="topLeft"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 0,
          }}
        />

        {/* Lime bottom → completed overall */}
        <StatCard
          value={completedWeek}
          title="Tasks completed overall"
          bg="#D6F031"
          titleColor="#000000B0"
          valueColor="#000"
          borderColor="#C3D82C"
          artStroke="#00000030"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 28,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  h1: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 48,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  cardBase: {
    padding: 22,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
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
  artRight: { position: 'absolute', top: -4, right: -8 },
  artLeft: { position: 'absolute', top: -4, left: -8 },
  arrow: { position: 'absolute', right: 18, top: 28 },
  shadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
});
