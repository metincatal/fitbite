import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/constants';
import { generateShoppingList } from '../lib/gemini';
import { calculateMacroGoals, UserMetrics } from '../lib/nutrition';
import { DIET_TYPES } from '../lib/constants';

const STORAGE_KEY = 'fitbite_shopping_list';

interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
}

export default function ShoppingListScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }

  async function saveItems(updated: ShoppingItem[]) {
    setItems(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    const updated = [...items, { id: Date.now().toString(), text, checked: false }];
    saveItems(updated);
    setNewItem('');
  }

  function toggleItem(id: string) {
    const updated = items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it));
    saveItems(updated);
  }

  function deleteItem(id: string) {
    const updated = items.filter((it) => it.id !== id);
    saveItems(updated);
  }

  function clearChecked() {
    const unchecked = items.filter((it) => !it.checked);
    if (unchecked.length === items.length) {
      Alert.alert('Bilgi', 'İşaretlenmiş ürün yok');
      return;
    }
    Alert.alert('Onay', 'İşaretlenmiş ürünler silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => saveItems(unchecked) },
    ]);
  }

  async function handleAIGenerate() {
    if (!profile) {
      Alert.alert('Hata', 'Profil bilgisi yüklenmedi');
      return;
    }
    Alert.alert(
      'AI Alışveriş Listesi',
      'FitBot profilinize göre haftalık alışveriş listesi oluşturacak. Mevcut listeye eklenecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            setGenerating(true);
            try {
              const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
              const metrics: UserMetrics = {
                gender: profile.gender,
                age,
                height_cm: profile.height_cm,
                weight_kg: profile.weight_kg,
                activity_level: profile.activity_level,
                goal: profile.goal,
              };
              const goals = calculateMacroGoals(metrics);
              const dietLabel = profile.diet_type ? DIET_TYPES[profile.diet_type as keyof typeof DIET_TYPES] : 'Normal';
              const suggestions = await generateShoppingList({ profile, goals, dietType: dietLabel });
              const newItems: ShoppingItem[] = suggestions.map((text) => ({
                id: `ai_${Date.now()}_${Math.random()}`,
                text,
                checked: false,
              }));
              const updated = [...items, ...newItems];
              saveItems(updated);
            } catch {
              Alert.alert('Hata', 'Alışveriş listesi oluşturulamadı. İnternet bağlantınızı kontrol edin.');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  }

  const uncheckedItems = items.filter((it) => !it.checked);
  const checkedItems = items.filter((it) => it.checked);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Alışveriş Listesi</Text>
          <TouchableOpacity onPress={clearChecked} style={styles.clearBtn}>
            <Ionicons name="checkmark-done" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* AI Oluştur Butonu */}
        <TouchableOpacity style={styles.aiButton} onPress={handleAIGenerate} disabled={generating}>
          {generating ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : (
            <Ionicons name="sparkles" size={18} color={Colors.textLight} />
          )}
          <Text style={styles.aiButtonText}>
            {generating ? 'Oluşturuluyor...' : 'AI ile Haftalık Liste Oluştur'}
          </Text>
        </TouchableOpacity>

        {/* Liste */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>Listeniz boş</Text>
              <Text style={styles.emptyDesc}>
                Altta ürün ekleyin veya AI ile haftalık liste oluşturun
              </Text>
            </View>
          )}

          {/* İşaretlenmemiş */}
          {uncheckedItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkbox}>
                <View style={styles.checkboxEmpty} />
              </TouchableOpacity>
              <Text style={styles.itemText}>{item.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* İşaretlenenler */}
          {checkedItems.length > 0 && (
            <>
              <Text style={styles.checkedLabel}>Alınanlar ({checkedItems.length})</Text>
              {checkedItems.map((item) => (
                <View key={item.id} style={[styles.itemRow, styles.itemChecked]}>
                  <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkbox}>
                    <View style={styles.checkboxChecked}>
                      <Ionicons name="checkmark" size={14} color={Colors.textLight} />
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.itemText, styles.itemTextChecked]}>{item.text}</Text>
                  <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>

        {/* Yeni Ürün Ekle */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Ürün ekle..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={addItem}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Ionicons name="add" size={22} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  clearBtn: { padding: 4 },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.accent, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
  },
  aiButtonText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
  listContent: { paddingHorizontal: Spacing.lg },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyDesc: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  itemChecked: { opacity: 0.6 },
  checkbox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  checkboxEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  checkboxChecked: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  itemText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  itemTextChecked: { textDecorationLine: 'line-through', color: Colors.textMuted },
  deleteBtn: { padding: 4 },
  checkedLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted, marginTop: Spacing.md, marginBottom: Spacing.xs },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  addInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary,
  },
  addBtn: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
});
