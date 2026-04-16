import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  EXERCISE_CATEGORIES,
  INTENSITY_LABELS,
  ExerciseIntensity,
  calculateExerciseCalories,
} from '../lib/constants';
import { useAuthStore } from '../store/authStore';
import { useExerciseStore } from '../store/exerciseStore';
import { supabase } from '../lib/supabase';
import { ExerciseLog } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DURATION_PRESETS = [15, 30, 45, 60, 90];

type TabType = 'add' | 'history';

export default function ExerciseScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { addExerciseLog, todayExercises, fetchTodayExercises } = useExerciseStore();

  const [activeTab, setActiveTab] = useState<TabType>('add');

  // Add form state
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // History state
  const [historyLogs, setHistoryLogs] = useState<ExerciseLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const weightKg = profile?.weight_kg ?? 70;

  const selectedCategory = EXERCISE_CATEGORIES.find((c) => c.key === selectedExercise);
  const estimatedCalories = selectedCategory
    ? calculateExerciseCalories(selectedCategory.met[intensity], weightKg, duration)
    : 0;

  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      fetchTodayExercises(user.id, today);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchHistory();
    }
  }, [activeTab, user]);

  async function fetchHistory() {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(50);
    setHistoryLogs((data as ExerciseLog[]) ?? []);
    setHistoryLoading(false);
  }

  async function handleSave() {
    if (!selectedExercise || !user) {
      Alert.alert('Hata', 'Lütfen bir egzersiz türü seçin');
      return;
    }
    if (duration <= 0) {
      Alert.alert('Hata', 'Geçerli bir süre girin');
      return;
    }

    setSaving(true);
    const category = EXERCISE_CATEGORIES.find((c) => c.key === selectedExercise)!;
    try {
      await addExerciseLog({
        user_id: user.id,
        exercise_type: selectedExercise,
        exercise_name: category.label,
        duration_minutes: duration,
        intensity,
        calories_burned: estimatedCalories,
        notes: notes.trim() || null,
        logged_at: new Date().toISOString(),
      });

      Alert.alert(
        'Kaydedildi! 🎉',
        `${category.emoji} ${category.label} — ${duration} dk — ${estimatedCalories} kcal yakıldı`,
        [{ text: 'Tamam', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Hata', 'Egzersiz kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  function handleDurationPreset(d: number) {
    setDuration(d);
    setCustomDuration('');
  }

  function handleCustomDuration(text: string) {
    setCustomDuration(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val > 0) {
      setDuration(val);
    }
  }

  function deleteLog(id: string) {
    Alert.alert('Sil', 'Bu egzersiz kaydını silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { removeExerciseLog } = useExerciseStore.getState();
          await removeExerciseLog(id);
          setHistoryLogs((prev) => prev.filter((l) => l.id !== id));
        },
      },
    ]);
  }

  function renderAddTab() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Exercise Type Grid */}
        <Text style={styles.sectionLabel}>Egzersiz Türü</Text>
        <View style={styles.exerciseGrid}>
          {EXERCISE_CATEGORIES.map((cat) => {
            const isSelected = selectedExercise === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.exerciseCard,
                  isSelected && { backgroundColor: cat.color + '18', borderColor: cat.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedExercise(cat.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.exerciseIconWrap, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as IoniconName} size={24} color={cat.color} />
                </View>
                <Text style={[styles.exerciseLabel, isSelected && { color: cat.color, fontWeight: '800' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration */}
        {selectedExercise && (
          <>
            <Text style={styles.sectionLabel}>⏱️ Süre</Text>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationBtn, duration === d && !customDuration && styles.durationBtnActive]}
                  onPress={() => handleDurationPreset(d)}
                >
                  <Text style={[styles.durationBtnText, duration === d && !customDuration && styles.durationBtnTextActive]}>
                    {d}
                  </Text>
                  <Text style={[styles.durationBtnUnit, duration === d && !customDuration && styles.durationBtnTextActive]}>
                    dk
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customDurationRow}>
              <Text style={styles.customDurationLabel}>Özel:</Text>
              <TextInput
                style={styles.customDurationInput}
                value={customDuration}
                onChangeText={handleCustomDuration}
                placeholder="—"
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.customDurationUnit}>dakika</Text>
            </View>

            {/* Intensity */}
            <Text style={styles.sectionLabel}>🔥 Yoğunluk</Text>
            <View style={styles.intensityRow}>
              {(Object.keys(INTENSITY_LABELS) as ExerciseIntensity[]).map((key) => {
                const info = INTENSITY_LABELS[key];
                const isActive = intensity === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.intensityBtn,
                      isActive && { backgroundColor: info.color + '18', borderColor: info.color, borderWidth: 2 },
                    ]}
                    onPress={() => setIntensity(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.intensityEmoji}>{info.emoji}</Text>
                    <Text style={[styles.intensityLabel, isActive && { color: info.color, fontWeight: '800' }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calorie Estimate */}
            <View style={styles.calorieEstimate}>
              <View style={styles.calorieEstimateInner}>
                <Text style={styles.calorieEstimateIcon}>🔥</Text>
                <View>
                  <Text style={styles.calorieEstimateValue}>{estimatedCalories} kcal</Text>
                  <Text style={styles.calorieEstimateLabel}>Tahmini yakılan kalori</Text>
                </View>
              </View>
              <Text style={styles.calorieEstimateFormula}>
                MET({selectedCategory?.met[intensity].toFixed(1)}) × {weightKg}kg × {(duration / 60).toFixed(1)}sa
              </Text>
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>📝 Not (opsiyonel)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Egzersiz hakkında not ekleyin..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>
                {saving ? 'Kaydediliyor...' : 'Egzersizi Kaydet'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    );
  }

  function renderHistoryTab() {
    // Group history by date
    const grouped: Record<string, ExerciseLog[]> = {};
    historyLogs.forEach((log) => {
      const dateKey = log.logged_at.split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    });
    const dateKeys = Object.keys(grouped);

    if (historyLoading) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Yükleniyor...</Text>
        </View>
      );
    }

    if (dateKeys.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Henüz egzersiz kaydı yok</Text>
          <Text style={styles.emptySubtext}>İlk egzersizini eklemek için "Ekle" sekmesini kullan</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {dateKeys.map((dateKey) => {
          const logs = grouped[dateKey];
          const totalCal = logs.reduce((s, l) => s + l.calories_burned, 0);
          const totalMin = logs.reduce((s, l) => s + l.duration_minutes, 0);
          const dateLabel = new Date(dateKey).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          });

          return (
            <View key={dateKey} style={styles.historyGroup}>
              <View style={styles.historyDateRow}>
                <Text style={styles.historyDate}>{dateLabel}</Text>
                <Text style={styles.historyDateSummary}>
                  {totalMin} dk · {totalCal} kcal
                </Text>
              </View>
              {logs.map((log) => {
                const cat = EXERCISE_CATEGORIES.find((c) => c.key === log.exercise_type);
                const intensityInfo = INTENSITY_LABELS[log.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
                return (
                  <View key={log.id} style={styles.historyItem}>
                    <View style={[styles.historyIconWrap, { backgroundColor: (cat?.color ?? '#6B7280') + '20' }]}>
                      <Ionicons
                        name={(cat?.icon ?? 'barbell-outline') as IoniconName}
                        size={22}
                        color={cat?.color ?? '#6B7280'}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{log.exercise_name}</Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyMetaText}>{log.duration_minutes} dk</Text>
                        <View style={[styles.historyIntensityPill, { backgroundColor: intensityInfo.color + '18' }]}>
                          <Text style={[styles.historyIntensityText, { color: intensityInfo.color }]}>
                            {intensityInfo.emoji} {intensityInfo.label}
                          </Text>
                        </View>
                      </View>
                      {log.notes ? <Text style={styles.historyNotes} numberOfLines={1}>{log.notes}</Text> : null}
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyCal}>{log.calories_burned}</Text>
                      <Text style={styles.historyCalUnit}>kcal</Text>
                    </View>
                    <TouchableOpacity style={styles.historyDeleteBtn} onPress={() => deleteLog(log.id)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Egzersiz</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Ionicons
            name={activeTab === 'add' ? 'add-circle' : 'add-circle-outline'}
            size={18}
            color={activeTab === 'add' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={18}
            color={activeTab === 'history' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Geçmiş</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'add' ? renderAddTab() : renderHistoryTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exerciseCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  exerciseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  exerciseLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  durationBtnActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  durationBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  durationBtnTextActive: {
    color: Colors.primary,
  },
  durationBtnUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  customDurationLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  customDurationInput: {
    width: 80,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  customDurationUnit: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  intensityBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  intensityEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  intensityLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calorieEstimate: {
    marginTop: Spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  calorieEstimateInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  calorieEstimateIcon: {
    fontSize: 36,
  },
  calorieEstimateValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: '#DC2626',
  },
  calorieEstimateLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  calorieEstimateFormula: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  // History styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  historyGroup: {
    marginBottom: Spacing.lg,
  },
  historyDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  historyDate: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  historyDateSummary: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  historyMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  historyIntensityPill: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  historyIntensityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  historyNotes: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  historyRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  historyCal: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.accent,
  },
  historyCalUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  historyDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
