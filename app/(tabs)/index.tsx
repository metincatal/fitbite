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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, getMealTypes } from '../../lib/constants';
import { CalorieRing } from '../../components/charts/CalorieRing';
import { MacroBar } from '../../components/ui/MacroBar';
import { Card } from '../../components/ui/Card';
import { ActivitySection } from '../../components/dashboard/ActivitySection';
import { useActivityStore } from '../../store/activityStore';
import { useExerciseStore } from '../../store/exerciseStore';
import { usePedometer } from '../../hooks/usePedometer';
import { EXERCISE_CATEGORIES, INTENSITY_LABELS, ExerciseIntensity } from '../../lib/constants';

const WATER_GLASSES = [250, 250, 250, 250, 250, 250, 250, 250]; // 8 bardak = 2000ml

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { foodLogs, fetchDayLogs, getDailyTotals, getWaterTotal, addWaterLog, selectedDate } =
    useNutritionStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const userId = useAuthStore((s) => s.user?.id);
  const { todaySteps, stepGoal, caloriesBurned, distanceKm, activeMinutes, isAvailable, permissionGranted } =
    useActivityStore();
  const { todayExercises, fetchTodayExercises, getTotalCaloriesBurned } = useExerciseStore();
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
  const proteinGoal = profile?.daily_protein_goal ?? 100;
  const carbsGoal = profile?.daily_carbs_goal ?? 250;
  const fatGoal = profile?.daily_fat_goal ?? 65;
  const waterGoal = profile?.daily_water_goal_ml ?? 2000;
  const waterGlasses = Math.floor(waterTotal / 250);

  const todayFormatted = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Başlık */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Merhaba, {profile?.name?.split(' ')[0] ?? 'Kullanıcı'}
            </Text>
            <Text style={styles.date}>{todayFormatted}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Kalori Halkası */}
        <Card style={styles.calorieCard}>
          <Text style={styles.sectionTitle}>Günlük Kalori</Text>
          <View style={styles.calorieRow}>
            <CalorieRing consumed={totals.calories} goal={calorieGoal} size={160} />
            <View style={styles.calorieStats}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatValue}>{calorieGoal}</Text>
                <Text style={styles.calorieStatLabel}>Hedef</Text>
              </View>
              <View style={[styles.calorieStat, styles.calorieStatMiddle]}>
                <Text style={[styles.calorieStatValue, { color: Colors.accent }]}>
                  {Math.round(totals.calories)}
                </Text>
                <Text style={styles.calorieStatLabel}>Tüketilen</Text>
              </View>
              <View style={styles.calorieStat}>
                <Text style={[styles.calorieStatValue, { color: Colors.primaryLight }]}>
                  {Math.max(0, calorieGoal - Math.round(totals.calories))}
                </Text>
                <Text style={styles.calorieStatLabel}>Kalan</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Makro Bar'lar */}
        <Card style={styles.macroCard}>
          <Text style={styles.sectionTitle}>Makrolar</Text>
          <MacroBar
            label="Protein"
            current={totals.protein}
            goal={proteinGoal}
            color={Colors.protein}
          />
          <MacroBar
            label="Karbonhidrat"
            current={totals.carbs}
            goal={carbsGoal}
            color={Colors.carbs}
          />
          <MacroBar
            label="Yağ"
            current={totals.fat}
            goal={fatGoal}
            color={Colors.fat}
          />
        </Card>

        {/* Su Takibi */}
        <Card style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Text style={styles.sectionTitle}>Su Takibi 🫧</Text>
            <Text style={styles.waterAmount}>
              {(waterTotal / 1000).toFixed(1)}L / {(waterGoal / 1000).toFixed(1)}L
            </Text>
          </View>
          <View style={styles.glassesRow}>
            {WATER_GLASSES.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.glass, index < waterGlasses && styles.glassFilled]}
                onPress={() => {
                  if (userId && index >= waterGlasses) {
                    addWaterLog(userId, 250);
                  }
                }}
              >
                <Text style={styles.glassIcon}>
                  {index < waterGlasses ? '💧' : '🫗'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.waterHint}>
            {8 - waterGlasses > 0 ? `${8 - waterGlasses} bardak daha iç` : 'Günlük su hedefinize ulaştınız! 🎉'}
          </Text>
        </Card>

        {/* Egzersiz Özeti */}
        {todayExercises.length > 0 && (
          <Card style={styles.exerciseCard}>
            <View style={styles.exerciseTitleRow}>
              <Text style={styles.sectionTitle}>Bugünkü Egzersiz 🏋️</Text>
              <TouchableOpacity onPress={() => router.push('/exercise')}>
                <Text style={styles.seeAllText}>Tümünü gör</Text>
              </TouchableOpacity>
            </View>
            {todayExercises.slice(0, 3).map((ex) => {
              const cat = EXERCISE_CATEGORIES.find((c) => c.key === ex.exercise_type);
              const intInfo = INTENSITY_LABELS[ex.intensity as ExerciseIntensity] ?? INTENSITY_LABELS.moderate;
              return (
                <View key={ex.id} style={styles.exerciseRow}>
                  <View style={[styles.exerciseIconWrap, { backgroundColor: (cat?.color ?? '#6B7280') + '20' }]}>
                    <Text style={styles.exerciseEmoji}>{cat?.emoji ?? '🏅'}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                    <Text style={styles.exerciseMeta}>{ex.duration_minutes} dk · {intInfo.emoji} {intInfo.label}</Text>
                  </View>
                  <Text style={styles.exerciseCal}>{ex.calories_burned} kcal</Text>
                </View>
              );
            })}
            <View style={styles.exerciseTotalRow}>
              <Ionicons name="flame" size={16} color="#DC2626" />
              <Text style={styles.exerciseTotalText}>
                Toplam yakılan: {getTotalCaloriesBurned()} kcal
              </Text>
            </View>
          </Card>
        )}

        {/* Gunluk Aktivite */}
        <ActivitySection
          steps={todaySteps}
          stepGoal={stepGoal}
          caloriesBurned={caloriesBurned}
          distanceKm={distanceKm}
          activeMinutes={activeMinutes}
          isAvailable={isAvailable}
          permissionGranted={permissionGranted}
        />

        {/* Bugünkü Öğünler */}
        <View style={styles.mealsSection}>
          <View style={styles.mealsSectionHeader}>
            <Text style={styles.sectionTitle}>Bugünkü Öğünler</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/food-log')}>
              <Text style={styles.seeAllText}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          {getMealTypes(profile?.meal_count ?? 3).map(({ key, label }) => {
            const mealLogs = foodLogs.filter((l) => l.meal_type === key);
            const mealCalories = mealLogs.reduce((sum, l) => sum + l.calories, 0);
            const emoji = key === 'breakfast' ? '🥐' : key === 'lunch' ? '🥗' : key === 'dinner' ? '🍽️' : '🫐';
            return (
              <TouchableOpacity
                key={`${key}-${label}`}
                style={styles.mealRow}
                onPress={() => router.push('/(tabs)/food-log')}
              >
                <View style={styles.mealIcon}>
                  <Text style={styles.mealEmoji}>{emoji}</Text>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{label}</Text>
                  <Text style={styles.mealItems}>
                    {mealLogs.length > 0 ? `${mealLogs.length} öğe` : 'Henüz eklenmedi'}
                  </Text>
                </View>
                <Text style={styles.mealCalories}>
                  {mealCalories > 0 ? `${Math.round(mealCalories)} kcal` : '—'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hızlı Ekle Butonu */}
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => router.push('/(tabs)/food-log')}
        >
          <Text style={styles.quickAddIcon}>+</Text>
          <Text style={styles.quickAddText}>Yemek Ekle</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  macroCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  waterCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieStats: {
    flex: 1,
    paddingLeft: Spacing.lg,
    gap: Spacing.md,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieStatMiddle: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
  },
  calorieStatValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  calorieStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  waterAmount: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  glass: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFilled: {
    backgroundColor: Colors.primaryPale,
  },
  glassIcon: {
    fontSize: 18,
  },
  waterHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  mealsSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mealEmoji: {
    fontSize: 20,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mealItems: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  mealCalories: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  quickAddIcon: {
    fontSize: FontSize.xxl,
    color: Colors.textLight,
    fontWeight: '300',
    lineHeight: 28,
  },
  quickAddText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textLight,
  },
  exerciseCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  exerciseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  exerciseEmoji: {
    fontSize: 18,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exerciseMeta: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  exerciseCal: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#DC2626',
  },
  exerciseTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  exerciseTotalText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#DC2626',
  },
});
