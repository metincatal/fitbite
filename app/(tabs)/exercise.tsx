import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Rect, Ellipse, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ExGlyph, EXERCISE_GLYPHS, GROUP_GLYPHS } from '../../components/exercise/ExGlyph';
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
// Pulse Trace — EKG card with time-positioned spikes and hour axis
// ─────────────────────────────────────────────────────────────────────────────
function PulseTrace({ exercises }: { exercises: ExerciseLog[] }) {
  const W = SW - 80; // card padding
  const H = 60;
  const mid = H / 2;

  function timeToX(iso: string) {
    const d = new Date(iso);
    const hours = d.getHours() + d.getMinutes() / 60;
    return (hours / 24) * W;
  }

  let pathD = `M 0 ${mid}`;
  let dotX: number | null = null;
  let dotY: number | null = null;

  if (exercises.length === 0) {
    for (let x = 0; x <= W; x += 4) {
      const y = mid + Math.sin((x / W) * Math.PI * 3) * 4;
      pathD += ` L ${x} ${y}`;
    }
  } else {
    const maxKcal = Math.max(...exercises.map((e) => e.calories_burned), 1);
    const sorted = [...exercises].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    let prevX = 0;
    sorted.forEach((ex, i) => {
      const cx = timeToX(ex.logged_at);
      const spikeH = Math.min(mid - 4, 8 + (ex.calories_burned / maxKcal) * (mid - 12));
      if (cx > prevX + 2) pathD += ` L ${Math.max(prevX, cx - 14)} ${mid}`;
      pathD += ` L ${cx - 6} ${mid}`;
      pathD += ` L ${cx - 3} ${mid - spikeH}`;
      pathD += ` L ${cx} ${mid + spikeH * 0.3}`;
      pathD += ` L ${cx + 4} ${mid - spikeH * 0.15}`;
      pathD += ` L ${cx + 10} ${mid}`;
      if (i === sorted.length - 1) {
        dotX = cx - 3;
        dotY = mid - spikeH;
      }
      prevX = cx + 10;
    });
    pathD += ` L ${W} ${mid}`;
  }

  return (
    <View style={pulse.card}>
      <Text style={pulse.label}>GÜN BOYU NABIZ İZİ</Text>
      <Svg width={W} height={H}>
        <Path
          d={pathD}
          fill="none"
          stroke={Colors.accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dotX !== null && dotY !== null && (
          <Circle cx={dotX} cy={dotY} r={4} fill={Colors.accent} />
        )}
      </Svg>
      <View style={pulse.axis}>
        {['00', '06', '12', '18', '24'].map((h) => (
          <Text key={h} style={pulse.axisLabel}>{h}</Text>
        ))}
      </View>
    </View>
  );
}

const pulse = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: Colors.textFaint,
    letterSpacing: 0.5,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Effort Orbit — concentric arcs
// ─────────────────────────────────────────────────────────────────────────────
function EffortOrbit({ kcal, minutes, waterMl }: { kcal: number; minutes: number; waterMl: number }) {
  const size = 148;
  const cx = size / 2;
  const cy = size / 2;

  function arc(r: number, pct: number, color: string, strokeW: number) {
    const clamped = Math.min(1, Math.max(0, pct));
    const angle = clamped * 270 - 135;
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
      {trackArc(60)}
      {trackArc(48)}
      {trackArc(36)}
      {arc(60, kcalPct, Colors.accent, 5)}
      {arc(48, minPct, Colors.primary, 5)}
      {arc(36, waterPct, Colors.sky, 5)}
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill={Colors.textPrimary} fontFamily={SERIF}>
        {kcal}
      </SvgText>
      <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill={Colors.textMuted} fontFamily={MONO} letterSpacing={1}>
        KCAL
      </SvgText>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat mini-card — used on the right of the orbit
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  iconName, iconColor, iconBg, label, value, unit,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={sc.card}>
      <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={14} color={iconColor} />
      </View>
      <View style={sc.textGroup}>
        <Text style={sc.label}>{label}</Text>
        <View style={sc.valueRow}>
          <Text style={sc.num}>{value}</Text>
          <Text style={sc.unit}> {unit}</Text>
        </View>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  label: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.8 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 1 },
  num: { fontFamily: SERIF, fontSize: 18, color: Colors.textPrimary, lineHeight: 22 },
  unit: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted },
});

// ─────────────────────────────────────────────────────────────────────────────
// Weekly bar chart
// ─────────────────────────────────────────────────────────────────────────────
function WeekChart({ logs }: { logs: ExerciseLog[] }) {
  const today = new Date();
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dow + 6) % 7));

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
  const BAR_W = (SW - 48 - 28 - 6 * 4) / 7;

  return (
    <View style={wc.card}>
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

      <View style={[wc.chart, { height: BAR_H + 28 }]}>
        {avgKcal > 0 && (
          <View style={[wc.avgLine, { bottom: 22 + (avgKcal / maxVal) * BAR_H }]} />
        )}
        {avgKcal > 0 && (
          <Text style={[wc.avgLineLabel, { bottom: 24 + (avgKcal / maxVal) * BAR_H }]}>
            ORT {avgKcal}
          </Text>
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
                      { height: barH, backgroundColor: isToday ? Colors.accent : Colors.primary, opacity: isToday ? 1 : 0.65 },
                    ]}
                  />
                )}
                {isFuture && <View style={wc.futureTick} />}
              </View>
              <Text style={[wc.dayLabel, isToday && wc.dayLabelToday]}>{dayLabels[i]}</Text>
              {isToday && <View style={wc.todayDot} />}
            </View>
          );
        })}
      </View>

      {weekTotal > 0 && (
        <View style={wc.insight}>
          <View style={wc.insightDot} />
          <Text style={wc.insightText}>
            EN YÜKSEK · {dayLabels[values.indexOf(Math.max(...values))].toUpperCase()} {Math.max(...values)} KCAL
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration Dial
// ─────────────────────────────────────────────────────────────────────────────
function DurationDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const SIZE = Math.min(SW - 80, 220);
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE * 0.38;
  const MAX = 120;
  const PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - CX;
        const dy = locationY - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R - 36 || dist > R + 36) return;
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += 2 * Math.PI;
        const minutes = Math.max(1, Math.min(MAX, Math.round((angle / (2 * Math.PI)) * MAX)));
        onChangeRef.current(minutes);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - CX;
        const dy = locationY - CY;
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += 2 * Math.PI;
        const minutes = Math.max(1, Math.min(MAX, Math.round((angle / (2 * Math.PI)) * MAX)));
        onChangeRef.current(minutes);
      },
    })
  ).current;

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
    return { x1: CX + Math.cos(a) * r1, y1: CY + Math.sin(a) * r1, x2: CX + Math.cos(a) * r2, y2: CY + Math.sin(a) * r2, major };
  });

  const activePreset = PRESETS.includes(value) ? value : null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE }} {...panResponder.panHandlers}>
        <Svg width={SIZE} height={SIZE}>
          {ticks.map((t, i) => (
            <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={Colors.textMuted} strokeWidth={t.major ? 0.9 : 0.4} opacity={t.major ? 0.7 : 0.4} />
          ))}
          <Circle cx={CX} cy={CY} r={R} fill="none" stroke={Colors.borderLight} strokeWidth={0.8} />
          {frac > 0.01 && (
            <Path d={`M ${startX} ${startY} A ${R} ${R} 0 ${largeArc} 1 ${hx} ${hy}`} stroke={Colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          )}
          <Circle cx={hx} cy={hy} r={9} fill={Colors.background} stroke={Colors.accent} strokeWidth={2} />
          <Circle cx={hx} cy={hy} r={3} fill={Colors.accent} />
          <SvgText x={CX} y={CY - 2} textAnchor="middle" fontSize={38} fontFamily={SERIF} fill={Colors.textPrimary}>{value}</SvgText>
          <SvgText x={CX} y={CY + 16} textAnchor="middle" fontSize={9} fontFamily={MONO} fill={Colors.textMuted} letterSpacing={2}>DAKİKA</SvgText>
        </Svg>
      </View>
      <View style={dial.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity key={p} onPress={() => onChange(p)} style={[dial.chip, activePreset === p && dial.chipActive]} activeOpacity={0.7}>
            <Text style={[dial.chipText, activePreset === p && dial.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const dial = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: Colors.background, borderWidth: 0.5, borderColor: Colors.borderLight },
  chipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontFamily: MONO, fontSize: 10, color: Colors.textMuted, letterSpacing: 0.6 },
  chipTextActive: { color: Colors.background },
});

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseCard — redesigned with time on left, separator, icon, kcal right
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseCard({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  const entry = EXERCISE_CATALOG.find((e) => e.id === log.exercise_type);
  const intensityInfo = INTENSITY_LABELS[log.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
  const accentColor = entry?.color ?? Colors.primary;

  const d = new Date(log.logged_at);
  const hour = d.toLocaleTimeString('tr-TR', { hour: '2-digit', hour12: false });
  const minute = d.toLocaleTimeString('tr-TR', { minute: '2-digit' });

  return (
    <View style={card.wrap}>
      {/* Time column */}
      <View style={card.timeCol}>
        <Text style={card.timeHour}>{hour}</Text>
        <Text style={card.timeMin}>:{minute}</Text>
      </View>

      {/* Separator */}
      <View style={card.sep} />

      {/* Icon */}
      <View style={[card.iconWrap, { backgroundColor: accentColor + '18' }]}>
        <ExGlyph kind={entry ? (EXERCISE_GLYPHS[entry.id] ?? 'medal') : 'medal'} size={20} color={accentColor} />
      </View>

      {/* Body */}
      <View style={card.body}>
        <Text style={card.name}>{log.exercise_name}</Text>
        <Text style={card.meta}>
          {log.duration_minutes} DK · {intensityInfo.label.toUpperCase()} ·
        </Text>
        {log.epoc_min_kcal != null && (
          <Text style={card.epoc}>EPOC +{log.epoc_min_kcal}–{log.epoc_max_kcal}</Text>
        )}
      </View>

      {/* Kcal + delete */}
      <View style={card.rightCol}>
        <Text style={[card.kcal, { color: accentColor }]}>{log.calories_burned}</Text>
        <Text style={card.kcalUnit}>KCAL</Text>
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
    todayExercises, weekExercises, isLoading,
    fetchTodayExercises, fetchWeekExercises, addExerciseLog, removeExerciseLog,
    getTotalCaloriesBurned, getEpocRange, getWaterBonus,
  } = useExerciseStore();

  const { openAdd: autoOpenAdd } = useLocalSearchParams<{ openAdd?: string }>();

  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (autoOpenAdd === '1') setShowAdd(true);
  }, [autoOpenAdd]);
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
      fetchWeekExercises(user.id);
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

  function selectGroup(g: ExerciseGroup) { setSelectedGroup(g); }

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

  const now = new Date();
  const day = now.getDate();
  const monthStr = now.toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase();
  const weekdayStr = now.toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();
  const overlineStr = `${day} ${monthStr} · ${weekdayStr}`;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerOverline}>{overlineStr}</Text>
            <Text style={s.headerTitle}>
              {'Bugünün '}
              <Text style={{ color: Colors.accent, fontStyle: 'italic' }}>nabzı</Text>
              {'.'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setShowHistory(true); fetchHistory(); }}
            style={s.historyBtn}
          >
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── PULSE CARD ── */}
        <PulseTrace exercises={todayExercises} />

        {/* ── EFFORT ORBIT + STAT CARDS ── */}
        <View style={s.heroRow}>
          <EffortOrbit kcal={totalBurned} minutes={totalDuration} waterMl={waterBonus} />
          <View style={s.heroStats}>
            <StatCard
              iconName="flash"
              iconColor={Colors.accent}
              iconBg={Colors.accent + '22'}
              label="YAKILAN"
              value={`${totalBurned}`}
              unit="kcal"
            />
            <StatCard
              iconName="happy-outline"
              iconColor={Colors.primary}
              iconBg={Colors.primary + '22'}
              label="AKTİF"
              value={`${totalDuration}`}
              unit="dk"
            />
            <StatCard
              iconName="water-outline"
              iconColor={Colors.sky}
              iconBg={Colors.sky + '22'}
              label="SU BONUSU"
              value={`+${waterBonus}`}
              unit="ml"
            />
          </View>
        </View>

        {/* ── EPOC ROW ── */}
        {epocRange[0] > 0 && (
          <View style={s.epocRow}>
            <View style={s.epocDot} />
            <Text style={s.epocText}>
              {'EPOC SONRASI EK YAKIM '}
              <Text style={s.epocBold}>+{epocRange[0]}–{epocRange[1]} KCAL</Text>
              <Text style={s.epocRef}>{' · Borsheim & Bahr 2003'}</Text>
            </Text>
          </View>
        )}

        {/* ── ADD BUTTON ── */}
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <View style={s.addBtnCircle}>
            <Ionicons name="add" size={18} color={Colors.background} />
          </View>
          <Text style={s.addBtnLabel}>
            <Text style={{ fontStyle: 'italic' }}>Egzersiz Ekle</Text>
          </Text>
          <Text style={s.addBtnRight}>NABZINI YÜKSELT</Text>
        </TouchableOpacity>

        {/* ── TODAY'S SPIKES ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>
              {'Bugünün '}
              <Text style={{ fontStyle: 'italic', color: Colors.accent }}>spikeları</Text>
            </Text>
            <View style={s.kayitBadge}>
              <Text style={s.kayitText}>{todayExercises.length} KAYIT</Text>
            </View>
          </View>

          {todayExercises.length > 0 ? (
            todayExercises.map((log) => (
              <ExerciseCard key={log.id} log={log} onDelete={() => confirmDelete(log.id)} />
            ))
          ) : (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Bugün henüz egzersiz yok</Text>
              <Text style={s.emptySub}>Yukarıdaki butona dokunarak ilk egzersizini ekle</Text>
            </View>
          )}
        </View>

        {/* ── WEEKLY CHART ── */}
        <View style={s.section}>
          <View style={s.weekHeaderRow}>
            <View>
              <Text style={s.weekTitle}>
                {'Bu '}
                <Text style={{ fontStyle: 'italic', color: Colors.accent }}>Hafta</Text>
              </Text>
              <Text style={s.weekSub}>GÜNLÜK YAKILAN KCAL</Text>
            </View>
            <View style={s.weekLegend}>
              <View style={[s.legendDot, { backgroundColor: Colors.accent }]} />
              <Text style={s.legendLabel}>BUGÜN</Text>
              <View style={[s.legendDot, { backgroundColor: Colors.primary, marginLeft: 8 }]} />
              <Text style={s.legendLabel}>GEÇMİŞ</Text>
            </View>
          </View>
          <WeekChart logs={weekExercises} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── ADD EXERCISE MODAL ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={s.modalContainer} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (addPhase === 'detail') { setAddPhase('pick'); setSelectedEntry(null); }
                else { setShowAdd(false); }
              }}
              style={s.backBtn}
            >
              <Ionicons name={addPhase === 'detail' ? 'arrow-back' : 'close'} size={18} color={Colors.textSecondary} />
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
            <TouchableOpacity onPress={() => setShowAdd(false)} style={[s.closeBtn, addPhase === 'pick' && { opacity: 0 }]} disabled={addPhase === 'pick'}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            {addPhase === 'pick' && (
              <>
                <Text style={s.formLabel}>KATEGORİ</Text>
                <View style={s.categoryPills}>
                  {groups.map((g) => {
                    const info = EXERCISE_GROUP_LABELS[g];
                    const active = selectedGroup === g;
                    return (
                      <TouchableOpacity key={g} style={[s.categoryPill, active && s.categoryPillActive]} onPress={() => selectGroup(g)} activeOpacity={0.75}>
                        <ExGlyph kind={GROUP_GLYPHS[g] ?? 'pulse'} size={14} color={active ? Colors.background : Colors.textSecondary} />
                        <Text style={[s.categoryPillLabel, active && s.categoryPillLabelActive]} numberOfLines={1}>{info.nameTr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedGroup && (
                  <>
                    <View style={s.exGridHeader}>
                      <Text style={s.formLabel}>EGZERSİZLER</Text>
                      <Text style={s.exGridCount}>{filteredEntries.length} SEÇENEK</Text>
                    </View>
                    <View style={s.exerciseGrid}>
                      {filteredEntries.map((e) => (
                        <TouchableOpacity key={e.id} style={s.exerciseTile} onPress={() => selectEntry(e)} activeOpacity={0.75}>
                          <View style={[s.exerciseTileIcon, { backgroundColor: e.color + '1A' }]}>
                            <ExGlyph kind={EXERCISE_GLYPHS[e.id] ?? 'medal'} size={20} color={e.color} />
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
                {recentEntries.length > 0 && (
                  <>
                    <Text style={[s.formLabel, { marginTop: Spacing.lg }]}>SON KULLANILANLAR</Text>
                    <View style={s.recentRow}>
                      {recentEntries.map((e) => (
                        <TouchableOpacity key={e.id} style={s.recentChip} onPress={() => selectEntry(e)} activeOpacity={0.75}>
                          <ExGlyph kind={EXERCISE_GLYPHS[e.id] ?? 'medal'} size={14} color={Colors.textSecondary} />
                          <Text style={s.recentChipText}>{e.nameTr}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {addPhase === 'detail' && selectedEntry && (
              <>
                <View style={s.detailHero}>
                  <View style={[s.detailEmojiWrap, { backgroundColor: selectedEntry.color + '1A', borderColor: selectedEntry.color + '40' }]}>
                    <ExGlyph kind={EXERCISE_GLYPHS[selectedEntry.id] ?? 'medal'} size={36} color={selectedEntry.color} />
                  </View>
                </View>
                <Text style={[s.formLabel, { textAlign: 'center' }]}>SÜRE</Text>
                <DurationDial value={duration} onChange={setDuration} />
                <Text style={[s.formLabel, { marginTop: Spacing.lg }]}>YOĞUNLUK</Text>
                <View style={s.intensityRow}>
                  {(['low', 'moderate', 'high'] as ExerciseIntensity[]).map((key) => {
                    const info = INTENSITY_LABELS[key];
                    const active = intensity === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.intensityOption, active && { backgroundColor: info.color + '18', borderColor: info.color }]}
                        onPress={() => setIntensity(key)}
                        activeOpacity={0.7}
                      >
                        <ExGlyph kind={key === 'low' ? 'lotus' : key === 'moderate' ? 'flex' : 'fire'} size={18} color={info.color} />
                        <Text style={[s.intensityLabel, active && { color: info.color, fontWeight: '700' }]}>{info.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ height: engineOutput ? 200 : Spacing.xl }} />
              </>
            )}
            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          {addPhase === 'detail' && engineOutput && selectedEntry && (
            <View style={s.stickyBottom}>
              {engineOutput.chronoWarning && (
                <View style={s.chronoWarn}>
                  <Ionicons name="moon-outline" size={13} color="#F59E0B" />
                  <Text style={s.chronoWarnText}>Geç saatte egzersiz — insülin duyarlılığı riski</Text>
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
              {engineOutput.sourceNote ? <Text style={s.sourceNote}>{engineOutput.sourceNote}</Text> : null}
              <View style={s.saveBtnRow}>
                <TouchableOpacity style={s.breakdownBtn} onPress={() => setShowBreakdown(true)} activeOpacity={0.75}>
                  <Ionicons name="analytics-outline" size={16} color={Colors.primary} />
                  <Text style={s.breakdownBtnText}>Nasıl hesaplandı?</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>{saving ? 'Kaydediliyor…' : 'Günlüğe Ekle'}</Text>
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
            exerciseGlyph={EXERCISE_GLYPHS[selectedEntry.id] ?? 'medal'}
            durationMinutes={duration}
            intensity={intensity}
            engine={engineOutput}
            weightKg={weightKg}
            sex={sex}
          />
        )}
      </Modal>

      {/* ── HISTORY MODAL ── */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
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
            {!historyLoading && historyLogs.length === 0 && <Text style={s.emptyTitle}>Henüz egzersiz kaydı yok</Text>}
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

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, marginBottom: Spacing.sm },
  headerOverline: { fontFamily: MONO, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.4 },
  headerTitle: { fontFamily: SERIF, fontSize: 32, color: Colors.textPrimary, lineHeight: 38, marginTop: 2 },
  historyBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero row
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  heroStats: { flex: 1, gap: 6 },

  // EPOC row
  epocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  epocDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: Colors.accent },
  epocText: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.5, flex: 1 },
  epocBold: { fontFamily: MONO, fontSize: 9, color: Colors.textPrimary, fontWeight: '700', letterSpacing: 0.5 },
  epocRef: { fontFamily: MONO, fontSize: 9, color: Colors.textFaint, letterSpacing: 0.3 },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ink,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    marginBottom: Spacing.xl,
    gap: 10,
  },
  addBtnCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnLabel: {
    flex: 1, fontFamily: SERIF, fontSize: 18, color: Colors.background, letterSpacing: 0.2,
  },
  addBtnRight: {
    fontFamily: MONO, fontSize: 9, color: Colors.background + 'AA', letterSpacing: 1.2,
  },

  section: { marginBottom: Spacing.xl },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, lineHeight: 26 },
  kayitBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  kayitText: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.8 },

  // Bu Hafta section header
  weekHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  weekTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, lineHeight: 26 },
  weekSub: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 1.2, marginTop: 2 },
  weekLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 99 },
  legendLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.8 },

  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyTitle: { fontFamily: SERIF, fontSize: 18, color: Colors.textSecondary, marginBottom: 6 },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderColor: Colors.borderLight,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverline: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 1.6, textAlign: 'center' },
  modalTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, textAlign: 'center', lineHeight: 26 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  modalScroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  formLabel: {
    fontFamily: MONO, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.4,
    textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },

  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  recentChipText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },

  categoryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  categoryPill: {
    width: (SW - 48 - 16) / 3, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 9,
    borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  categoryPillActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  categoryPillLabel: { fontFamily: SERIF, fontSize: 12, color: Colors.textPrimary },
  categoryPillLabelActive: { color: Colors.background, fontStyle: 'italic' },

  exGridHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  exGridCount: { fontFamily: MONO, fontSize: 9, color: Colors.textFaint, letterSpacing: 0.8, marginTop: Spacing.md },

  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseTile: {
    width: (SW - 48 - 16) / 3, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: BorderRadius.md,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 8, minHeight: 96,
  },
  exerciseTileIcon: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  exerciseTileName: { fontFamily: SERIF, fontSize: 12, color: Colors.textPrimary, textAlign: 'center', lineHeight: 14 },
  metPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metText: { fontFamily: MONO, fontSize: 8, letterSpacing: 0.5 },

  detailHero: { alignItems: 'center', paddingVertical: Spacing.md },
  detailEmojiWrap: { width: 76, height: 76, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },

  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityOption: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: BorderRadius.md, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  intensityLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },

  stickyBottom: {
    backgroundColor: Colors.surface, borderTopWidth: 0.5, borderColor: Colors.borderLight,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  chronoWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, padding: 8, borderRadius: BorderRadius.sm, backgroundColor: '#FEF3C715' },
  chronoWarnText: { fontSize: FontSize.xs, color: '#92400E', flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontFamily: SERIF, fontSize: 20, color: Colors.textPrimary },
  summaryUnit: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.8 },
  summaryDivider: { width: 0.5, height: 28, backgroundColor: Colors.borderLight },
  sourceNote: { fontSize: 10, color: Colors.textFaint, textAlign: 'center', marginBottom: 10 },
  saveBtnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  breakdownBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: BorderRadius.full,
    borderWidth: 0.5, borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '0D', overflow: 'hidden',
  },
  breakdownBtnText: { fontSize: 11, color: Colors.primary, fontWeight: '600', flexShrink: 1 },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BorderRadius.full, backgroundColor: Colors.ink,
  },
  saveBtnText: { color: Colors.background, fontSize: FontSize.md, fontWeight: '700' },
});

// Week chart styles
const wc = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  statItem: { flex: 1 },
  statDivider: { width: 0.5, height: 34, backgroundColor: Colors.borderLight, marginHorizontal: 10 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  statNum: { fontFamily: SERIF, fontSize: 22, color: Colors.textPrimary, lineHeight: 26 },
  statUnit: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted },
  statLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.8 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, position: 'relative', paddingHorizontal: 14, paddingTop: 18, paddingBottom: 4 },
  avgLine: { position: 'absolute', left: 14, right: 14, height: 1, borderTopWidth: 0.5, borderColor: Colors.textFaint, borderStyle: 'dashed', zIndex: 1 },
  avgLineLabel: { position: 'absolute', right: 16, fontFamily: MONO, fontSize: 8, color: Colors.textFaint },
  dayCol: { alignItems: 'center', flex: 1, gap: 3 },
  barLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted },
  barBg: { width: '100%', backgroundColor: Colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  futureTick: { width: 8, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 2 },
  dayLabel: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted },
  dayLabelToday: { color: Colors.accent, fontWeight: '700' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent },

  insight: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: Colors.borderLight,
    backgroundColor: Colors.primary + '06',
  },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  insightText: { fontFamily: MONO, fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 0.5 },
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
    paddingVertical: 12,
    paddingRight: 12,
  },
  timeCol: { width: 44, alignItems: 'flex-end', paddingLeft: 12, paddingRight: 8 },
  timeHour: { fontFamily: SERIF, fontSize: 20, color: Colors.textPrimary, lineHeight: 22 },
  timeMin: { fontFamily: MONO, fontSize: 11, color: Colors.textMuted, lineHeight: 14 },
  sep: { width: 0.5, height: 42, backgroundColor: Colors.borderLight, marginRight: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: SERIF, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  meta: { fontFamily: MONO, fontSize: 9, color: Colors.textMuted, letterSpacing: 0.5 },
  epoc: { fontFamily: MONO, fontSize: 9, color: Colors.primary, letterSpacing: 0.4 },
  rightCol: { alignItems: 'center', gap: 2, minWidth: 44 },
  kcal: { fontFamily: SERIF, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  kcalUnit: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5 },
  deleteBtn: { marginTop: 4, padding: 3 },
});
