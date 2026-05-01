import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Path, Circle, Line, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
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
const RECENT_KEY = 'fitbite_recent_exercises';
const MAX_RECENT = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Pulse Trace SVG — EKG-style horizontal strip representing today's exercises
// ─────────────────────────────────────────────────────────────────────────────
function PulseTrace({ exercises }: { exercises: ExerciseLog[] }) {
  const W = SW - 48;
  const H = 56;
  const mid = H / 2;

  let d = `M 0 ${mid}`;

  if (exercises.length === 0) {
    // Calm sine wave when no exercises
    for (let x = 0; x <= W; x += 4) {
      const y = mid + Math.sin((x / W) * Math.PI * 3) * 5;
      d += ` L ${x} ${y}`;
    }
  } else {
    // Spike for each exercise
    const maxKcal = Math.max(...exercises.map((e) => e.calories_burned), 1);
    exercises.forEach((ex, i) => {
      const cx = (i + 0.5) * (W / exercises.length);
      const spikeH = 8 + (ex.calories_burned / maxKcal) * (H * 0.72);
      // Lead-in flat
      d += ` L ${cx - 18} ${mid}`;
      // Spike up
      d += ` L ${cx - 8} ${mid}`;
      d += ` L ${cx - 4} ${mid - spikeH}`;
      d += ` L ${cx} ${mid + spikeH * 0.3}`;
      d += ` L ${cx + 4} ${mid - spikeH * 0.15}`;
      d += ` L ${cx + 10} ${mid}`;
    });
    d += ` L ${W} ${mid}`;
  }

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.4} />
          <Stop offset="0.5" stopColor={Colors.accent} stopOpacity={1} />
          <Stop offset="1" stopColor={Colors.primary} stopOpacity={0.4} />
        </LinearGradient>
      </Defs>
      <Path
        d={d}
        fill="none"
        stroke="url(#pulseGrad)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effort Orbit — concentric arcs for kcal / minutes / water
// ─────────────────────────────────────────────────────────────────────────────
function EffortOrbit({
  kcal,
  minutes,
  waterMl,
}: {
  kcal: number;
  minutes: number;
  waterMl: number;
}) {
  const size = 148;
  const cx = size / 2;
  const cy = size / 2;

  function arc(r: number, pct: number, color: string, strokeW: number) {
    const clamped = Math.min(1, Math.max(0, pct));
    const angle = clamped * 270 - 135; // -135° to +135°
    const startRad = (-135 * Math.PI) / 180;
    const endRad = (angle * Math.PI) / 180;
    const sx = cx + r * Math.cos(startRad);
    const sy = cy + r * Math.sin(startRad);
    const ex = cx + r * Math.cos(endRad);
    const ey = cy + r * Math.sin(endRad);
    const largeArc = clamped > 0.5 ? 1 : 0;
    if (clamped <= 0) return null;
    return (
      <Path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
    );
  }

  function trackArc(r: number) {
    const startRad = (-135 * Math.PI) / 180;
    const endRad = (135 * Math.PI) / 180;
    const sx = cx + r * Math.cos(startRad);
    const sy = cy + r * Math.sin(startRad);
    const ex = cx + r * Math.cos(endRad);
    const ey = cy + r * Math.sin(endRad);
    return (
      <Path
        d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`}
        fill="none"
        stroke={Colors.borderLight}
        strokeWidth={1}
        strokeDasharray="2 4"
        strokeLinecap="round"
      />
    );
  }

  const kcalPct = Math.min(1, kcal / 400);
  const minPct = Math.min(1, minutes / 90);
  const waterPct = Math.min(1, waterMl / 1000);

  return (
    <Svg width={size} height={size}>
      {/* Track rings */}
      {trackArc(60)}
      {trackArc(48)}
      {trackArc(36)}
      {/* Filled arcs */}
      {arc(60, kcalPct, Colors.accent, 5)}
      {arc(48, minPct, Colors.primary, 5)}
      {arc(36, waterPct, Colors.sky, 5)}
      {/* Center stats */}
      <SvgText
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={22}
        fontWeight="700"
        fill={Colors.textPrimary}
        fontFamily={SERIF}
      >
        {kcal}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize={9}
        fill={Colors.textMuted}
        fontFamily={MONO}
        letterSpacing={1}
      >
        KCAL
      </SvgText>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly bar chart
// ─────────────────────────────────────────────────────────────────────────────
function WeekChart({ logs }: { logs: ExerciseLog[] }) {
  const today = new Date();
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dow + 6) % 7)); // Monday

  const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const kcalByDate: Record<string, number> = {};
  logs.forEach((l) => {
    const key = l.logged_at.split('T')[0];
    kcalByDate[key] = (kcalByDate[key] ?? 0) + l.calories_burned;
  });

  const weekKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const todayKey = today.toISOString().split('T')[0];
  const values = weekKeys.map((k) => kcalByDate[k] ?? 0);
  const maxVal = Math.max(...values, 1);
  const activeDays = values.filter((v) => v > 0).length;
  const weekTotal = values.reduce((s, v) => s + v, 0);
  const avgKcal = activeDays > 0 ? Math.round(weekTotal / activeDays) : 0;

  const BAR_H = 80;
  const BAR_W = (SW - 48 - 28 - 6 * 4) / 7; // 48 scroll padding + 28 chart padding + gaps

  return (
    <View style={wc.card}>
      {/* Summary stats row — inside the card with bottom border */}
      <View style={wc.statsRow}>
        <View style={wc.statItem}>
          <Text style={wc.statLabel}>HAFTA TOPLAMI</Text>
          <View style={wc.statValueRow}>
            <Text style={wc.statNum}>{weekTotal}</Text>
            <Text style={wc.statUnit}>kcal</Text>
          </View>
        </View>
        <View style={wc.statDivider} />
        <View style={wc.statItem}>
          <Text style={wc.statLabel}>ORTALAMA</Text>
          <View style={wc.statValueRow}>
            <Text style={wc.statNum}>{avgKcal || '—'}</Text>
            <Text style={wc.statUnit}>kcal/gün</Text>
          </View>
        </View>
        <View style={wc.statDivider} />
        <View style={wc.statItem}>
          <Text style={wc.statLabel}>AKTİF GÜN</Text>
          <View style={wc.statValueRow}>
            <Text style={wc.statNum}>{activeDays}</Text>
            <Text style={wc.statUnit}>/ {weekKeys.length}</Text>
          </View>
        </View>
      </View>

      {/* Bar chart */}
      <View style={[wc.chart, { height: BAR_H + 28 }]}>
        {/* Average dotted line */}
        {avgKcal > 0 && (
          <View
            style={[
              wc.avgLine,
              { bottom: 22 + (avgKcal / maxVal) * BAR_H },
            ]}
          />
        )}

        {weekKeys.map((key, i) => {
          const val = kcalByDate[key] ?? 0;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const barH = val > 0 ? Math.max(4, (val / maxVal) * BAR_H) : 0;

          return (
            <View key={key} style={[wc.dayCol, { width: BAR_W }]}>
              {val > 0 && !isFuture && (
                <Text style={[wc.barLabel, isToday && { color: Colors.accent }]}>
                  {Math.round(val)}
                </Text>
              )}
              <View style={[wc.barBg, { height: BAR_H }]}>
                {!isFuture && barH > 0 && (
                  <View
                    style={[
                      wc.barFill,
                      {
                        height: barH,
                        backgroundColor: isToday ? Colors.accent : Colors.primary,
                        opacity: isToday ? 1 : 0.65,
                      },
                    ]}
                  />
                )}
                {isFuture && (
                  <View style={wc.futureTick} />
                )}
              </View>
              <Text style={[wc.dayLabel, isToday && wc.dayLabelToday]}>
                {dayLabels[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Insight */}
      {weekTotal > 0 && (
        <View style={wc.insight}>
          <Text style={wc.insightLabel}>EN YÜKSEK</Text>
          <Text style={wc.insightVal}>
            {dayLabels[values.indexOf(Math.max(...values))]} · {Math.max(...values)} KCAL
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration Dial — circular clock-style picker, visual-only; presets drive value
// ─────────────────────────────────────────────────────────────────────────────
function DurationDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const SIZE = Math.min(SW - 80, 220);
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE * 0.38;
  const MAX = 120;
  const PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

  const frac = Math.min(0.999, value / MAX);
  const angDeg = frac * 360 - 90;
  const angRad = (angDeg * Math.PI) / 180;
  const hx = CX + Math.cos(angRad) * R;
  const hy = CY + Math.sin(angRad) * R;
  const startX = CX;
  const startY = CY - R;
  const largeArc = frac > 0.5 ? 1 : 0;

  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const major = i % 4 === 0;
    const r1 = R + 12;
    const r2 = R + (major ? 5 : 8);
    return {
      x1: CX + Math.cos(a) * r1,
      y1: CY + Math.sin(a) * r1,
      x2: CX + Math.cos(a) * r2,
      y2: CY + Math.sin(a) * r2,
      major,
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={Colors.textMuted}
            strokeWidth={t.major ? 0.9 : 0.4}
            opacity={t.major ? 0.7 : 0.4}
          />
        ))}
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={Colors.borderLight} strokeWidth={0.8} />
        {frac > 0.01 && (
          <Path
            d={`M ${startX} ${startY} A ${R} ${R} 0 ${largeArc} 1 ${hx} ${hy}`}
            stroke={Colors.accent}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <Circle cx={hx} cy={hy} r={9} fill={Colors.background} stroke={Colors.accent} strokeWidth={2} />
        <Circle cx={hx} cy={hy} r={3} fill={Colors.accent} />
        <SvgText
          x={CX} y={CY - 2}
          textAnchor="middle"
          fontSize={38}
          fontFamily={SERIF}
          fill={Colors.textPrimary}
        >
          {value}
        </SvgText>
        <SvgText
          x={CX} y={CY + 16}
          textAnchor="middle"
          fontSize={9}
          fontFamily={MONO}
          fill={Colors.textMuted}
          letterSpacing={2}
        >
          DAKİKA
        </SvgText>
      </Svg>

      {/* Preset chips */}
      <View style={dial.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            style={[dial.chip, value === p && dial.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[dial.chipText, value === p && dial.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const dial = StyleSheet.create({
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  chipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipText: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  chipTextActive: {
    color: Colors.background,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseCard
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseCard({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const entry = EXERCISE_CATALOG.find((e) => e.id === log.exercise_type);
  const intensityInfo = INTENSITY_LABELS[log.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
  const accentColor = entry?.color ?? Colors.primary;
  const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={card.wrap}>
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
          <Text style={card.dot}> · </Text>
          <Text style={card.meta}>{log.duration_minutes} dk</Text>
          <Text style={card.dot}> · </Text>
          <View style={[card.intensityPill, { backgroundColor: intensityInfo.color + '18' }]}>
            <Text style={[card.intensityText, { color: intensityInfo.color }]}>
              {intensityInfo.emoji} {intensityInfo.label}
            </Text>
          </View>
        </View>
        {log.epoc_min_kcal != null && (
          <Text style={card.epoc}>+{log.epoc_min_kcal}–{log.epoc_max_kcal} kcal EPOC</Text>
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

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
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

  const [addPhase, setAddPhase] = useState<'pick' | 'detail'>('pick');
  const [selectedGroup, setSelectedGroup] = useState<ExerciseGroup | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ExerciseCatalogEntry | null>(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [recentIds, setRecentIds] = useState<string[]>([]);

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

  function openAdd() {
    setAddPhase('pick');
    setSelectedGroup(groups[0]);
    setSelectedEntry(null);
    setDuration(30);
    setIntensity('moderate');
    setShowAdd(true);
  }

  function selectGroup(g: ExerciseGroup) {
    setSelectedGroup(g);
  }

  function selectEntry(e: ExerciseCatalogEntry) {
    setSelectedEntry(e);
    setDuration(e.defaultDuration);
    setIntensity(e.defaultIntensity);
    setAddPhase('detail');
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
  const filteredEntries = selectedGroup ? EXERCISE_CATALOG.filter((e) => e.group === selectedGroup) : [];
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
              Egzersiz<Text style={{ color: Colors.accent, fontStyle: 'italic' }}> nabzı</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setShowHistory(true); fetchHistory(); }}
            style={s.historyBtn}
          >
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── PULSE TRACE ── */}
        <View style={s.pulseWrap}>
          <PulseTrace exercises={todayExercises} />
        </View>

        {/* ── EFFORT ORBIT + STATS ── */}
        <View style={s.heroRow}>
          <EffortOrbit kcal={totalBurned} minutes={totalDuration} waterMl={waterBonus} />
          <View style={s.heroStats}>
            {/* Legend */}
            {[
              { color: Colors.accent, label: 'KCAL YAKILAN', val: `${totalBurned}` },
              { color: Colors.primary, label: 'AKTİF DAKİKA', val: `${totalDuration}` },
              { color: Colors.sky, label: 'SU BONUSU (ML)', val: `+${waterBonus}` },
            ].map((item) => (
              <View key={item.label} style={s.heroStatRow}>
                <View style={[s.heroStatDot, { backgroundColor: item.color }]} />
                <View>
                  <Text style={s.heroStatNum}>{item.val}</Text>
                  <Text style={s.heroStatLabel}>{item.label}</Text>
                </View>
              </View>
            ))}
            {epocRange[0] > 0 && (
              <View style={s.epocBadge}>
                <Text style={s.epocText}>+{epocRange[0]}–{epocRange[1]} EPOC</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── ADD BUTTON ── */}
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <View style={s.addBtnInner}>
            <Ionicons name="add" size={20} color={Colors.background} />
            <Text style={s.addBtnText}>Egzersiz Ekle</Text>
          </View>
        </TouchableOpacity>

        {/* ── WEEKLY CHART ── */}
        <View style={s.section}>
          <View style={s.weekHeaderRow}>
            <View>
              <Text style={s.weekTitle}>Bu <Text style={{ fontStyle: 'italic', color: Colors.accent }}>Hafta</Text></Text>
              <Text style={s.weekSub}>GÜNLÜK YAKILAN KCAL</Text>
            </View>
            <View style={s.weekLegend}>
              <View style={[s.legendDot, { backgroundColor: Colors.accent }]} />
              <Text style={s.legendLabel}>BUGÜN</Text>
              <View style={[s.legendDot, { backgroundColor: Colors.primary, marginLeft: 8 }]} />
              <Text style={s.legendLabel}>GEÇMİŞ</Text>
            </View>
          </View>
          <WeekChart logs={todayExercises} />
        </View>

        {/* ── TODAY'S LOGS ── */}
        {todayExercises.length > 0 && (
          <View style={s.section}>
            <Text style={s.overline}>BUGÜNÜN EGZERSİZLERİ</Text>
            {todayExercises.map((log) => (
              <ExerciseCard key={log.id} log={log} onDelete={() => confirmDelete(log.id)} />
            ))}
          </View>
        )}

        {todayExercises.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>Bugün henüz egzersiz yok</Text>
            <Text style={s.emptySub}>Yukarıdaki butona dokunarak ilk egzersizini ekle</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── ADD EXERCISE MODAL ── */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (addPhase === 'detail') {
                  setAddPhase('pick');
                  setSelectedEntry(null);
                } else {
                  setShowAdd(false);
                }
              }}
              style={s.backBtn}
            >
              <Ionicons
                name={addPhase === 'detail' ? 'arrow-back' : 'close'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.modalOverline}>
                {addPhase === 'pick' ? 'NABZINI YÜKSELT' : (selectedGroup ? EXERCISE_GROUP_LABELS[selectedGroup].nameTr.toUpperCase() : '')}
              </Text>
              <Text style={s.modalTitle}>
                {addPhase === 'pick'
                  ? <>Egzersiz <Text style={{ fontStyle: 'italic', color: Colors.accent }}>Seç</Text></>
                  : <Text style={{ fontStyle: 'italic', color: Colors.accent }}>{selectedEntry?.nameTr}</Text>
                }
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAdd(false)}
              style={[s.closeBtn, addPhase === 'pick' && { opacity: 0 }]}
              disabled={addPhase === 'pick'}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>

            {/* ── PICK PHASE: Category chips + Exercise grid ── */}
            {addPhase === 'pick' && (
              <>
                {/* Category pill chips — 3 per row */}
                <Text style={s.formLabel}>KATEGORİ</Text>
                <View style={s.categoryPills}>
                  {groups.map((g) => {
                    const info = EXERCISE_GROUP_LABELS[g];
                    const active = selectedGroup === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[s.categoryPill, active && s.categoryPillActive]}
                        onPress={() => selectGroup(g)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.categoryPillEmoji}>{info.emoji}</Text>
                        <Text style={[s.categoryPillLabel, active && s.categoryPillLabelActive]} numberOfLines={1}>
                          {info.nameTr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Exercise grid */}
                {selectedGroup && (
                  <>
                    <View style={s.exGridHeader}>
                      <Text style={s.formLabel}>EGZERSİZLER</Text>
                      <Text style={s.exGridCount}>{filteredEntries.length} SEÇENEK</Text>
                    </View>
                    <View style={s.exerciseGrid}>
                      {filteredEntries.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          style={s.exerciseTile}
                          onPress={() => selectEntry(e)}
                          activeOpacity={0.75}
                        >
                          <View style={[s.exerciseTileIcon, { backgroundColor: e.color + '1A' }]}>
                            <Text style={s.exerciseTileEmoji}>{e.emoji}</Text>
                          </View>
                          <Text style={s.exerciseTileName}>{e.nameTr}</Text>
                          <View style={[s.metPill, { backgroundColor: e.color + '20' }]}>
                            <Text style={[s.metText, { color: e.color }]}>MET {e.met.moderate}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Recents */}
                {recentEntries.length > 0 && (
                  <>
                    <Text style={[s.formLabel, { marginTop: Spacing.lg }]}>SON KULLANILANLAR</Text>
                    <View style={s.recentRow}>
                      {recentEntries.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          style={s.recentChip}
                          onPress={() => selectEntry(e)}
                          activeOpacity={0.75}
                        >
                          <Text style={s.recentChipEmoji}>{e.emoji}</Text>
                          <Text style={s.recentChipText}>{e.nameTr}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {/* ── DETAIL PHASE: Duration dial + intensity ── */}
            {addPhase === 'detail' && selectedEntry && (
              <>
                {/* Entry icon hero */}
                <View style={s.detailHero}>
                  <View style={[s.detailEmojiWrap, { backgroundColor: selectedEntry.color + '1A', borderColor: selectedEntry.color + '40' }]}>
                    <Text style={s.detailEmoji}>{selectedEntry.emoji}</Text>
                  </View>
                </View>

                {/* Circular duration dial */}
                <Text style={[s.formLabel, { textAlign: 'center' }]}>SÜRE</Text>
                <DurationDial value={duration} onChange={setDuration} />

                {/* Intensity */}
                <Text style={[s.formLabel, { marginTop: Spacing.lg }]}>YOĞUNLUK</Text>
                <View style={s.intensityRow}>
                  {(['low', 'moderate', 'high'] as ExerciseIntensity[]).map((key) => {
                    const info = INTENSITY_LABELS[key];
                    const active = intensity === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.intensityOption, active && {
                          backgroundColor: info.color + '18',
                          borderColor: info.color,
                        }]}
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

                <View style={{ height: engineOutput ? 200 : Spacing.xl }} />
              </>
            )}

            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          {/* ── STICKY SUMMARY (detail phase) ── */}
          {addPhase === 'detail' && engineOutput && selectedEntry && (
            <View style={s.stickyBottom}>
              {engineOutput.chronoWarning && (
                <View style={s.chronoWarn}>
                  <Ionicons name="moon-outline" size={13} color="#F59E0B" />
                  <Text style={s.chronoWarnText}>
                    Geç saatte egzersiz — insülin duyarlılığı riski
                  </Text>
                </View>
              )}
              <View style={s.summaryRow}>
                {[
                  { label: 'kcal net', val: `${engineOutput.kcalNet}` },
                  { label: 'EPOC', val: `+${engineOutput.epocRange[0]}–${engineOutput.epocRange[1]}` },
                  { label: 'ml su', val: `+${engineOutput.waterBonusML}` },
                ].map((item, i) => (
                  <React.Fragment key={item.label}>
                    {i > 0 && <View style={s.summaryDivider} />}
                    <View style={s.summaryItem}>
                      <Text style={s.summaryNum}>{item.val}</Text>
                      <Text style={s.summaryUnit}>{item.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
              {engineOutput.sourceNote ? (
                <Text style={s.sourceNote}>{engineOutput.sourceNote}</Text>
              ) : null}
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
            <View style={{ width: 36 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.modalOverline}>GEÇMİŞ</Text>
              <Text style={s.modalTitle}>Son 50 kayıt</Text>
            </View>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalScroll}>
            {historyLoading && <Text style={s.emptyTitle}>Yükleniyor…</Text>}
            {!historyLoading && historyLogs.length === 0 && (
              <Text style={s.emptyTitle}>Henüz egzersiz kaydı yok</Text>
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerOverline: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 32,
    color: Colors.textPrimary,
    lineHeight: 38,
    marginTop: 2,
  },
  historyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pulse trace
  pulseWrap: {
    marginBottom: Spacing.md,
    paddingVertical: 4,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.borderLight,
  },

  // Effort orbit + stats
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  heroStats: { flex: 1, gap: 10 },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroStatDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatNum: { fontFamily: SERIF, fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  heroStatLabel: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.8 },
  epocBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '0D',
  },
  epocText: { fontFamily: MONO, fontSize: 9, color: Colors.primary, letterSpacing: 0.5 },

  // Add button
  addBtn: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ink,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addBtnText: { color: Colors.background, fontWeight: '700', fontSize: FontSize.md, letterSpacing: 0.3 },

  section: { marginBottom: Spacing.xl },
  overline: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  // Bu Hafta section header
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  weekSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  weekLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: { width: 7, height: 7, borderRadius: 99 },
  legendLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },

  emptyWrap: { alignItems: 'center', paddingTop: Spacing.xl },
  emptyTitle: { fontFamily: SERIF, fontSize: 18, color: Colors.textSecondary, marginBottom: 6 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverline: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  modalTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, textAlign: 'center', lineHeight: 26 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  formLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Recent
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  recentChipEmoji: { fontSize: 16 },
  recentChipText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },

  // Category pill chips — 3 per row
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryPill: {
    width: (SW - 48 - 16) / 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  categoryPillActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  categoryPillEmoji: { fontSize: 14 },
  categoryPillLabel: {
    fontFamily: SERIF,
    fontSize: 12,
    color: Colors.textPrimary,
    fontStyle: 'normal',
  },
  categoryPillLabelActive: {
    color: Colors.background,
    fontStyle: 'italic',
  },

  // Exercise grid header
  exGridHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  exGridCount: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textFaint,
    letterSpacing: 0.8,
    marginTop: Spacing.md,
  },

  // Exercise grid — 3 columns with circle icon
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseTile: {
    width: (SW - 48 - 16) / 3,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 96,
  },
  exerciseTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseTileEmoji: { fontSize: 20 },
  exerciseTileName: {
    fontFamily: SERIF,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  metPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metText: { fontFamily: MONO, fontSize: 8, letterSpacing: 0.5 },

  // Detail hero
  detailHero: { alignItems: 'center', paddingVertical: Spacing.md },
  detailEmojiWrap: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  detailEmoji: { fontSize: 36 },

  // Intensity
  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  intensityEmoji: { fontSize: 20, marginBottom: 4 },
  intensityLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },

  // Sticky bottom
  stickyBottom: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  chronoWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    padding: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FEF3C715',
  },
  chronoWarnText: { fontSize: FontSize.xs, color: '#92400E', flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontFamily: SERIF, fontSize: 20, color: Colors.textPrimary },
  summaryUnit: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.8 },
  summaryDivider: { width: 0.5, height: 28, backgroundColor: Colors.borderLight },
  sourceNote: { fontSize: 10, color: Colors.textFaint, textAlign: 'center', marginBottom: 10 },
  saveBtnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  breakdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 0.5,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '0D',
  },
  breakdownBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ink,
  },
  saveBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: '700' },
});

// Week chart styles
const wc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statItem: { flex: 1 },
  statDivider: { width: 0.5, height: 34, backgroundColor: Colors.borderLight, marginHorizontal: 10 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  statNum: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, lineHeight: 26 },
  statUnit: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted },
  statLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.8 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, position: 'relative', paddingHorizontal: 14, paddingTop: 18, paddingBottom: 4 },
  avgLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 1,
    borderTopWidth: 0.5,
    borderColor: Colors.textFaint,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  dayCol: { alignItems: 'center', flex: 1, gap: 3 },
  barLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted },
  barBg: { width: '100%', backgroundColor: Colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  futureTick: { width: 8, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 2 },
  dayLabel: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted },
  dayLabelToday: { color: Colors.accent, fontWeight: '700' },

  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.primary + '06',
  },
  insightLabel: { fontFamily: MONO, fontSize: 9, color: Colors.primary, letterSpacing: 0.8 },
  insightVal: { fontFamily: MONO, fontSize: 10, color: Colors.primary, fontWeight: '700' },
});

// Exercise card styles
const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    marginBottom: 8,
    overflow: 'hidden',
  },
  colorBar: { width: 3, alignSelf: 'stretch' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
  },
  emoji: { fontSize: 20 },
  body: { flex: 1, paddingVertical: 12, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  kcal: { fontSize: FontSize.lg, fontWeight: '800', fontFamily: SERIF },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  time: { fontSize: FontSize.xs, color: Colors.textMuted },
  dot: { fontSize: FontSize.xs, color: Colors.textFaint },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted },
  intensityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  intensityText: { fontSize: FontSize.xs, fontWeight: '600' },
  epoc: { fontSize: 10, color: Colors.primary, fontFamily: MONO },
  rightCol: { paddingRight: 12, alignItems: 'center', gap: 8 },
  kcalUnit: { fontSize: FontSize.xs, color: Colors.textMuted },
  deleteBtn: { padding: 4 },
});
