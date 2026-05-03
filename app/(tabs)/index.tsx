import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, G, Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, BorderRadius, getMealTypes } from '../../lib/constants';
import { DayPlate } from '../../components/charts/DayPlate';
import { MacroOrbit } from '../../components/charts/MacroOrbit';
import { Tide } from '../../components/charts/Tide';
import { useActivityStore } from '../../store/activityStore';
import { useExerciseStore } from '../../store/exerciseStore';
import { usePedometer } from '../../hooks/usePedometer';
import { EXERCISE_CATALOG, INTENSITY_LABELS, ExerciseIntensity } from '../../lib/constants';
import { ExGlyph, EXERCISE_GLYPHS } from '../../components/exercise/ExGlyph';
import { isChronoWindow } from '../../lib/exerciseEngine';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseLog } from '../../types';

const { width: SW } = Dimensions.get('window');
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

// ── Mini pulse trace for dashboard ──────────────────────────────────────────
function MiniPulse({ exercises }: { exercises: ExerciseLog[] }) {
  const W = SW - 48 - 32; // card padding
  const H = 32;
  const mid = H / 2;
  let d = `M 0 ${mid}`;

  if (exercises.length === 0) {
    for (let x = 0; x <= W; x += 6) {
      d += ` L ${x} ${mid + Math.sin((x / W) * Math.PI * 2) * 3}`;
    }
  } else {
    const maxKcal = Math.max(...exercises.map((e) => e.calories_burned), 1);
    exercises.forEach((ex, i) => {
      const cx = (i + 0.5) * (W / exercises.length);
      const spikeH = Math.min(mid - 3, 5 + (ex.calories_burned / maxKcal) * (mid - 8));
      d += ` L ${cx - 12} ${mid}`;
      d += ` L ${cx - 5} ${mid}`;
      d += ` L ${cx - 3} ${mid - spikeH}`;
      d += ` L ${cx} ${mid + spikeH * 0.28}`;
      d += ` L ${cx + 3} ${mid - spikeH * 0.12}`;
      d += ` L ${cx + 7} ${mid}`;
    });
    d += ` L ${W} ${mid}`;
  }

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="miniPulse" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.3} />
          <Stop offset="0.5" stopColor={Colors.accent} stopOpacity={0.9} />
          <Stop offset="1" stopColor={Colors.primary} stopOpacity={0.3} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill="none" stroke="url(#miniPulse)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Typical daily activity distribution across hours 0-23
const HOUR_WEIGHTS = [
  0, 0, 0, 0, 0, 0.01, 0.03, 0.07, 0.08, 0.07, 0.06, 0.07,
  0.08, 0.07, 0.06, 0.07, 0.08, 0.09, 0.08, 0.06, 0.04, 0.02, 0.01, 0,
];
const SHOW_FROM = 5;
const SHOW_TO   = 22; // günün sonuna kadar sabit aralık
const BAR_HOURS = Array.from({ length: SHOW_TO - SHOW_FROM + 1 }, (_, i) => i + SHOW_FROM);

function StepHorizonChart({ totalSteps, stepGoal }: { totalSteps: number; stepGoal: number }) {
  const currentHour    = new Date().getHours();
  const pastWeightSum  = HOUR_WEIGHTS.slice(0, Math.min(currentHour + 1, 24)).reduce((s, w) => s + w, 0);

  const hourlySteps = HOUR_WEIGHTS.map((w, h) => {
    if (h > currentHour || pastWeightSum === 0) return 0;
    return Math.round(totalSteps * w / pastWeightSum);
  });

  const maxBar  = Math.max(...BAR_HOURS.map((h) => hourlySteps[h]), 1);
  // Hedefin %5'ini minimum referans al → çubuklar asla tam yüksekliğe ulaşmadan "büyüme" hissi vermez
  const maxRef  = Math.max(maxBar, stepGoal * 0.05, 1);
  const BAR_H   = 52;
  // stepsSection: pH 22*2=44 | stepsNumCol: 100 | gap: 16
  const chartW  = SW - 44 - 100 - 16;
  const n       = BAR_HOURS.length;
  const gap     = 2;
  const barW    = Math.max(4, (chartW - (n - 1) * gap) / n);

  return (
    <Svg width={chartW} height={BAR_H + 14}>
      {BAR_HOURS.map((hour, i) => {
        const steps   = hourlySteps[hour];
        const filled  = steps > 0;
        const barH    = filled ? Math.max(3, (steps / maxRef) * BAR_H) : 2;
        const x       = i * (barW + gap);
        const isNow   = hour === currentHour;
        const showLbl = hour === 6 || hour === 12 || hour === 18 || hour === 22;

        return (
          <G key={hour}>
            <Rect
              x={x}
              y={BAR_H - barH}
              width={barW}
              height={barH}
              fill={filled ? Colors.ink : Colors.line}
              rx={1.5}
              opacity={filled ? 1 : 0.45}
            />
            {isNow && (
              <SvgLine
                x1={x + barW / 2} y1={0}
                x2={x + barW / 2} y2={BAR_H + 5}
                stroke={Colors.accent}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}
            {showLbl && (
              <SvgText
                x={x + barW / 2}
                y={BAR_H + 13}
                textAnchor="middle"
                fontSize={8}
                fill={Colors.ink4}
                fontFamily="Menlo, Courier, monospace"
              >
                {String(hour).padStart(2, '0')}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { foodLogs, waterLogs, fetchDayLogs, getDailyTotals, getWaterTotal, addWaterLog, selectedDate } =
    useNutritionStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const userId = useAuthStore((s) => s.user?.id);
  const { todaySteps, stepGoal, caloriesBurned, distanceKm, activeMinutes, isAvailable, permissionGranted } =
    useActivityStore();
  const {
    todayExercises, fetchTodayExercises,
    getTotalCaloriesBurned, getEpocRange, getWaterBonus, getEatBackBudget,
  } = useExerciseStore();
  usePedometer(userId, profile?.weight_kg, profile?.height_cm);


  useEffect(() => {
    if (userId) {
      fetchDayLogs(userId, selectedDate);
      fetchTodayExercises(userId, selectedDate);
    }
  }, [userId, selectedDate]);

  async function onRefresh() {
    setRefreshing(true);
    if (userId) {
      await fetchDayLogs(userId, selectedDate);
      await fetchTodayExercises(userId, selectedDate);
    }
    setRefreshing(false);
  }

  const totals = getDailyTotals();
  const waterTotal = getWaterTotal();
  const calorieGoal = profile?.daily_calorie_goal ?? 2000;
  const proteinGoal = profile?.daily_protein_goal ?? 120;
  const carbsGoal = profile?.daily_carbs_goal ?? 240;
  const fatGoal = profile?.daily_fat_goal ?? 70;
  const waterGoal = profile?.daily_water_goal_ml ?? 2000;

  const todayFormatted = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const firstName = profile?.name?.split(' ')[0] ?? 'Kullanıcı';

  // Compute per-meal kcal totals
  const mealTotals = {
    breakfast: { kcal: foodLogs.filter((l) => l.meal_type === 'breakfast').reduce((s, l) => s + l.calories, 0) },
    lunch:     { kcal: foodLogs.filter((l) => l.meal_type === 'lunch').reduce((s, l) => s + l.calories, 0) },
    dinner:    { kcal: foodLogs.filter((l) => l.meal_type === 'dinner').reduce((s, l) => s + l.calories, 0) },
    snack:     { kcal: foodLogs.filter((l) => l.meal_type === 'snack').reduce((s, l) => s + l.calories, 0) },
  };

  const consumed = Math.round(totals.calories);
  const remaining = Math.max(0, calorieGoal - consumed);

  // Egzersiz tamponu
  const goal = profile?.goal ?? 'maintain';
  const exerciseBurned = getTotalCaloriesBurned();
  const exerciseEpocRange = getEpocRange();
  const exerciseWaterBonus = getWaterBonus();
  const exerciseEatBack = getEatBackBudget(goal);
  const exerciseChronoWarning = todayExercises.length > 0 && isChronoWindow();

  const mealLabels: Record<string, string> = {
    breakfast: 'Kahvaltı',
    lunch: 'Öğle',
    dinner: 'Akşam',
    snack: 'Atıştırmalık',
  };

  const mealColors: Record<string, string> = {
    breakfast: Colors.carbs,
    lunch: Colors.primary,
    snack: Colors.protein,
    dinner: Colors.fat,
  };

  // Step percentage
  const stepPct = stepGoal > 0 ? Math.min(1, todaySteps / stepGoal) : 0;
  const stepRemaining = Math.max(0, stepGoal - todaySteps);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.dateOverline}>{todayFormatted}</Text>
          <Text style={styles.greeting}>
            {'Günaydın, '}
            <Text style={styles.greetingAccent}>{firstName}</Text>
            {'.'}
          </Text>
          <Text style={styles.subtext}>
            {remaining > 0
              ? `Bugün ${remaining} kcal daha alabilirsin.`
              : 'Günlük kalori hedefine ulaştın!'}
          </Text>
        </View>

        {/* ── THE DAY PLATE + MACRO ORBIT ── */}
        <View style={styles.plateRow}>
          <DayPlate
            consumed={consumed}
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
            goal={calorieGoal}
            size={270}
          />
          <View style={styles.orbitCol}>
            <MacroOrbit
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
              proteinGoal={proteinGoal}
              carbsGoal={carbsGoal}
              fatGoal={fatGoal}
              size={110}
            />
            <Text style={styles.orbitLabel}>MAKRO{'\n'}YÖRÜNGESİ</Text>
          </View>
        </View>

        {/* ── MEAL CHIPS ── */}
        <View style={styles.chips}>
          {(Object.entries(mealTotals) as [string, { kcal: number }][]).map(([key, m]) => {
            const hasData = m.kcal > 0;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, !hasData && styles.chipEmpty]}
                onPress={() => router.push('/(tabs)/food-log')}
              >
                <View style={[styles.chipDot, { backgroundColor: hasData ? mealColors[key] : 'transparent', borderColor: mealColors[key] }]} />
                <Text style={[styles.chipLabel, !hasData && styles.chipLabelEmpty]}>
                  {mealLabels[key]}
                </Text>
                {hasData && <Text style={styles.chipKcal}>{Math.round(m.kcal)}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TIDE (water) ── */}
        <View style={styles.tideWrap}>
          <TouchableOpacity
            onPress={() => {
              if (userId && waterTotal < waterGoal + exerciseWaterBonus) {
                addWaterLog(userId, 250);
              }
            }}
            activeOpacity={0.8}
          >
            <Tide
              waterMl={waterTotal}
              goalMl={waterGoal}
              bonusMl={exerciseWaterBonus}
              waterLogs={waterLogs}
              width={340}
              height={86}
            />
          </TouchableOpacity>
          {/* Recent log chips */}
          {waterLogs.length > 0 && (
            <View style={styles.tideLogRow}>
              {waterLogs.slice(-4).map((log, i) => (
                <View key={log.id ?? i} style={styles.tideLogChip}>
                  <Text style={styles.tideLogChipText}>
                    {log.logged_at?.substring(11, 16) ?? ''} · {log.amount_ml}ml
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.tideHint}>
            {waterTotal < waterGoal + exerciseWaterBonus
              ? `Dokun → +250 ml · ${waterGoal + exerciseWaterBonus - waterTotal} ml kaldı`
              : 'Su hedefine ulaştın!'}
          </Text>
        </View>

        {/* ── STEPS HORIZON ── */}
        {(isAvailable || todaySteps > 0) && (
          <View style={styles.stepsSection}>
            <View style={styles.stepsHeader}>
              <Text style={styles.overline}>AYAK İZLERİ</Text>
              <Text style={styles.overline}>HEDEF {stepGoal.toLocaleString('tr-TR')}</Text>
            </View>
            <View style={styles.stepsRow}>
              <View style={styles.stepsNumCol}>
                <Text style={styles.stepsCount}>{todaySteps.toLocaleString('tr-TR')}</Text>
                <Text style={styles.stepsMeta}>ADIM · %{Math.round(stepPct * 100)}</Text>
              </View>
              <View style={styles.stepsChartCol}>
                <StepHorizonChart totalSteps={todaySteps} stepGoal={stepGoal} />
              </View>
            </View>
            <Text style={styles.stepsFootnote}>
              <Text style={styles.footnoteBold}>{distanceKm.toFixed(1)}</Text>
              {' km yüründü · '}
              {stepRemaining > 0 && (
                <>
                  {stepRemaining.toLocaleString('tr-TR')}
                  {' adım kaldı — '}
                  <Text style={styles.footnoteAccent}>kısa bir yürüyüş yeter</Text>
                </>
              )}
              {stepRemaining === 0 && <Text style={styles.footnoteAccent}>hedef tamamlandı!</Text>}
            </Text>
          </View>
        )}

        {/* ── MEAL RAIL ── */}
        <View style={styles.mealSection}>
          <Text style={styles.overline}>BUGÜNÜN ISIRIKLARI</Text>
          <View style={styles.railWrap}>
            <View style={styles.railLine} />
            {getMealTypes(profile?.meal_count ?? 3).map(({ key, label }) => {
              const logs = foodLogs.filter((l) => l.meal_type === key);
              const kcal = logs.reduce((s, l) => s + l.calories, 0);
              const hasData = logs.length > 0;
              const timeDisplay = hasData ? logs[0]?.logged_at?.substring(11, 16) ?? '' : '—';

              return (
                <TouchableOpacity
                  key={`${key}-${label}`}
                  style={styles.railRow}
                  onPress={() => router.push('/(tabs)/food-log')}
                >
                  <View style={[styles.railDot, hasData && styles.railDotFilled]}>
                    <Text style={[styles.railDotText, hasData && styles.railDotTextFilled]}>
                      {hasData ? timeDisplay.split(':')[0] : '—'}
                    </Text>
                  </View>
                  <View style={styles.railContent}>
                    <View style={styles.railTitleRow}>
                      <Text style={[styles.railName, !hasData && styles.railNameEmpty]}>
                        {hasData
                          ? logs.map((l) => l.food.name_tr || l.food.name).slice(0, 2).join(' · ')
                          : `${label} · henüz eklenmedi`}
                      </Text>
                      {hasData && (
                        <Text style={styles.railKcal}>{Math.round(kcal)} kcal</Text>
                      )}
                    </View>
                    {hasData && logs.length > 2 && (
                      <Text style={styles.railSub}>+{logs.length - 2} öğe daha</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── EXERCISE DASH CARD (ExerciseDashCard) ── */}
        <TouchableOpacity
          style={styles.exDashCard}
          onPress={() => router.push('/(tabs)/exercise')}
          activeOpacity={0.88}
        >
          {/* Stamp + header */}
          <View style={styles.exDashTop}>
            <View>
              <Text style={styles.exDashStamp}>NABZIN · BUGÜN</Text>
              <Text style={styles.exDashTitle}>
                {todayExercises.length === 0
                  ? <Text>Henüz <Text style={{ color: Colors.accent, fontStyle: 'italic' }}>egzersiz</Text> yok</Text>
                  : <Text>{todayExercises.length} spike · <Text style={{ color: Colors.accent }}>{exerciseBurned}</Text> kcal</Text>
                }
              </Text>
            </View>
            <View style={styles.exDashChevron}>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </View>
          </View>

          {/* Mini pulse trace */}
          <View style={styles.exDashPulse}>
            <MiniPulse exercises={todayExercises} />
          </View>

          {/* 3 mini-stats */}
          <View style={styles.exDashStats}>
            {[
              { label: 'DAKİKA', val: `${todayExercises.reduce((s, e) => s + e.duration_minutes, 0)}` },
              { label: 'ML SU', val: `+${exerciseWaterBonus}` },
              { label: 'KCAL', val: `${exerciseBurned}` },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <View style={styles.exDashStatDiv} />}
                <View style={styles.exDashStatItem}>
                  <Text style={styles.exDashStatNum}>{item.val}</Text>
                  <Text style={styles.exDashStatLabel}>{item.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Latest exercise badge */}
          {todayExercises.length > 0 && (() => {
            const last = todayExercises[todayExercises.length - 1];
            const cat = EXERCISE_CATALOG.find((c) => c.id === last.exercise_type);
            return (
              <View style={styles.exDashBadge}>
                <View style={styles.exDashBadgeIcon}>
                  <ExGlyph
                    kind={EXERCISE_GLYPHS[last.exercise_type] ?? 'medal'}
                    size={18}
                    color={cat?.color ?? Colors.primary}
                    strokeWidth={1.5}
                  />
                </View>
                <Text style={styles.exDashBadgeName}>{last.exercise_name}</Text>
                <Text style={styles.exDashBadgeMeta}>{last.duration_minutes} dk</Text>
              </View>
            );
          })()}

          {/* Buffer note */}
          {exerciseEatBack > 0 && (
            <View style={styles.exDashBuffer}>
              <Text style={styles.exDashBufferText}>
                +{exerciseEatBack} kcal tampon eklendi
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dateOverline: {
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 1.6,
    fontFamily: 'Menlo, Courier, monospace',
  },
  greeting: {
    fontSize: 36,
    lineHeight: 40,
    color: Colors.ink,
    fontFamily: 'Georgia, serif',
    marginTop: 4,
  },
  greetingAccent: {
    color: Colors.terracotta,
    fontStyle: 'italic',
    fontFamily: 'Georgia, serif',
  },
  subtext: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 6,
    lineHeight: 18,
  },

  // Plate + orbit row
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  orbitCol: {
    alignItems: 'center',
    position: 'absolute',
    right: 14,
    top: 0,
  },
  orbitLabel: {
    fontSize: 8,
    color: Colors.ink3,
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: -6,
    fontFamily: 'Menlo, Courier, monospace',
  },

  // Meal chips
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 22,
    gap: 6,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.line,
  },
  chipEmpty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 11,
    color: Colors.ink2,
  },
  chipLabelEmpty: {
    color: Colors.ink4,
  },
  chipKcal: {
    fontSize: 10,
    color: Colors.ink3,
    fontFamily: 'Menlo, Courier, monospace',
  },

  // Tide
  tideWrap: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 4,
    alignItems: 'center',
  },
  tideLogRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    marginTop: 6,
  },
  tideLogChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: Colors.sky + '28',
    borderWidth: 0.5,
    borderColor: Colors.sky + '60',
  },
  tideLogChipText: {
    fontSize: 10,
    color: Colors.ink3,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
    letterSpacing: 0.3,
  },
  tideHint: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 5,
    textAlign: 'center',
  },

  // Steps
  stepsSection: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overline: {
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 1.6,
    fontFamily: 'Menlo, Courier, monospace',
    textTransform: 'uppercase',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  stepsCount: {
    fontSize: 32,
    lineHeight: 36,
    color: Colors.ink,
    fontFamily: 'Georgia, serif',
    letterSpacing: -0.5,
  },
  stepsMeta: {
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.4,
    marginTop: 4,
    fontFamily: 'Menlo, Courier, monospace',
  },
  stepsNumCol: {
    width: 100,
    paddingBottom: 2,
  },
  stepsChartCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stepsFootnote: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 10,
  },
  footnoteBold: {
    color: Colors.ink2,
    fontFamily: 'Menlo, Courier, monospace',
  },
  footnoteAccent: {
    color: Colors.terracotta,
    fontStyle: 'italic',
  },

  // Meal rail
  mealSection: {
    paddingHorizontal: 22,
    paddingTop: 26,
  },
  railWrap: {
    position: 'relative',
    marginTop: 12,
  },
  railLine: {
    position: 'absolute',
    left: 18,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: Colors.line,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  railDot: {
    width: 37,
    height: 37,
    borderRadius: 99,
    flexShrink: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotFilled: {
    backgroundColor: Colors.ink,
    borderWidth: 0,
  },
  railDotText: {
    fontSize: 14,
    color: Colors.ink4,
    fontFamily: 'Georgia, serif',
  },
  railDotTextFilled: {
    color: Colors.surface,
  },
  railContent: {
    flex: 1,
    paddingTop: 2,
  },
  railTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  railName: {
    fontSize: 18,
    color: Colors.ink,
    fontFamily: 'Georgia, serif',
    flex: 1,
  },
  railNameEmpty: {
    color: Colors.ink4,
  },
  railKcal: {
    fontSize: 11,
    color: Colors.ink3,
    fontFamily: 'Menlo, Courier, monospace',
  },
  railSub: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 2,
  },

  // ExerciseDashCard
  exDashCard: {
    marginHorizontal: 22,
    marginTop: 22,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 4,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    padding: Spacing.md,
  },
  exDashTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exDashStamp: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  exDashTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  exDashChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exDashPulse: {
    marginVertical: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.borderLight,
    paddingVertical: 4,
  },
  exDashStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    marginTop: 8,
  },
  exDashStatItem: { flex: 1, alignItems: 'center' },
  exDashStatDiv: { width: 0.5, height: 24, backgroundColor: Colors.borderLight },
  exDashStatNum: { fontFamily: SERIF, fontSize: 18, color: Colors.textPrimary },
  exDashStatLabel: { fontFamily: MONO, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.8, marginTop: 2 },
  exDashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  exDashBadgeIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  exDashBadgeName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  exDashBadgeMeta: { fontFamily: MONO, fontSize: 10, color: Colors.textMuted },
  exDashBuffer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: Colors.primary + '20',
  },
  exDashBufferText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: MONO,
  },
});
