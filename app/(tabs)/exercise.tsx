import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  Dimensions,
  Platform,
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
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });
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

  const [selectedGroup, setSelectedGroup] = useState<ExerciseGroup | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ExerciseCatalogEntry | null>(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [historyLogs, setHistoryLogs] = useState<ExerciseLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Animation for header stats
  const headerAnim = useRef(new Animated.Value(0)).current;

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
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
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

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const weekdayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerOverline}>{weekdayStr} · {todayStr.toUpperCase()}</Text>
            <Text style={s.headerTitle}>
              Egzersiz
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setShowHistory(true); fetchHistory(); }}
            style={s.historyBtn}
          >
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── HERO STATS CARD ── */}
        <View style={s.heroCard}>
          <View style={s.heroMain}>
            {/* Big calorie number */}
            <View style={s.heroCenterCol}>
              <Text style={s.heroKcalNum}>{totalBurned}</Text>
              <Text style={s.heroKcalUnit}>kcal yakıldı</Text>
              {totalBurned > 0 && (
                <View style={s.epocBadge}>
                  <Ionicons name="trending-up" size={11} color={Colors.primary} />
                  <Text style={s.epocBadgeText}>
                    +{epocRange[0]}–{epocRange[1]} EPOC
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Side stats */}
          <View style={s.heroSideRow}>
            <View style={s.heroSideItem}>
              <View style={[s.heroSideIcon, { backgroundColor: Colors.primary + '18' }]}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
              </View>
              <Text style={s.heroSideNum}>{totalDuration}</Text>
              <Text style={s.heroSideLabel}>dk aktif</Text>
            </View>
            <View style={s.heroSideDivider} />
            <View style={s.heroSideItem}>
              <View style={[s.heroSideIcon, { backgroundColor: '#38BDF815' }]}>
                <Ionicons name="water-outline" size={16} color="#38BDF8" />
              </View>
              <Text style={[s.heroSideNum, { color: '#38BDF8' }]}>+{waterBonus}</Text>
              <Text style={s.heroSideLabel}>ml su</Text>
            </View>
            <View style={s.heroSideDivider} />
            <View style={s.heroSideItem}>
              <View style={[s.heroSideIcon, { backgroundColor: Colors.accent + '15' }]}>
                <Ionicons name="fitness-outline" size={16} color={Colors.accent} />
              </View>
              <Text style={[s.heroSideNum, { color: Colors.accent }]}>
                {todayExercises.length}
              </Text>
              <Text style={s.heroSideLabel}>egzersiz</Text>
            </View>
          </View>
        </View>

        {/* ── WEEKLY ACTIVITY ── */}
        <Text style={s.overline}>BU HAFTA</Text>
        <WeeklyActivity logs={todayExercises} />

        {/* ── ADD BUTTON ── */}
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <View style={s.addBtnInner}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addBtnText}>Egzersiz Ekle</Text>
          </View>
        </TouchableOpacity>

        {/* ── TODAY'S LOGS ── */}
        {todayExercises.length > 0 ? (
          <>
            <Text style={s.overline}>BUGÜNÜN EGZERSİZLERİ</Text>
            {todayExercises.map((log) => (
              <ExerciseCard key={log.id} log={log} onDelete={() => confirmDelete(log.id)} />
            ))}
          </>
        ) : (
          <EmptyState />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── ADD EXERCISE MODAL ── */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>Egzersiz Ekle</Text>
              <Text style={s.modalSubtitle}>Kategori seç, süre ve yoğunluk ayarla</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.modalScroll}
          >
            {/* Recent */}
            {recentEntries.length > 0 && (
              <>
                <Text style={s.formLabel}>SON KULLANILANLAR</Text>
                <View style={s.chipRow}>
                  {recentEntries.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        s.recentChip,
                        selectedEntry?.id === e.id && s.recentChipActive,
                      ]}
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
                    activeOpacity={0.75}
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.entryScroll}
                >
                  {filteredEntries.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        s.entryChip,
                        selectedEntry?.id === e.id && {
                          backgroundColor: e.color + '1A',
                          borderColor: e.color,
                        },
                      ]}
                      onPress={() => selectEntry(e)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.entryChipEmoji}>{e.emoji}</Text>
                      <Text
                        style={[
                          s.entryChipLabel,
                          selectedEntry?.id === e.id && { color: e.color, fontWeight: '700' },
                        ]}
                      >
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.durationScroll}
                >
                  {DURATION_PRESETS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[s.durationChip, duration === d && s.durationChipActive]}
                      onPress={() => setDuration(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.durationChipNum, duration === d && s.durationChipNumActive]}>
                        {d}
                      </Text>
                      <Text style={[s.durationChipUnit, duration === d && s.durationChipUnitActive]}>
                        dk
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Intensity */}
                <Text style={s.formLabel}>YOĞUNLUK</Text>
                <View style={s.intensityRow}>
                  {(['low', 'moderate', 'high'] as ExerciseIntensity[]).map((key) => {
                    const info = INTENSITY_LABELS[key];
                    const active = intensity === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          s.intensityOption,
                          active && {
                            backgroundColor: info.color + '18',
                            borderColor: info.color,
                          },
                        ]}
                        onPress={() => setIntensity(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.intensityEmoji}>{info.emoji}</Text>
                        <Text
                          style={[
                            s.intensityLabel,
                            active && { color: info.color, fontWeight: '700' },
                          ]}
                        >
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ height: engineOutput ? 220 : Spacing.xxl }} />
          </ScrollView>

          {/* ── STICKY SUMMARY ── */}
          {engineOutput && selectedEntry && (
            <View style={s.stickyBottom}>
              {chronoWarning && (
                <View style={s.chronoWarn}>
                  <Ionicons name="moon-outline" size={13} color="#F59E0B" />
                  <Text style={s.chronoWarnText}>
                    Geç saatte egzersiz — insülin duyarlılığı riski (Vahlhaus 2024)
                  </Text>
                </View>
              )}
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryEmoji}>🔥</Text>
                  <Text style={s.summaryNum}>{engineOutput.kcalNet}</Text>
                  <Text style={s.summaryUnit}>kcal net</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryEmoji}>⚡</Text>
                  <Text style={s.summaryNum}>
                    +{engineOutput.epocRange[0]}–{engineOutput.epocRange[1]}
                  </Text>
                  <Text style={s.summaryUnit}>EPOC</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryEmoji}>💧</Text>
                  <Text style={s.summaryNum}>+{engineOutput.waterBonusML}</Text>
                  <Text style={s.summaryUnit}>ml su</Text>
                </View>
              </View>
              <Text style={s.sourceNote}>{engineOutput.sourceNote}</Text>
              <View style={s.saveBtnRow}>
                <TouchableOpacity
                  style={s.breakdownBtn}
                  onPress={() => setShowBreakdown(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="analytics-outline" size={16} color={Colors.primary} />
                  <Text style={s.breakdownBtnText}>Nasıl hesaplandı?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>
                    {saving ? 'Kaydediliyor…' : 'Günlüğe Ekle'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>

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

      {/* ── HISTORY MODAL ── */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>Geçmiş</Text>
              <Text style={s.modalSubtitle}>Son 50 egzersiz kaydı</Text>
            </View>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalScroll}>
            {historyLoading && (
              <Text style={s.emptyText}>Yükleniyor…</Text>
            )}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={empty.wrap}>
      <Text style={empty.illustration}>🏃</Text>
      <Text style={empty.title}>Bugün henüz egzersiz yok</Text>
      <Text style={empty.sub}>
        Yukarıdaki butona dokunarak ilk egzersizini ekle
      </Text>
    </View>
  );
}

function ExerciseCard({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const entry = EXERCISE_CATALOG.find((e) => e.id === log.exercise_type);
  const intensityInfo =
    INTENSITY_LABELS[log.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
  const accentColor = entry?.color ?? Colors.primary;
  const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={card.wrap}>
      {/* Color bar */}
      <View style={[card.colorBar, { backgroundColor: accentColor }]} />

      <View style={[card.iconWrap, { backgroundColor: accentColor + '18' }]}>
        <Text style={card.emoji}>{entry?.emoji ?? '🏅'}</Text>
      </View>

      <View style={card.body}>
        <View style={card.nameRow}>
          <Text style={card.name}>{log.exercise_name}</Text>
          <Text style={[card.kcal, { color: accentColor }]}>{log.calories_burned}</Text>
        </View>
        <View style={card.metaRow}>
          <Text style={card.time}>{time}</Text>
          <Text style={card.dot}>·</Text>
          <Text style={card.meta}>{log.duration_minutes} dk</Text>
          <Text style={card.dot}>·</Text>
          <View style={[card.intensityPill, { backgroundColor: intensityInfo.color + '18' }]}>
            <Text style={[card.intensityText, { color: intensityInfo.color }]}>
              {intensityInfo.emoji} {intensityInfo.label}
            </Text>
          </View>
        </View>
        {log.epoc_min_kcal != null && (
          <Text style={card.epoc}>
            ⚡ +{log.epoc_min_kcal}–{log.epoc_max_kcal} kcal sonrası yakım
          </Text>
        )}
      </View>

      <View style={card.rightCol}>
        <Text style={card.kcalUnit}>kcal</Text>
        <TouchableOpacity style={card.deleteBtn} onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={14} color={Colors.textFaint} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WeeklyActivity({ logs }: { logs: ExerciseLog[] }) {
  const today = new Date();
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dow + 6) % 7));

  const kcalByDate: Record<string, number> = {};
  logs.forEach((l) => {
    const key = l.logged_at.split('T')[0];
    kcalByDate[key] = (kcalByDate[key] ?? 0) + l.calories_burned;
  });

  const maxKcal = Math.max(...Object.values(kcalByDate), 1);

  return (
    <View style={week.wrap}>
      {days.map((day, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const isToday = key === today.toISOString().split('T')[0];
        const kcal = kcalByDate[key] ?? 0;
        const pct = kcal > 0 ? Math.max(0.12, kcal / maxKcal) : 0;

        return (
          <View key={day} style={week.dayCol}>
            {kcal > 0 && (
              <Text style={week.kcalLabel}>{Math.round(kcal)}</Text>
            )}
            <View style={week.barBg}>
              <View
                style={[
                  week.barFill,
                  {
                    height: `${Math.round(pct * 100)}%`,
                    backgroundColor: isToday ? Colors.primary : Colors.primary + '60',
                  },
                ]}
              />
            </View>
            <Text style={[week.dayLabel, isToday && week.dayLabelToday]}>{day}</Text>
            {isToday && <View style={week.todayDot} />}
          </View>
        );
      })}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerOverline: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    fontFamily: MONO,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: SERIF,
    letterSpacing: -0.5,
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overline: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.6,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  heroMain: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heroCenterCol: {
    alignItems: 'center',
  },
  heroKcalNum: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: SERIF,
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroKcalUnit: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  epocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  epocBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: MONO,
  },

  // Side stats
  heroSideRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  heroSideItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroSideIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  heroSideNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: MONO,
  },
  heroSideLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  heroSideDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.xs,
  },

  // Add button
  addBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
  },
  addBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: SERIF,
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    fontFamily: MONO,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  recentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recentChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  recentChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  groupTile: {
    width: (SW - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  groupTileActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  groupTileEmoji: { fontSize: 28, marginBottom: 6 },
  groupTileLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  groupTileLabelActive: { color: Colors.primary, fontWeight: '700' },
  entryScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  entryChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    minWidth: 84,
  },
  entryChipEmoji: { fontSize: 24, marginBottom: 4 },
  entryChipLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  durationScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  durationChip: {
    alignItems: 'center',
    width: 58,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  durationChipActive: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  durationChipNum: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  durationChipNumActive: { color: Colors.primary },
  durationChipUnit: { fontSize: FontSize.xs, color: Colors.textMuted },
  durationChipUnitActive: { color: Colors.primary },
  intensityRow: { flexDirection: 'row', gap: Spacing.sm },
  intensityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  intensityEmoji: { fontSize: 22, marginBottom: 4 },
  intensityLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Sticky bottom
  stickyBottom: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  chronoWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF3C715',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  chronoWarnText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#92400E',
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryEmoji: { fontSize: 18, marginBottom: 2 },
  summaryNum: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 4,
  },
  sourceNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  saveBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  breakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0C',
  },
  breakdownBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
});

// Empty state
const empty = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  illustration: {
    fontSize: 64,
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: SERIF,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

// Exercise card
const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.sm,
    flexShrink: 0,
  },
  emoji: { fontSize: 22 },
  body: { flex: 1, paddingVertical: Spacing.sm, paddingRight: 4 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    fontFamily: SERIF,
  },
  kcal: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: MONO,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: MONO,
  },
  dot: {
    fontSize: FontSize.xs,
    color: Colors.textFaint,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  intensityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  epoc: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 3,
    fontStyle: 'italic',
    fontFamily: MONO,
  },
  rightCol: {
    alignItems: 'center',
    paddingRight: Spacing.sm,
    gap: 6,
  },
  kcalUnit: {
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Weekly activity
const week = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 100,
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  kcalLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontFamily: MONO,
    textAlign: 'center',
    marginBottom: 2,
  },
  barBg: {
    width: 8,
    height: 48,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: MONO,
    textAlign: 'center',
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
