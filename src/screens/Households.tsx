import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme';

type Household = { id: string; name: string };

export default function Households() {
  const [items, setItems] = useState<Household[]>([
    { id: 'h1', name: 'My Home' },
    { id: 'h2', name: 'Mum Flat' },
    { id: 'h3', name: 'Condo 12F' },
  ]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => [{ id: `${Date.now()}`, name: trimmed }, ...prev]);
    setName('');
    setAdding(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.h1}>Households</Text>

        <View style={{ gap: 14 }}>
          {items.map((h) => (
            <View key={h.id} style={[styles.card, styles.cardDark]}>
              <Text style={styles.cardTitle}>{h.name}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.addBtn]} onPress={() => setAdding(true)}>
          <Text style={styles.addBtnText}>Add Household</Text>
        </Pressable>
      </ScrollView>

      {/* Add household modal */}
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAdding(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          >
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>New household</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Household name"
                placeholderTextColor="#9AA0A6"
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={add}
              />
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setAdding(false)}>
                  <Text style={[styles.btnText, { color: COLORS.text }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={add}>
                  <Text style={[styles.btnText, { color: '#000' }]}>Add</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,          // uniform top spacing
    paddingBottom: 140,      // above fixed bottom bar
    paddingHorizontal: 20,
    gap: 20,
  },
  h1: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 44,
    lineHeight: 48,
  },

  // List card
  card: {
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardDark: {
    backgroundColor: '#1A1E23',
    borderWidth: 1,
    borderColor: '#2E3338',
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
  },

  // Add button (lime, full card width)
  addBtn: {
    marginTop: 20,
    backgroundColor: '#D6F031',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#000',
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#2A2F35',
    borderRadius: 20,
    padding: 18,
  },
  sheetTitle: {
    color: COLORS.text,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1A1E23',
    borderWidth: 1,
    borderColor: '#41474E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnGhost: {
    backgroundColor: '#FFFFFF10',
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  btnPrimary: {
    backgroundColor: '#D6F031',
  },
  btnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
});
