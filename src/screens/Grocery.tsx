import React, { useEffect, useState } from 'react';
import {
  Text, View, StyleSheet, Pressable, FlatList,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import Screen from '../components/Screens';
import { COLORS } from '../theme';
import { supabase } from '../supabase';

type GroceryItem = {
  id: string;
  list_id: string;
  household_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  done: boolean;
  created_at: string;
};

type GroceryRouteParams = {
  Grocery: { listId?: string; householdId?: string };
};

type Props = { listId?: string; householdId?: string };

export default function Grocery(props: Props) {
  // ---- Resolve params/props ----
  const route = useRoute<RouteProp<GroceryRouteParams, 'Grocery'>>();
  const initialListId = props.listId ?? route.params?.listId ?? null;
  const householdId = props.householdId ?? route.params?.householdId ?? null;

  // ---- State ----
  const [currentListId, setCurrentListId] = useState<string | null>(initialListId);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootMsg, setBootMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<GroceryItem | null>(null);

  const [fName, setFName] = useState('');
  const [fQty, setFQty] = useState('');
  const [fUnit, setFUnit] = useState('');

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

  // ---- Boot: ensure a list, then load items ----
  useEffect(() => {
    (async () => {
      if (!householdId) { setBootMsg('No household selected.'); return; }

      // If no list id, reuse or create a default
      let listId = currentListId;
      if (!listId) {
        setBootMsg('Preparing your grocery list…');
        listId = await ensureDefaultList(householdId);
        if (!listId) { setBootMsg('Unable to prepare a grocery list.'); return; }
        setCurrentListId(listId);
      }

      setBootMsg(null);
      await loadItems(listId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  // Re-load if list id changes externally
  useEffect(() => {
    if (currentListId) loadItems(currentListId);
  }, [currentListId]);

  // ---------- Helpers ----------
  async function ensureDefaultList(hId: string): Promise<string | null> {
    // 1) try existing
    const { data: existing, error: e1 } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('household_id', hId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (e1) { console.error(e1); return null; }
    if (existing && existing.length) return existing[0].id;

    // 2) create
    const { data: created, error: e2 } = await supabase
      .from('grocery_lists')
      .insert({ household_id: hId, title: 'Grocery' })
      .select('id')
      .single();

    if (e2) { console.error(e2); return null; }
    return created?.id ?? null;
  }

  async function loadItems(listId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    setLoading(false);
    if (error) { Alert.alert('Error loading items', error.message); return; }
    setItems(data || []);
  }

  async function logAction(action: string, entityId: string, meta: Record<string, any> = {}) {
    if (!userId || !householdId) return;
    await supabase.from('activity_log').insert({
      household_id: householdId,
      actor: userId,
      action,
      entity: 'grocery_items',
      entity_id: entityId,
      meta,
      at: new Date().toISOString(),
    });
  }

  // ---------- CRUD ----------
  async function addItem() {
    if (!currentListId || !householdId) return;
    if (!fName.trim()) { Alert.alert('Missing name', 'Please enter an item name.'); return; }

    setSaving(true);
    const qtyNum = fQty.trim() ? Number(fQty) : null;

    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        list_id: currentListId,
        household_id: householdId,
        name: fName.trim(),
        qty: isNaN(qtyNum as number) ? null : qtyNum,
        unit: fUnit.trim() || null,
        done: false,
      })
      .select()
      .single();

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setItems(prev => [...prev, data as GroceryItem]);
    await logAction('create', data.id, { name: data.name, qty: data.qty, unit: data.unit });
    closeForm();
  }

  async function updateItem() {
    if (!editing) return;
    if (!fName.trim()) { Alert.alert('Missing name', 'Please enter an item name.'); return; }

    setSaving(true);
    const qtyNum = fQty.trim() ? Number(fQty) : null;
    const updated = {
      name: fName.trim(),
      qty: isNaN(qtyNum as number) ? null : qtyNum,
      unit: fUnit.trim() || null,
    };

    const { error } = await supabase
      .from('grocery_items')
      .update(updated)
      .eq('id', editing.id);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setItems(prev => prev.map(i => (i.id === editing.id ? { ...i, ...updated } : i)));
    await logAction('update', editing.id, updated);
    closeForm();
  }

  async function deleteItem(item: GroceryItem) {
    const prev = items;
    setItems(prev.filter(i => i.id !== item.id));

    const { error } = await supabase.from('grocery_items').delete().eq('id', item.id);
    if (error) {
      setItems(prev);
      Alert.alert('Error', error.message);
    } else {
      await logAction('delete', item.id, { name: item.name });
    }
  }

  async function toggleDone(item: GroceryItem) {
    const updated = !item.done;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, done: updated } : i)));

    const { error } = await supabase
      .from('grocery_items')
      .update({ done: updated })
      .eq('id', item.id);

    if (error) {
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, done: item.done } : i)));
      Alert.alert('Error', error.message);
    } else {
      await logAction('toggle_done', item.id, { name: item.name, done: updated });
    }
  }

  // ---------- Form helpers ----------
  const openCreate = () => {
    setEditing(null);
    setFName(''); setFQty(''); setFUnit('');
    setShowForm(true);
  };
  const openEdit = (it: GroceryItem) => {
    setEditing(it);
    setFName(it.name);
    setFQty(it.qty ? String(it.qty) : '');
    setFUnit(it.unit ?? '');
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFName(''); setFQty(''); setFUnit('');
  };

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <View style={[styles.card, item.done && styles.cardDone]}>
      <Pressable onPress={() => toggleDone(item)} style={styles.iconBtn}>
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.done ? (COLORS.success || '#D6F031') : '#666'}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={1}>
          {item.name}
        </Text>
        {(item.qty || item.unit) && (
          <Text style={styles.qty}>{[item.qty, item.unit].filter(Boolean).join(' ')}</Text>
        )}
      </View>

      <View style={styles.rowActions}>
        <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={COLORS.text} />
        </Pressable>
        <Pressable onPress={() => deleteItem(item)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </Pressable>
      </View>
    </View>
  );

  // ---------- UI ----------
  return (
    <Screen topGutter={24}>
      <Text style={styles.h1}>Grocery</Text>
      <Text style={styles.sub}>
        {items.filter(i => !i.done).length} to buy · {items.filter(i => i.done).length} done
      </Text>

      <View style={{ height: 12 }} />

      {bootMsg ? (
        <Text style={styles.emptyText}>{bootMsg}</Text>
      ) : loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>No items yet. Tap “Add Item”.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={it => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 96 }}
        />
      )}

      <Pressable style={styles.addBtn} onPress={openCreate} disabled={!currentListId || !householdId}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.addText}>Add Item</Text>
      </Pressable>

      {/* Modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>

            <View style={{ height: 10 }} />
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              placeholder="e.g., Rice"
              placeholderTextColor="#7A828A"
              value={fName}
              onChangeText={setFName}
              style={styles.input}
            />

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Qty</Text>
                <TextInput
                  placeholder="e.g., 2"
                  placeholderTextColor="#7A828A"
                  value={fQty}
                  onChangeText={setFQty}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  placeholder="e.g., kg / pcs"
                  placeholderTextColor="#7A828A"
                  value={fUnit}
                  onChangeText={setFUnit}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={{ height: 14 }} />
            <View style={styles.modalRow}>
              <Pressable style={[styles.modalBtn, styles.modalCancel]} onPress={closeForm}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <View style={{ width: 10 }} />
              <Pressable
                style={[styles.modalBtn, styles.modalSave]}
                onPress={editing ? updateItem : addItem}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.modalSaveText}>{editing ? 'Save' : 'Add'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ---- Styles ----
const CARD = '#1A1E23';
const BORDER = '#2E3338';

const styles = StyleSheet.create({
  h1: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 34 },
  sub: { color: COLORS.textMuted, fontFamily: 'Montserrat_500Medium', fontSize: 13, marginTop: 6 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 12,
  },
  cardDone: { opacity: 0.6 },
  name: { color: COLORS.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 16 },
  nameDone: { color: '#888', textDecorationLine: 'line-through' },
  qty: { color: COLORS.textMuted, fontFamily: 'Montserrat_500Medium', fontSize: 12 },
  iconBtn: { padding: 6 },
  rowActions: { flexDirection: 'row', marginLeft: 6 },

  addBtn: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    height: 56, borderRadius: 20,
    backgroundColor: '#0268EE',
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  addText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontSize: 16 },

  loadingBox: {
    height: 80, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: COLORS.textMuted, marginTop: 8 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16,
  },
  modalCard: {
    backgroundColor: '#11161B',
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 16,
  },
  modalTitle: { color: COLORS.text, fontFamily: 'Montserrat_700Bold', fontSize: 18 },
  fieldLabel: {
    color: COLORS.textMuted, fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12, marginBottom: 6, marginTop: 8,
  },
  input: {
    height: 44, borderRadius: 14,
    backgroundColor: '#161B21',
    borderWidth: 1, borderColor: '#2B3138',
    color: COLORS.text,
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_500Medium', fontSize: 14,
  },
  twoCols: { flexDirection: 'row', marginTop: 4 },
  modalRow: { flexDirection: 'row', marginTop: 6 },
  modalBtn: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  modalCancel: { backgroundColor: 'transparent', borderColor: '#384049' },
  modalCancelText: { color: COLORS.text, fontFamily: 'Montserrat_600SemiBold' },
  modalSave: { backgroundColor: '#0268EE', borderColor: '#0268EE' },
  modalSaveText: { color: '#fff', fontFamily: 'Montserrat_700Bold' },
});
