import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { AndroidNativeProps, IOSNativeProps } from '@react-native-community/datetimepicker';
import { COLORS } from '../theme';

export type Member = { id: string; name: string };
export type Household = { id: string; name: string };

export type TaskSubmitPayload = {
  title: string;
  description?: string | null;
  time12h?: string | null;     // e.g. "3:30 PM"
  timeHHmm?: string | null;    // e.g. "15:30"
  householdId?: string | null;
  assigneeId?: string | null;
  dateYMD: string;             // 👈 REQUIRED: YYYY-MM-DD from Calendar
};

type Props = {
  visible: boolean;
  dateYMD: string;             // 👈 we receive it from Calendar for context + submit
  members?: Member[];
  households?: Household[];
  onClose: () => void;
  onSubmit: (payload: TaskSubmitPayload) => Promise<void> | void;
};

/* ----------------- helpers ----------------- */
function to12h(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
function toHHmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function addMinutes(date: Date, mins: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

/** Run a function exactly when visible flips false->true (modal opens) */
function useOpenOnce(visible: boolean, fn: () => void) {
  const prev = useRef(false);
  useEffect(() => {
    if (visible && !prev.current) {
      prev.current = true;
      fn();
    }
    if (!visible && prev.current) {
      prev.current = false;
    }
  }, [visible, fn]);
}

/* ----------------- component ----------------- */
export default React.memo(function TaskModal({
  visible,
  dateYMD,
  members = [],
  households = [],
  onClose,
  onSubmit,
}: Props) {
  // stable references to avoid re-renders while typing
  const memberList = useMemo(() => members, [members]);
  const householdList = useMemo(() => households, [households]);

  // form state (lives inside the modal)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // time-of-day lives as a Date anchored to “today”
  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  const initOnOpen = useCallback(() => {
    setTitle('');
    setDescription('');
    const d = new Date();
    d.setSeconds(0, 0);
    setTime(d);
    setHouseholdId(householdList.length ? householdList[0].id : null);
    setAssigneeId(null);
    setShowPicker(false);
  }, [householdList]);

  useOpenOnce(visible, initOnOpen);

  const submit = useCallback(async () => {
    const payload: TaskSubmitPayload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      time12h: to12h(time),
      timeHHmm: toHHmm(time),
      householdId,
      assigneeId,
      dateYMD, // 👈 pass the selected calendar day through
    };
    await onSubmit(payload);
    onClose();
  }, [title, description, time, householdId, assigneeId, dateYMD, onSubmit, onClose]);

  // Android’s picker is a one-shot dialog; iOS can be inline/spinner
  const onChange: IOSNativeProps['onChange'] & AndroidNativeProps['onChange'] = (_, selectedDate) => {
    if (selectedDate) setTime(selectedDate);
    if (Platform.OS === 'android') setShowPicker(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.h1}>Add Task</Text>
              {!!dateYMD && <Text style={styles.subtle}>for {dateYMD}</Text>}

              {/* Time row */}
              <Text style={styles.label}>Time</Text>
              <View style={styles.timeRow}>
                <Pressable style={styles.timeButton} onPress={() => setShowPicker(true)}>
                  <Text style={styles.timeText}>{to12h(time)}</Text>
                </Pressable>

                {/* Quick presets */}
                <Pressable style={styles.pill} onPress={() => setTime(new Date())}>
                  <Text style={styles.pillTxt}>Now</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={() => setTime(addMinutes(new Date(), 30))}>
                  <Text style={styles.pillTxt}>+30m</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={() => {
                  const d = new Date(); d.setHours(7, 0, 0, 0); setTime(d);
                }}>
                  <Text style={styles.pillTxt}>7:00 AM</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={() => {
                  const d = new Date(); d.setHours(20, 0, 0, 0); setTime(d);
                }}>
                  <Text style={styles.pillTxt}>8:00 PM</Text>
                </Pressable>
              </View>

              {showPicker && (
                <View style={{ backgroundColor: '#14171B', borderRadius: 12 }}>
                  <DateTimePicker
                    mode="time"
                    value={time}
                    onChange={onChange}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minuteInterval={5}
                    is24Hour={false}
                    themeVariant="dark"
                  />
                  {Platform.OS === 'ios' && (
                    <View style={{ padding: 8, alignItems: 'flex-end' }}>
                      <Pressable style={[styles.pill, { backgroundColor: '#D6F031', borderColor: '#D6F031' }]} onPress={() => setShowPicker(false)}>
                        <Text style={[styles.pillTxt, { color: '#000' }]}>Done</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Title */}
              <Text style={styles.label}>Task title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="#9AA0A6"
                style={styles.input}
              />

              {/* Description */}
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Details…"
                placeholderTextColor="#9AA0A6"
                multiline
                style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
              />

              {/* Household */}
              <Text style={styles.label}>Assign to household</Text>
              <View style={styles.chips}>
                {householdList.length === 0 ? (
                  <Text style={styles.subtle}>No households</Text>
                ) : householdList.map(h => {
                  const active = householdId === h.id;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => setHouseholdId(h.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{h.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Assignee */}
              <Text style={styles.label}>Assign to member (optional)</Text>
              <View style={styles.chips}>
                <Pressable
                  key="none"
                  onPress={() => setAssigneeId(null)}
                  style={[styles.chip, assigneeId === null && styles.chipActive]}
                >
                  <Text style={[styles.chipTxt, assigneeId === null && styles.chipTxtActive]}>Unassigned</Text>
                </Pressable>
                {memberList.map(m => {
                  const active = assigneeId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setAssigneeId(m.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{m.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                  <Text style={[styles.btnTxt, { color: COLORS.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, !title.trim() && { opacity: 0.6 }]}
                  disabled={!title.trim()}
                  onPress={submit}
                >
                  <Text style={[styles.btnTxt, { color: '#000' }]}>Save Task</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
});

/* ----------------- styles ----------------- */
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  sheet: { backgroundColor: '#2A2F35', borderRadius: 20, overflow: 'hidden' },
  content: { padding: 16, gap: 10 },

  h1: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 22 },
  subtle: { color: '#9AA0A6', fontFamily: 'Montserrat_400Regular' },

  label: { color: '#E6EAF0', fontFamily: 'Montserrat_700Bold', marginTop: 6 },

  timeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  timeButton: {
    backgroundColor: '#14171B',
    borderWidth: 1,
    borderColor: '#2E3338',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 16 },

  input: {
    backgroundColor: '#14171B',
    borderWidth: 1,
    borderColor: '#2E3338',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    fontFamily: 'Montserrat_500Medium',
  },

  pill: {
    backgroundColor: '#1F242A',
    borderWidth: 1,
    borderColor: '#384049',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pillTxt: { color: '#E6EAF0', fontFamily: 'Montserrat_700Bold' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3B434D',
    backgroundColor: '#1A1E23',
  },
  chipActive: { backgroundColor: '#D6F031', borderColor: '#D6F031' },
  chipTxt: { color: '#E6EAF0', fontFamily: 'Montserrat_700Bold' },
  chipTxtActive: { color: '#000' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  btnGhost: { backgroundColor: '#FFFFFF10', borderWidth: 1, borderColor: '#FFFFFF20' },
  btnPrimary: { backgroundColor: '#D6F031' },
  btnTxt: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },
});
