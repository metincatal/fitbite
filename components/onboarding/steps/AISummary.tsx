import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, ACTIVITY_LEVELS } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { OnboardingButton } from '../shared/OnboardingButton';
import { calculateBMR, calculateTDEE, calculateDailyCalorieGoal, calculateMacroGoals, calculateBMI, getBMICategory } from '../../../lib/nutrition';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    anim.addListener(({ value }) => setDisplay(Math.round(value)));
    RNAnimated.timing(anim, {
      toValue: target,
      duration,
      useNativeDriver: false,
    }).start();
    return () => anim.removeAllListeners();
  }, [target]);

  return <Text style={countStyles.text}>{display}</Text>;
}

const countStyles = StyleSheet.create({
  text: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});

export function AISummary({ onNext, onBack }: Props) {
  const { data } = useOnboardingData();

  const age = data.birth_year ? new Date().getFullYear() - parseInt(data.birth_year) : 25;
  const height = parseFloat(data.height_cm) || 170;
  const weight = parseFloat(data.weight_kg) || 70;
  const targetWeight = parseFloat(data.target_weight_kg) || weight;

  const metrics = {
    gender: data.gender || 'male',
    age,
    height_cm: height,
    weight_kg: weight,
    activity_level: data.activity_level || 'moderate',
    goal: data.goal || 'lose',
  } as const;

  const bmr = Math.round(calculateBMR(metrics));
  const tdee = calculateTDEE(metrics);
  const macros = calculateMacroGoals(metrics);
  const bmi = calculateBMI(weight, height);
  const bmiCategory = getBMICategory(bmi);

  const weeklyGoal = data.weekly_weight_goal_kg;
  const diff = Math.abs(targetWeight - weight);
  const estimatedWeeks = weeklyGoal > 0 ? Math.ceil(diff / weeklyGoal) : null;

  const activityLabel = data.activity_level
    ? ACTIVITY_LEVELS[data.activity_level].label
    : 'Orta aktif';

  const macroItems = [
    { label: 'Protein', value: macros.protein_g, unit: 'g', color: Colors.protein },
    { label: 'Karbonhidrat', value: macros.carbs_g, unit: 'g', color: Colors.carbs },
    { label: 'Yağ', value: macros.fat_g, unit: 'g', color: Colors.fat },
  ];

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
        <View style={styles.avatarBox}>
          <Ionicons name="leaf" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.greeting}>
          Harika, {data.name || 'arkadaş'}! 🎉
        </Text>
        <Text style={styles.subtitle}>
          FitBot profilini oluşturdu. İşte sana özel analiz:
        </Text>
      </Animated.View>

      <View style={styles.content}>
        {/* Kalori kartı */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>Günlük Kalori Hedefiniz</Text>
          <View style={styles.mainCardValue}>
            <CountUp target={macros.calories} duration={1200} />
            <Text style={styles.mainCardUnit}> kcal</Text>
          </View>
          <Text style={styles.mainCardSub}>
            BMR: {bmr} kcal  ·  TDEE: {tdee} kcal
          </Text>
          <Text style={styles.mainCardSub}>Aktivite: {activityLabel}</Text>
        </Animated.View>

        {/* Makro satırı */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.macroRow}>
          {macroItems.map((m) => (
            <View key={m.label} style={styles.macroCard}>
              <View style={[styles.macroDot, { backgroundColor: m.color }]} />
              <Text style={styles.macroValue}>{m.value}g</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bilgi satırı */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{bmi}</Text>
            <Text style={styles.infoLabel}>BMI</Text>
            <Text style={styles.infoSub}>{bmiCategory}</Text>
          </View>
          {estimatedWeeks && (
            <View style={styles.infoCard}>
              <Text style={styles.infoValue}>~{estimatedWeeks}</Text>
              <Text style={styles.infoLabel}>Hafta</Text>
              <Text style={styles.infoSub}>Hedefe tahmini süre</Text>
            </View>
          )}
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{data.meal_count}</Text>
            <Text style={styles.infoLabel}>Öğün/gün</Text>
            <Text style={styles.infoSub}>{data.first_meal_time}–{data.last_meal_time}</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(800).duration(400)} style={styles.footer}>
        <OnboardingButton title="Mükemmel, devam! →" onPress={onNext} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryPale + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  content: { flex: 1, gap: Spacing.md },
  mainCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  mainCardLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textLight + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  mainCardValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainCardUnit: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textLight,
  },
  mainCardSub: {
    fontSize: FontSize.sm,
    color: Colors.textLight + 'AA',
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.sm,
  },
  macroValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoSub: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  footer: { gap: Spacing.sm, paddingTop: Spacing.md },
});
