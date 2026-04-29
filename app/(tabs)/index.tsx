import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { isChronoWindow } from '../../lib/exerciseEngine';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { foodLogs, fetchDayLogs, getDailyTotals, getWaterTotal, addWaterLog, selectedDate } =
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
  const waterGlasses = Math.floor(waterTotal / 250);
  const waterGoalGlasses = Math.round(waterGoal / 250);

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
            meals={mealTotals}
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
              if (userId && waterGlasses < waterGoalGlasses) addWaterLog(userId, 250);
            }}
            activeOpacity={0.8}
          >
            <Tide glasses={waterGlasses} goal={waterGoalGlasses} width={340} height={86} />
          </TouchableOpacity>
          <Text style={styles.tideHint}>
            {waterGlasses < waterGoalGlasses
              ? `Dokun → +1 bardak (${waterGoalGlasses - waterGlasses} kaldı)`
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
              <View>
                <Text style={styles.stepsCount}>{todaySteps.toLocaleString('tr-TR')}</Text>
                <Text style={styles.stepsMeta}>ADIM · %{Math.round(stepPct * 100)}</Text>
              </View>
              <View style={styles.stepsBarWrap}>
                <View style={styles.stepsBarBg}>
                  <View style={[styles.stepsBarFill, { width: `${Math.round(stepPct * 100)}%` }]} />
                </View>
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

        {/* ── EXERCISE CARD + BUFFER BANNER ── */}
        {todayExercises.length > 0 && (
          <View style={styles.exerciseSection}>
            <Text style={styles.overline}>EGZERSİZ</Text>

            {/* Buffer banner */}
            {exerciseBurned > 0 && (
              <View style={styles.bufferBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bufferTitle}>🔥 {exerciseBurned} kcal yakıldı</Text>
                  <Text style={styles.bufferSub}>
                    +{exerciseEatBack} kcal tampon{goal === 'lose' ? ' (%50 güvenli pay)' : ''}
                    {'  '}⚡ EPOC: +{exerciseEpocRange[0]}–{exerciseEpocRange[1]} kcal
                  </Text>
                  {exerciseChronoWarning && (
                    <Text style={styles.bufferChrono}>
                      ⚠️ Geç saatte egzersiz — insülin duyarlılığı riski
                    </Text>
                  )}
                </View>
                {exerciseWaterBonus > 0 && (
                  <View style={styles.bufferWater}>
                    <Text style={styles.bufferWaterNum}>+{exerciseWaterBonus}</Text>
                    <Text style={styles.bufferWaterUnit}>ml su</Text>
                  </View>
                )}
              </View>
            )}

            {todayExercises.slice(0, 3).map((ex) => {
              const cat = EXERCISE_CATALOG.find((c) => c.id === ex.exercise_type);
              const intInfo = INTENSITY_LABELS[ex.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
              return (
                <View key={ex.id} style={styles.exerciseRow}>
                  <Text style={styles.exerciseEmoji}>{cat?.emoji ?? '🏅'}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                    <Text style={styles.exerciseMeta}>{ex.duration_minutes} dk · {intInfo.label}</Text>
                  </View>
                  <Text style={styles.exerciseCal}>{ex.calories_burned} kcal</Text>
                </View>
              );
            })}
          </View>
        )}

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
  tideHint: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 6,
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
  stepsBarWrap: {
    flex: 1,
    paddingBottom: 4,
  },
  stepsBarBg: {
    height: 4,
    backgroundColor: Colors.line,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  stepsBarFill: {
    height: 4,
    backgroundColor: Colors.ink,
    borderRadius: BorderRadius.full,
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

  // Exercise
  exerciseSection: {
    paddingHorizontal: 22,
    paddingTop: 26,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.line,
    gap: Spacing.sm,
  },
  exerciseEmoji: {
    fontSize: 20,
    width: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    color: Colors.ink,
    fontFamily: 'Georgia, serif',
  },
  exerciseMeta: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 2,
  },
  exerciseCal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.terracotta,
    fontFamily: 'Menlo, Courier, monospace',
  },
  bufferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '0E',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  bufferTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  bufferSub: {
    fontSize: 11,
    color: Colors.ink3,
    lineHeight: 16,
  },
  bufferChrono: {
    fontSize: 10,
    color: Colors.terracotta,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bufferWater: {
    alignItems: 'center',
    paddingLeft: Spacing.md,
  },
  bufferWaterNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
  },
  bufferWaterUnit: {
    fontSize: 10,
    color: Colors.ink3,
  },
});
