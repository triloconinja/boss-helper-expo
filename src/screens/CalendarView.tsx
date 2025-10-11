import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme';
import Calendar, { CalendarEvent } from '../components/Calendar';
import { supabase } from '../supabase';
import type { TaskSubmitPayload } from '../components/TaskModal';

type Member = { id: string; name: string };
type Household = { id: string; name: string };

function ymd(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function todayYMD() { return ymd(new Date()); }

/** Build a local date from Y-M-D and hour:minute and return ISO string. */
function buildISO(dateYMD: string, hour: number, minute: number): string {
  const [y, mo, d] = dateYMD.split('-').map(Number);
  const local = new Date(y, (mo ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
  return local.toISOString();
}
function timeFromPayload(p: TaskSubmitPayload): { hour: number; minute: number } {
  if (p.timeHHmm) {
    const m = p.timeHHmm.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
  }
  if (p.time12h) {
    const m = p.time12h.toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (m) {
      let hour = parseInt(m[1], 10) % 12;
      if (m[3] === 'PM') hour += 12;
      return { hour, minute: parseInt(m[2], 10) };
    }
  }
  return { hour: 9, minute: 0 };
}

async function ensureTaskList(householdId: string, forDateYMD: string) {
  const { data: found, error: qErr } = await supabase
    .from('task_lists')
    .select('id')
    .eq('household_id', householdId)
    .eq('for_date', forDateYMD)
    .maybeSingle();
  if (qErr && qErr.code !== 'PGRST116') throw qErr;
  if (found?.id) return found.id as string;

  const { data: ins, error: iErr } = await supabase
    .from('task_lists')
    .insert({ household_id: householdId, for_date: forDateYMD, title: forDateYMD, cycle: 'once' })
    .select('id')
    .single();
  if (iErr) throw iErr;
  return ins.id as string;
}

export default function CalendarView() {
  const nav = useNavigation(); // ✅ hook at top level

  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; due_at: string | null; completed?: boolean | null }[]>(
    []
  );

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const loadHouseholds = useCallback(async () => {
    const { data, error } = await supabase.from('households').select('id,name').order('name');
    if (error) { console.log('Load households error', error); setHouseholds([]); return; }
    setHouseholds((data ?? []) as Household[]);
  }, []);

  const loadMembers = useCallback(async () => {
    const { data: mems, error: mErr } = await supabase.from('memberships').select('user_id').order('user_id');
    if (mErr) { console.log('Load members error (memberships)', mErr); setMembers([]); return; }
    const userIds = Array.from(new Set((mems ?? []).map((r: any) => r.user_id).filter(Boolean)));
    if (userIds.length === 0) { setMembers([]); return; }
    const { data: profs, error: pErr } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
    if (pErr) { console.log('Load members error (profiles)', pErr); setMembers(userIds.map(id => ({ id, name: 'Member' }))); return; }
    const byId = new Map<string, string>();
    (profs ?? []).forEach((p: any) => byId.set(p.user_id, p.full_name || 'Member'));
    setMembers(userIds.map(id => ({ id, name: byId.get(id) || 'Member' })));
  }, []);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,due_at,completed')
      .gte('due_at', monthStart.toISOString())
      .lte('due_at', monthEnd.toISOString());
    if (error) { console.log('Load tasks error', error); setTasks([]); return; }
    setTasks(data ?? []);
  }, [monthStart, monthEnd]);

  useEffect(() => { loadHouseholds(); loadMembers(); loadTasks(); }, [loadHouseholds, loadMembers, loadTasks]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const events: CalendarEvent[] = useMemo(() => {
    const byDate: Record<string, { anyTitle?: string; hasPending: boolean }> = {};
    (tasks ?? []).forEach((t) => {
      if (!t.due_at) return;
      const key = ymd(new Date(t.due_at));
      const e = (byDate[key] ||= { hasPending: false });
      if (!e.anyTitle) e.anyTitle = t.title;
      if (!t.completed) e.hasPending = true;
    });
    return Object.entries(byDate).map(([start, v]) => ({
      start,
      color: v.hasPending ? 'lime' : 'blue',
      sub: v.anyTitle,
    }));
  }, [tasks]);

  const onCreateTask = useCallback(async (payload: TaskSubmitPayload) => {
    try {
      const dateForTask = payload.dateYMD || todayYMD();
      if (!payload.householdId) {
        Alert.alert('Select household', 'Please choose a household for this task.');
        return;
      }
      const listId = await ensureTaskList(payload.householdId, dateForTask);

      const { hour, minute } = timeFromPayload(payload);
      const dueISO = buildISO(dateForTask, hour, minute);

      const { error } = await supabase.from('tasks').insert({
        title: payload.title,
        notes: payload.description ?? null,
        household_id: payload.householdId,
        list_id: listId,
        assignee: payload.assigneeId ?? null,
        due_at: dueISO,
        completed: false,
      });
      if (error) throw error;

      await loadTasks();
      // ✅ use the captured nav instance (no hooks here)
      // @ts-ignore
      (nav as any)?.navigate?.('Tasks');
    } catch (e: any) {
      console.log('Create task error', e);
      Alert.alert('Could not save', e?.message ?? 'Save failed');
    }
  }, [loadTasks, nav]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Calendar
          events={events}
          members={members}
          households={households}
          onCreateTask={onCreateTask}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
