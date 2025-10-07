// src/screens/Tasks.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BLUE = '#0268EE';
const LIME = '#D6F031';
const BORDER = '#2E3338';
const CARD_DARK = '#1F242A';
const CARD_DONE = '#22272D';

type Task = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  createdIndex: number;
  completedAt?: number;
};

const INITIAL: Task[] = [
  { id: '1', title: 'Mindmapping',       time: '12:00–17:00', done: false, createdIndex: 0 },
  { id: '2', title: 'BPMN creating',     time: '10:30–15:00', done: false, createdIndex: 1 },
  { id: '3', title: 'Discuss with team', time: '9:00–10:30',  done: false, createdIndex: 2 },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);

  // initial list intro
  const listIntro = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(listIntro, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [listIntro]);

  const sorted = useMemo(() => {
    const undone = tasks.filter(t => !t.done).sort((a, b) => a.createdIndex - b.createdIndex);
    const done = tasks.filter(t => t.done).sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
    return [...undone, ...done];
  }, [tasks]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined }
          : t
      )
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.range}>22.09 — 25.09</Text>

        {sorted.map((task, idx) => (
          <Row key={task.id} task={task} index={idx} onToggle={() => toggle(task.id)} />
        ))}

        <Pressable style={styles.wideBtn}>
          <Text style={styles.wideBtnText}>Complete task</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Row ---------- */
function Row({
  task,
  index,
  onToggle,
}: {
  task: Task;
  index: number;
  onToggle: () => void;
}) {
  // row intro animation (stagger)
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

  // press highlight
  const pressed = useRef(new Animated.Value(0)).current;
  const highlightOpacity = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] });

  const translateY = intro.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const opacity = intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // palette based on done
  const bg = task.done ? CARD_DONE : LIME;                 // lime when NOT done
  const borderColor = task.done ? '#2B3138' : 'transparent';
  const titleColor = task.done ? COLORS.textMuted : '#000';
  const timeColor = task.done ? '#8C96A2' : 'rgba(0,0,0,0.7)';

  return (
    <Animated.View
      style={[
        styles.cardBase,
        {
          backgroundColor: bg,
          borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* subtle active highlight */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: highlightOpacity, backgroundColor: LIME, borderRadius: styles.cardBase.borderRadius },
        ]}
      />

      {/* checkbox LEFT - empty square when pending, check when done */}
      <Pressable
        onPress={onToggle}
        style={styles.checkboxLeft}
        hitSlop={10}
        onPressIn={() => Animated.timing(pressed, { toValue: 1, duration: 100, useNativeDriver: false }).start()}
        onPressOut={() => Animated.timing(pressed, { toValue: 0, duration: 160, useNativeDriver: false }).start()}
      >
        <Ionicons
          name={(task.done ? 'checkbox' : 'square-outline') as any}
          size={26}
          color={task.done ? BLUE : '#000'} // black on lime
        />
      </Pressable>

      {/* content */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.time, { color: timeColor }]} numberOfLines={1}>
          {task.time}
        </Text>
      </View>
    </Animated.View>
  );
}

/* ---------- styles ---------- */
const RADIUS = 28;

const styles = StyleSheet.create({
  range: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    marginBottom: 6,
  },

  cardBase: {
    borderRadius: RADIUS,
    paddingRight: 20,
    paddingVertical: 18,
    paddingLeft: 62, // room for left checkbox
    borderWidth: 1,
    minHeight: 86,
    justifyContent: 'center',
  },

  checkboxLeft: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    marginBottom: 4,
  },
  time: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
  },

  wideBtn: {
    marginTop: 8,
    backgroundColor: CARD_DARK,
    borderRadius: RADIUS,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  wideBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
  },
});
