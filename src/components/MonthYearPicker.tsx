import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const SHEET_W = Math.min(SCREEN_W - 40, 600);

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  month: number;            // 0..11
  year: number;
  onSelect: (m: number, y: number) => void;
};

export default function MonthYearPicker({
  visible,
  onClose,
  month,
  year,
  onSelect,
}: Props) {
  // Auto-generate years: current system year up to +5
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <Text style={styles.title}>Select month & year</Text>

        <View style={styles.columns}>
          {/* Months (left) */}
          <ScrollView
            style={styles.col}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {MONTHS.map((m, i) => {
              const active = i === month;
              return (
                <Pressable
                  key={m}
                  onPress={() => onSelect(i, year)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Years (right) */}
          <ScrollView
            style={[
              styles.col,
              {
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderLeftColor: 'rgba(255,255,255,0.08)',
              },
            ]}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {years.map((y) => {
              const active = y === year;
              return (
                <Pressable
                  key={y}
                  onPress={() => onSelect(month, y)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{y}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    inset: 0 as any,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: (SCREEN_W - SHEET_W) / 2,
    right: (SCREEN_W - SHEET_W) / 2,
    top: 140,
    backgroundColor: '#2B3036',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  columns: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  row: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rowActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '500',
  },
  rowTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
