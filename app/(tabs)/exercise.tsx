import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Colors, Spacing, FontSize, BorderRadius,
  EXERCISE_CATALOG, EXERCISE_GROUP_LABELS, INTENSITY_LABELS,
  ExerciseGroup, ExerciseCatalogEntry, ExerciseIntensity,
} from '../../lib/constants';
import { compute } from '../../lib/exerciseEngine';
import { ExerciseBreakdownSheet } from '../../components/exercise/ExerciseBreakdownSheet';
import { useAuthStore } from '../../store/authStore';
import { useExerciseStore } from '../../store/exerciseStore';
import { ExerciseLog } from '../../types';
import { supabase } from '../../lib/supabase';

const { width: SW } = Dimensions.get('window');
const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];
const RECENT_KEY = 'fitbite_recent_exercises';
const MAX_RECENT = 2;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ExerciseTab() {
  const { user, profile } = useAuthStore();
  const {
    todayExercises, isLoading,
    fetchTodayExercises, addExerciseLog, removeExerciseLog,
    getTotalCaloriesBurned, getEpocRange, getWaterBonus,
  } = useExerciseStore();

  const [showAdd, setShowAdd] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [selectedGroup, setSelectedGroup] = useState<ExerciseGroup | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ExerciseCatalogEntry | null>(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // History
  const [historyLogs, setHistoryLogs] = useState<ExerciseLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const weightKg = profile?.weight_kg ?? 70;
  const heightCm = profile?.height_cm ?? 170;
  const sex = (profile?.gender ?? 'male') as 'male' | 'female';
  const age = profile?.birth_date
    ? new Date().getFullYear() - new Date(profile.birth_date).getFullYear()
    : 30;

  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      fetchTodayExercises(user.id, today);
    }
    loadRecent();
  }, [user]);

  async function loadRecent() {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {}
  }

  async function saveRecent(id: string) {
    const updated = [id, ...recentIds.filter((r) => r !== id)].slice(0, MAX_RECENT);
    setRecentIds(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }

  const engineOutput = useMemo(() => {
    if (!selectedEntry) return null;
    return compute({
      categoryId: selectedEntry.id,
      durationMinutes: duration,
      intensity,
      weightKg,
      heightCm,
      age,
      sex,
    });
  }, [selectedEntry, duration, intensity, weightKg, heightCm, age, sex]);

  const chronoWarning = engineOutput?.chronoWarning ?? false;

  function openAdd() {
    setSelectedGroup(null);
    setSelectedEntry(null);
    setDuration(30);
    setIntensity('moderate');
    setShowAdd(true);
  }

  function selectEntry(entry: ExerciseCatalogEntry) {
    setSelectedEntry(entry);
    setDuration(entry.defaultDuration);
    setIntensity(entry.defaultIntensity);
  }

  async function handleSave() {
    if (!selectedEntry || !user || !engineOutput) return;
    setSaving(true);
    try {
      await addExerciseLog({
        user_id: user.id,
        exercise_type: selectedEntry.id,
        exercise_name: selectedEntry.nameTr,
        duration_minutes: duration,
        intensity,
        calories_burned: engineOutput.kcalNet,
        logged_at: new Date().toISOString(),
        epoc_min_kcal: engineOutput.epocRange[0],
        epoc_max_kcal: engineOutput.epocRange[1],
        total_kcal_min: engineOutput.totalKcalRange[0],
        total_kcal_max: engineOutput.totalKcalRange[1],
        water_bonus_ml: engineOutput.waterBonusML,
        electrolytes_warning: engineOutput.electrolytesWarning,
        corrected_met: engineOutput.correctedMet,
        chrono_warning: engineOutput.chronoWarning,
      });
      await saveRecent(selectedEntry.id);
      setShowAdd(false);
    } catch {
      Alert.alert('Hata', 'Egzersiz kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

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

  function confirmDelete(id: string) {
    Alert.alert('Sil', 'Bu egzersiz kaydını silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await removeExerciseLog(id);
          setHistoryLogs((prev) => prev.filter((l) => l.id !== id));
        },
      },
    ]);
  }

  const totalBurned = getTotalCaloriesBurned();
  const totalDuration = todayExercises.reduce((s, e) => s + e.duration_minutes, 0);
  const epocRange = getEpocRange();
  const waterBonus = getWaterBonus();

  const groups = Object.keys(EXERCISE_GROUP_LABELS) as ExerciseGroup[];
  const filteredEntries = selectedGroup
    ? EXERCISE_CATALOG.filter((e) => e.group === selectedGroup)
    : [];
  const recentEntries = recentIds
    .map((id) => EXERCISE_CATALOG.find((e) => e.id === id))
    .filter(Boolean) as ExerciseCatalogEntry[];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Egzersiz</Text>
            <Text style={s.headerDate}>
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setShowHistory(true); fetchHistory(); }} style={s.historyBtn}>
            <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Hero Stats */}
        <View style={s.heroCard}>
          <StatItem icon="flame-outline" value={`${totalBurned}`} unit="kcal" label="Yakılan" color={Colors.accent} />
          <View style={s.heroDivider} />
          <StatItem icon="time-outline" value={`${totalDuration}`} unit="dk" label="Aktif" color={Colors.primary} />
          <View style={s.heroDivider} />
          <StatItem icon="water-outline" value={`+${waterBonus}`} unit="ml" label="Su bonusu" color="#38BDF8" />
        </View>

        {/* EPOC row */}
        {totalBurned > 0 && (
          <View style={s.epocRow}>
            <Ionicons name="trending-up-outline" size={14} color={Colors.primary} />
            <Text style={s.epocText}>
              EPOC sonrası ek yakım: +{epocRange[0]}–{epocRange[1]} kcal
              {'  '}
              <Text style={s.epocSource}>Borsheim & Bahr (2003)</Text>
            </Text>
          </View>
        )}

        {/* Add CTA */}
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={s.addBtnText}>Egzersiz Ekle</Text>
        </TouchableOpacity>

        {/* Today's logs */}
        {todayExercises.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Bugünün Egzersizleri</Text>
            {todayExercises.map((log) => (
              <ExerciseCard key={log.id} log={log} onDelete={() => confirmDelete(log.id)} />
            ))}
          </>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🏃</Text>
            <Text style={s.emptyText}>Henüz egzersiz yok</Text>
            <Text style={s.emptySubtext}>Yukarıdaki butona tıklayarak başla</Text>
          </View>
        )}

        {/* Weekly heatmap placeholder */}
        <Text style={s.sectionLabel}>Bu Hafta</Text>
        <WeeklyDots logs={todayExercises} />

        {/* Mascot slot */}
        <View style={s.mascotSlot}>
          <Text style={s.mascotEmoji}>{selectedEntry?.emoji ?? '🏃'}</Text>
          {/* Gelecek: <MascotAnimation exercise={selectedEntry} /> */}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Egzersiz Ekle</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            {/* Recent */}
            {recentEntries.length > 0 && (
              <>
                <Text style={s.formLabel}>SON EKLENENLER</Text>
                <View style={s.chipRow}>
                  {recentEntries.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[s.recentChip, selectedEntry?.id === e.id && s.recentChipActive]}
                      onPress={() => { selectEntry(e); setSelectedGroup(e.group); }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.recentChipText}>{e.emoji} {e.nameTr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Group grid */}
            <Text style={s.formLabel}>KATEGORİ</Text>
            <View style={s.groupGrid}>
              {groups.map((g) => {
                const info = EXERCISE_GROUP_LABELS[g];
                const active = selectedGroup === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[s.groupTile, active && s.groupTileActive]}
                    onPress={() => { setSelectedGroup(g); setSelectedEntry(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.groupTileEmoji}>{info.emoji}</Text>
                    <Text style={[s.groupTileLabel, active && s.groupTileLabelActive]}>
                      {info.nameTr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sub-category entries */}
            {selectedGroup && (
              <>
                <Text style={s.formLabel}>EGZERSİZ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.entryScroll}>
                  {filteredEntries.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[s.entryChip, selectedEntry?.id === e.id && { backgroundColor: e.color + '20', borderColor: e.color }]}
                      onPress={() => selectEntry(e)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.entryChipEmoji}>{e.emoji}</Text>
                      <Text style={[s.entryChipLabel, selectedEntry?.id === e.id && { color: e.color, fontWeight: '700' }]}>
                        {e.nameTr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Duration */}
            {selectedEntry && (
              <>
                <Text style={s.formLabel}>SÜRE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.durationScroll}>
                  {DURATION_PRESETS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[s.durationChip, duration === d && s.durationChipActive]}
                      onPress={() => setDuration(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.durationChipNum, duration === d && s.durationChipNumActive]}>{d}</Text>
                      <Text style={[s.durationChipUnit, duration === d && s.durationChipUnitActive]}>dk</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Intensity */}
                <Text style={s.formLabel}>YOĞUNLUK</Text>
                <View style={s.intensityPill}>
                  {(['low', 'moderate', 'high'] as ExerciseIntensity[]).map((key) => {
                    const info = INTENSITY_LABELS[key];
                    const active = intensity === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.intensityOption, active && { backgroundColor: info.color + '20', borderColor: info.color }]}
                        onPress={() => setIntensity(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.intensityEmoji}>{info.emoji}</Text>
                        <Text style={[s.intensityLabel, active && { color: info.color, fontWeight: '700' }]}>
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ height: engineOutput ? 200 : Spacing.xxl }} />
          </ScrollView>

          {/* Bottom sticky summary + save */}
          {engineOutput && selectedEntry && (
            <View style={s.stickyBottom}>
              {/* Chrono warning */}
              {chronoWarning && (
                <View style={s.chronoWarn}>
                  <Ionicons name="moon-outline" size={13} color={Colors.warning} />
                  <Text style={s.chronoWarnText}>
                    Geç saatte egzersiz — karbonhidrat alımı insülin duyarlılığını etkileyebilir (Vahlhaus 2024)
                  </Text>
                </View>
              )}
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryNum}>🔥 {engineOutput.kcalNet}</Text>
                  <Text style={s.summaryLabel}>kcal net</Text>
                </View>
                <View style={s.summaryItem}>
                  <Text style={s.summaryNum}>⚡ +{engineOutput.epocRange[0]}–{engineOutput.epocRange[1]}</Text>
                  <Text style={s.summaryLabel}>EPOC</Text>
                </View>
                <View style={s.summaryItem}>
                  <Text style={s.summaryNum}>💧 +{engineOutput.waterBonusML}</Text>
                  <Text style={s.summaryLabel}>ml su</Text>
                </View>
              </View>
              <Text style={s.sourceNote}>{engineOutput.sourceNote}</Text>
              <View style={s.saveBtnRow}>
                <TouchableOpacity
                  style={s.breakdownBtn}
                  onPress={() => setShowBreakdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.breakdownBtnText}>Nasıl hesaplandı?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>{saving ? 'Kaydediliyor…' : 'Günlüğe Ekle'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>

        {/* Breakdown Sheet */}
        {engineOutput && selectedEntry && (
          <ExerciseBreakdownSheet
            visible={showBreakdown}
            onClose={() => setShowBreakdown(false)}
            exerciseName={selectedEntry.nameTr}
            exerciseEmoji={selectedEntry.emoji}
            durationMinutes={duration}
            intensity={intensity}
            engine={engineOutput}
            weightKg={weightKg}
            sex={sex}
          />
        )}
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Egzersiz Geçmişi</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalScroll}>
            {historyLoading && <Text style={s.emptyText}>Yükleniyor…</Text>}
            {!historyLoading && historyLogs.length === 0 && (
              <Text style={s.emptyText}>Henüz egzersiz kaydı yok</Text>
            )}
            {historyLogs.map((log) => (
              <ExerciseCard key={log.id} log={log} onDelete={() => confirmDelete(log.id)} />
            ))}
            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function StatItem({
  icon, value, unit, label, color,
}: {
  icon: IoniconName; value: string; unit: string; label: string; color: string;
}) {
  return (
    <View style={statS.item}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[statS.value, { color }]}>
        {value}
        <Text style={statS.unit}> {unit}</Text>
      </Text>
      <Text style={statS.label}>{label}</Text>
    </View>
  );
}

function ExerciseCard({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const entry = EXERCISE_CATALOG.find((e) => e.id === log.exercise_type);
  const intensityInfo = INTENSITY_LABELS[log.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;

  return (
    <View style={cardS.card}>
      <View style={[cardS.iconWrap, { backgroundColor: (entry?.color ?? Colors.primary) + '20' }]}>
        <Text style={cardS.emoji}>{entry?.emoji ?? '🏅'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cardS.name}>{log.exercise_name}</Text>
        <View style={cardS.metaRow}>
          <Text style={cardS.metaText}>{log.duration_minutes} dk</Text>
          <View style={[cardS.pill, { backgroundColor: intensityInfo.color + '18' }]}>
            <Text style={[cardS.pillText, { color: intensityInfo.color }]}>
              {intensityInfo.emoji} {intensityInfo.label}
            </Text>
          </View>
        </View>
        {(log.epoc_min_kcal != null) && (
          <Text style={cardS.epocNote}>
            +{log.epoc_min_kcal}–{log.epoc_max_kcal} kcal EPOC
          </Text>
        )}
      </View>
      <View style={cardS.right}>
        <Text style={cardS.kcal}>{log.calories_burned}</Text>
        <Text style={cardS.kcalUnit}>kcal</Text>
      </View>
      <TouchableOpacity style={cardS.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function WeeklyDots({ logs }: { logs: ExerciseLog[] }) {
  const today = new Date();
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dow + 6) % 7));

  const loggedDates = new Set(logs.map((l) => l.logged_at.split('T')[0]));

  return (
    <View style={weekS.row}>
      {days.map((day, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const isToday = key === today.toISOString().split('T')[0];
        const done = loggedDates.has(key);
        return (
          <View key={day} style={weekS.dayCol}>
            <View style={[weekS.dot, done && weekS.dotDone, isToday && weekS.dotToday]} />
            <Text style={[weekS.dayLabel, isToday && weekS.dayLabelToday]}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm, marginBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  headerDate: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  historyBtn: { width: 38, height: 38, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: Spacing.sm },
  heroDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.xs },
  epocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md, paddingHorizontal: 4 },
  epocText: { fontSize: FontSize.xs, color: Colors.textMuted, flex: 1 },
  epocSource: { fontStyle: 'italic' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 6 },
  addBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  sectionLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textMuted },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  mascotSlot: { alignItems: 'center', paddingVertical: Spacing.lg },
  mascotEmoji: { fontSize: 64, opacity: 0.25 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  closeBtn: { width: 34, height: 34, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  formLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  recentChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.borderLight },
  recentChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  recentChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  groupTile: { width: (SW - Spacing.lg * 2 - Spacing.sm * 2) / 3, alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, borderWidth: 1.5, borderColor: 'transparent' },
  groupTileActive: { backgroundColor: Colors.primary + '12', borderColor: Colors.primary },
  groupTileEmoji: { fontSize: 28, marginBottom: 4 },
  groupTileLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  groupTileLabelActive: { color: Colors.primary, fontWeight: '700' },
  entryScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  entryChip: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderLight, minWidth: 80 },
  entryChipEmoji: { fontSize: 24, marginBottom: 4 },
  entryChipLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  durationScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  durationChip: { alignItems: 'center', width: 56, paddingVertical: Spacing.sm, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.borderLight },
  durationChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  durationChipNum: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textSecondary },
  durationChipNumActive: { color: Colors.primary },
  durationChipUnit: { fontSize: FontSize.xs, color: Colors.textMuted },
  durationChipUnitActive: { color: Colors.primary },
  intensityPill: { flexDirection: 'row', gap: Spacing.sm },
  intensityOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.borderLight },
  intensityEmoji: { fontSize: 22, marginBottom: 4 },
  intensityLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  stickyBottom: { borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface, padding: Spacing.md },
  chronoWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  chronoWarnText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  sourceNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.sm, fontStyle: 'italic' },
  saveBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  breakdownBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  breakdownBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});

const statS = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: FontSize.xl, fontWeight: '800' },
  unit: { fontSize: FontSize.sm, fontWeight: '600' },
  label: { fontSize: FontSize.xs, color: Colors.textMuted },
});

const cardS = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  iconWrap: { width: 44, height: 44, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  emoji: { fontSize: 22 },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  pill: { paddingHorizontal: Spacing.xs + 2, paddingVertical: 2, borderRadius: BorderRadius.full },
  pillText: { fontSize: FontSize.xs, fontWeight: '700' },
  epocNote: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2, fontStyle: 'italic' },
  right: { alignItems: 'flex-end', marginRight: Spacing.sm },
  kcal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.accent },
  kcalUnit: { fontSize: FontSize.xs, color: Colors.textMuted },
  deleteBtn: { width: 30, height: 30, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
});

const weekS = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  dayCol: { alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.borderLight },
  dotDone: { backgroundColor: Colors.primary },
  dotToday: { borderWidth: 2, borderColor: Colors.primary },
  dayLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  dayLabelToday: { color: Colors.primary, fontWeight: '800' },
});
