import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BLUE = '#0268EE';
const LIME = '#D6F031';
const BORDER = '#2E3338';
const CARD_DARK = '#1F242A';
const CARD_DONE = '#22272D';

type DbTask = {
  id: string;
  title: string;
  due_at: string | null;
  completed?: boolean | null;
};
type UiTask = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  createdIndex: number;
  completedAt?: number;
};

function toTime12(dueISO: string | null): string {
  if (!dueISO) return '';
  const d = new Date(dueISO);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = `${m}`.padStart(2, '0');
  return `${h}:${mm} ${ap}`;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<UiTask[]>([]);
  const [loading, setLoading] = useState(false);

  const listIntro = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(listIntro, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [listIntro]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 14);
      const end = new Date();
      end.setDate(end.getDate() + 60);

      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,due_at,completed')
        .gte('due_at', start.toISOString())
        .lte('due_at', end.toISOString())
        .order('due_at', { ascending: true });

      if (error) throw error;

      const mapped: UiTask[] = (data ?? []).map((t: DbTask, idx: number) => ({
        id: t.id,
        title: t.title,
        time: toTime12(t.due_at),
        done: !!t.completed,
        createdIndex: idx,
        completedAt: t.completed ? Date.now() : undefined,
      }));

      setTasks(mapped);
    } catch (e: any) {
      console.log('Load tasks error', e);
      Alert.alert('Error', e?.message ?? 'Could not load tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sorted = useMemo(() => {
    const undone = tasks.filter(t => !t.done).sort((a, b) => a.createdIndex - b.createdIndex);
    const done = tasks.filter(t => t.done).sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
    return [...undone, ...done];
  }, [tasks]);

  const toggle = async (id: string) => {
    try {
      const current = tasks.find(t => t.id === id);
      if (!current) return;
      const nextDone = !current.done;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, done: nextDone, completedAt: nextDone ? Date.now() : undefined } : t))
      );

      const { error } = await supabase.from('tasks').update({ completed: nextDone }).eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Could not update task.');
      loadTasks();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.range}>{loading ? 'Loading…' : 'Upcoming'}</Text>

        {sorted.map((task, idx) => (
          <Row key={task.id} task={task} index={idx} onToggle={() => toggle(task.id)} />
        ))}

        <Pressable style={styles.wideBtn} onPress={loadTasks}>
          <Text style={styles.wideBtnText}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ task, index, onToggle }: { task: UiTask; index: number; onToggle: () => void }) {
  const intro = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(intro, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      delay: 60 * index,
      useNativeDriver: true,
    }).start();
  }, [index, intro]);

  const pressed = useRef(new Animated.Value(0)).current;
  const highlightOpacity = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] });

  const translateY = intro.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const opacity = intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const bg = task.done ? CARD_DONE : LIME;
  const borderColor = task.done ? '#2B3138' : 'transparent';
  const titleColor = task.done ? COLORS.textMuted : '#000';
  const timeColor = task.done ? '#8C96A2' : 'rgba(0,0,0,0.7)';

  return (
    <Animated.View
      style={[
        styles.cardBase,
        { backgroundColor: bg, borderColor, transform: [{ translateY }], opacity },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: highlightOpacity, backgroundColor: LIME, borderRadius: styles.cardBase.borderRadius },
        ]}
      />
      <Pressable
        onPress={onToggle}
        style={styles.checkboxLeft}
        hitSlop={10}
        onPressIn={() => Animated.timing(pressed, { toValue: 1, duration: 100, useNativeDriver: false }).start()}
        onPressOut={() => Animated.timing(pressed, { toValue: 0, duration: 160, useNativeDriver: false }).start()}
      >
        <Ionicons name={(task.done ? 'checkbox' : 'square-outline') as any} size={26} color={task.done ? BLUE : '#000'} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{task.title}</Text>
        {!!task.time && <Text style={[styles.time, { color: timeColor }]} numberOfLines={1}>{task.time}</Text>}
      </View>
    </Animated.View>
  );
}

const RADIUS = 28;
const styles = StyleSheet.create({
  range: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 32, marginBottom: 6 },
  cardBase: {
    borderRadius: RADIUS, paddingRight: 20, paddingVertical: 18, paddingLeft: 62,
    borderWidth: 1, minHeight: 86, justifyContent: 'center',
  },
  checkboxLeft: { position: 'absolute', left: 18, top: 0, bottom: 0, width: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 22, marginBottom: 4 },
  time: { fontFamily: 'Montserrat_500Medium', fontSize: 16 },
  wideBtn: { marginTop: 8, backgroundColor: CARD_DARK, borderRadius: RADIUS, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  wideBtnText: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold', fontSize: 20 },
});
