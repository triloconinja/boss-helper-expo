// screens/CalendarMonthView.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import CalendarMonth from '../components/CalendarMonth';
import { buildMonthDays, MiniEvent } from '../utils/buildMonthDays';
import { supabase } from '../supabase';
import type { Member, NewTaskPayload } from '../components/TaskModal';

// TODO: pass this via route/props in your app
const HOUSEHOLD_ID = '<<household-id>>';

// Optional seed events to show labels/colors
const SEED_EVENTS: MiniEvent[] = [
  { start: '2025-10-01', end: '2025-10-04', sub: 'Deadline 4.10', color: 'blue' },
  { start: '2025-10-06', end: '2025-10-08', sub: '15:00', color: 'lime' },
];

export default function CalendarMonthView() {
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month0] = useState(today.getMonth());

  const [members, setMembers] = useState<Member[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 1) Load members (memberships → profiles)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select(`user_id, profiles:user_id ( id, full_name )`)
          .eq('household_id', HOUSEHOLD_ID);

        if (error) throw error;

        const mapped: Member[] = (data ?? []).map((r: any, i: number) => ({
          id: r.profiles?.id ?? r.user_id,
          name: r.profiles?.full_name || `Member ${i + 1}`,
        }));

        setMembers(mapped);
      } catch (e: any) {
        Alert.alert('Members error', e.message ?? 'Failed to load members.');
      }
    })();
  }, []);

  // 2) Ensure a default task list for this household (prevents list_id NOT NULL error)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('task_lists')
          .select('id')
          .eq('household_id', HOUSEHOLD_ID)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data?.id) { setListId(data.id); return; }

        const { data: created, error: insErr } = await supabase
          .from('task_lists')
          .insert({ household_id: HOUSEHOLD_ID, name: 'General' })
          .select('id')
          .single();

        if (insErr) throw insErr;
        setListId(created.id);
      } catch (e: any) {
        Alert.alert('Task list error', e.message ?? 'Failed to prepare task list.');
      }
    })();
  }, []);

  // 3) Build month grid (you can merge real tasks here later)
  const days = useMemo(() => buildMonthDays(year, month0, SEED_EVENTS, true), [year, month0]);

  // 4) Handler: create a task from modal
  const onCreateTask = useCallback(
    async (p: NewTaskPayload) => {
      if (!listId) {
        Alert.alert('Please wait', 'Task list is initializing…');
        return;
      }
      try {
        setSaving(true);
        const { error } = await supabase.from('tasks').insert({
          household_id: HOUSEHOLD_ID,
          list_id: listId,                 // IMPORTANT if tasks.list_id is NOT NULL
          title: p.title,
          description: p.description ?? null,
          assignee_id: p.assigneeId ?? null,
          due_date: p.date,                // YYYY-MM-DD
          status: 'open',
        });
        if (error) throw error;

        // If you want to reflect immediately, you can refetch tasks and rebuild `days` here
        // or push a temporary event into state. Keeping simple for now.
      } catch (e: any) {
        Alert.alert('Create error', e.message ?? 'Failed to create task.');
      } finally {
        setSaving(false);
      }
    },
    [listId]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <CalendarMonth
          title={`${today.toLocaleString('default', { month: 'long' })} ${year}`}
          days={days}
          members={members}
          onCreateTask={onCreateTask}
          isSaving={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
