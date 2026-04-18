import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  OCCUPATIONAL_ACTIVITIES,
  EXERCISE_FREQUENCIES,
} from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { OnboardingButton } from '../shared/OnboardingButton';
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroGoals,
  calculateBMI,
  evaluateSafety,
  calculateScoffScore,
  resolvePALForMetrics,
  AMDR,
  UserMetrics,
  SafetyBlocker,
  SafetyWarning,
} from '../../../lib/nutrition';
import { SAFETY_COPY } from '../../../lib/safetyCopy';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function ScientificPlanPreview({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  const computed = useMemo(() => {
    const age = data.birth_year ? new Date().getFullYear() - parseInt(data.birth_year) : 25;
    const height = parseFloat(data.height_cm) || 170;
    const weight = parseFloat(data.weight_kg) || 70;
    const gender = data.gender || 'male';
    const goal = data.goal || 'maintain';

    const metrics: UserMetrics = {
      gender,
      age,
      height_cm: height,
      weight_kg: weight,
      goal,
      activity_level: data.activity_level ?? 'moderate',
      occupational_activity: data.occupational_activity ?? undefined,
      exercise_frequency: data.exercise_frequency ?? undefined,
      body_fat_band: data.body_fat_band ?? undefined,
    };

    const bmr = calculateBMR(metrics);
    const tdee = calculateTDEE(metrics);
    const pal = resolvePALForMetrics(metrics);
    const macros = calculateMacroGoals(metrics, data.weekly_weight_goal_kg);
    const bmi = calculateBMI(weight, height);

    const scoffScore = calculateScoffScore(data.scoff_answers);
    const safety = evaluateSafety({
      bmi,
      scoff_score: scoffScore,
      medical_conditions: data.medical_conditions,
      weekly_goal_kg: data.weekly_weight_goal_kg,
      weight_kg: weight,
      amdr_flags: macros.amdr_flags,
    });

    const offset = macros.calories - tdee;

    return { metrics, bmr, tdee, pal, macros, bmi, safety, offset, weight };
  }, [
    data.birth_year,
    data.height_cm,
    data.weight_kg,
    data.gender,
    data.goal,
    data.activity_level,
    data.occupational_activity,
    data.exercise_frequency,
    data.body_fat_band,
    data.weekly_weight_goal_kg,
    data.scoff_answers,
    data.medical_conditions,
  ]);

  const { bmr, tdee, pal, macros, safety, offset } = computed;

  const canProceed = safety.canProceed;

  const handleConfirm = () => {
    if (!canProceed) {
      // Maintenance planına indir, haftalık hedefi sıfırla
      updateField('goal', 'maintain');
      updateField('weekly_weight_goal_kg', 0);
    }
    onNext();
  };

  const occLabel = data.occupational_activity
    ? OCCUPATIONAL_ACTIVITIES.find((o) => o.key === data.occupational_activity)?.label
    : null;
  const exLabel = data.exercise_frequency
    ? EXERCISE_FREQUENCIES.find((e) => e.key === data.exercise_frequency)?.label
    : null;

  const proteinPct = Math.round(((macros.protein_g * 4) / macros.calories) * 100);
  const carbsPct = Math.round(((macros.carbs_g * 4) / macros.calories) * 100);
  const fatPct = Math.round(((macros.fat_g * 9) / macros.calories) * 100);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <View style={styles.avatarBox}>
            <Ionicons name="sparkles" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.greeting}>
            {canProceed ? `Hazırsın, ${data.name || 'arkadaş'}! 🎉` : 'Seni daha iyi tanıdık.'}
          </Text>
          <Text style={styles.subtitle}>
            {canProceed
              ? 'Bilimsel temelli planın hazır:'
              : 'Sağlıklı bir başlangıç için planını dengeleme odaklı hazırladık.'}
          </Text>
        </Animated.View>

        {/* Safety — blocker varsa ÖNCE, warning varsa SONRA */}
        {(safety.blockers.length > 0 || safety.warnings.length > 0) && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.safetyBox}>
            <View style={styles.safetyHeader}>
              <Ionicons
                name={safety.blockers.length > 0 ? 'shield-checkmark' : 'alert-circle'}
                size={18}
                color={safety.blockers.length > 0 ? Colors.primary : Colors.warning}
              />
              <Text style={styles.safetyTitle}>Güvenlik kontrolleri</Text>
            </View>
            {safety.blockers.map((b) => (
              <SafetyRow key={b} flag={b} />
            ))}
            {safety.warnings.map((w) => (
              <SafetyRow key={w} flag={w} />
            ))}
          </Animated.View>
        )}

        {/* Hero kalori kartı */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.heroCard}>
          <Text style={styles.heroLabel}>Günlük kalori hedefin</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{macros.calories}</Text>
            <Text style={styles.heroUnit}>kcal</Text>
          </View>
          <Text style={styles.heroFormula}>
            {bmr.formula === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'} · BMR {bmr.value}{' '}
            kcal
          </Text>
        </Animated.View>

        {/* TDEE breakdown */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.breakdownCard}>
          <Text style={styles.sectionLabel}>Matematik</Text>
          <View style={styles.breakdownRow}>
            <Chip label={`BMR ${bmr.value}`} />
            <Text style={styles.operator}>×</Text>
            <Chip label={`PAL ${pal.multiplier.toFixed(2)}`} sub={occLabel && exLabel ? `${occLabel} + ${exLabel}` : 'Aktivite tahmini'} />
            <Text style={styles.operator}>=</Text>
            <Chip label={`TDEE ${tdee}`} variant="accent" />
          </View>
          <Text style={styles.offsetText}>
            {offset === 0
              ? 'Koruma planı — ne açık ne fazla.'
              : offset > 0
                ? `Hedef fazlası: +${offset} kcal/gün`
                : `Hedef açığı: ${offset} kcal/gün`}
          </Text>
        </Animated.View>

        {/* Makrolar */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.macroRow}>
          <MacroChip
            label="Protein"
            value={macros.protein_g}
            pct={proteinPct}
            color={Colors.protein}
            warn={macros.amdr_flags.protein_over_amdr}
            amdrRange={`${Math.round(AMDR.protein.min * 100)}–${Math.round(AMDR.protein.max * 100)}%`}
          />
          <MacroChip
            label="Karb"
            value={macros.carbs_g}
            pct={carbsPct}
            color={Colors.carbs}
            warn={macros.amdr_flags.carbs_under_amdr}
            amdrRange={`${Math.round(AMDR.carbs.min * 100)}–${Math.round(AMDR.carbs.max * 100)}%`}
          />
          <MacroChip
            label="Yağ"
            value={macros.fat_g}
            pct={fatPct}
            color={Colors.fat}
            warn={macros.amdr_flags.fat_over_amdr}
            amdrRange={`${Math.round(AMDR.fat.min * 100)}–${Math.round(AMDR.fat.max * 100)}%`}
          />
        </Animated.View>

        {/* Sirkadiyen pencere */}
        <Animated.View entering={FadeInDown.delay(550).duration(500)} style={styles.windowCard}>
          <View style={styles.windowHeader}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.sectionLabel}>Yemek pencerem</Text>
          </View>
          <EatingWindowBar first={data.first_meal_time} last={data.last_meal_time} />
          <Text style={styles.windowHint}>
            {data.first_meal_time}–{data.last_meal_time}. Son öğün uyku öncesi ≥ 3 saat ideal.
          </Text>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <OnboardingButton
          title={canProceed ? 'Planı Onayla ve Devam Et' : 'Dengeli Plan ile Başla'}
          onPress={handleConfirm}
          variant={canProceed ? 'primary' : 'secondary'}
        />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
      </View>
    </View>
  );
}

// ===== Yardımcı alt bileşenler =====

function SafetyRow({ flag }: { flag: SafetyBlocker | SafetyWarning }) {
  const copy = SAFETY_COPY[flag];
  const isBlocker = copy.tone === 'blocker';

  const openCta = () => {
    if (copy.ctaUrl) Linking.openURL(copy.ctaUrl).catch(() => {});
  };

  return (
    <View style={[styles.safetyRow, isBlocker ? styles.safetyRowBlocker : styles.safetyRowWarning]}>
      <Text style={styles.safetyEmoji}>{copy.emoji}</Text>
      <View style={styles.safetyBody}>
        <Text style={styles.safetyRowTitle}>{copy.title}</Text>
        <Text style={styles.safetyRowText}>{copy.body}</Text>
        {copy.ctaLabel && copy.ctaUrl && (
          <TouchableOpacity onPress={openCta} activeOpacity={0.7} style={styles.safetyCta}>
            <Text style={styles.safetyCtaText}>{copy.ctaLabel} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Chip({
  label,
  sub,
  variant = 'default',
}: {
  label: string;
  sub?: string | null;
  variant?: 'default' | 'accent';
}) {
  return (
    <View style={[chipStyles.chip, variant === 'accent' && chipStyles.chipAccent]}>
      <Text style={[chipStyles.label, variant === 'accent' && chipStyles.labelAccent]}>{label}</Text>
      {sub && <Text style={chipStyles.sub}>{sub}</Text>}
    </View>
  );
}

function MacroChip({
  label,
  value,
  pct,
  color,
  warn,
  amdrRange,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  warn: boolean;
  amdrRange: string;
}) {
  return (
    <View style={[macroStyles.card, warn && macroStyles.cardWarn]}>
      <View style={[macroStyles.dot, { backgroundColor: color }]} />
      <Text style={macroStyles.value}>{value}g</Text>
      <Text style={macroStyles.label}>{label}</Text>
      <View style={macroStyles.pctRow}>
        {warn ? (
          <Ionicons name="warning" size={11} color={Colors.warning} />
        ) : (
          <Ionicons name="checkmark-circle" size={11} color={Colors.primaryLight} />
        )}
        <Text style={[macroStyles.pct, warn && macroStyles.pctWarn]}>
          %{pct} · AMDR {amdrRange}
        </Text>
      </View>
    </View>
  );
}

function EatingWindowBar({ first, last }: { first: string; last: string }) {
  const startH = parseInt(first.split(':')[0]) || 8;
  const endH = parseInt(last.split(':')[0]) || 20;
  const leftPct = (startH / 24) * 100;
  const widthPct = ((endH - startH) / 24) * 100;

  return (
    <View style={windowStyles.track}>
      <View
        style={[
          windowStyles.window,
          { left: `${leftPct}%`, width: `${Math.max(widthPct, 5)}%` },
        ]}
      />
      <View style={[windowStyles.tick, { left: '25%' }]} />
      <View style={[windowStyles.tick, { left: '50%' }]} />
      <View style={[windowStyles.tick, { left: '75%' }]} />
    </View>
  );
}

// ===== Styles =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    marginTop: Spacing.xs,
    lineHeight: FontSize.md * 1.4,
  },

  // Hero
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textLight + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroValue: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.textLight,
  },
  heroUnit: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textLight + 'CC',
  },
  heroFormula: {
    fontSize: FontSize.sm,
    color: Colors.textLight + 'AA',
    marginTop: Spacing.xs,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  operator: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
  offsetText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Macros
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Window
  windowCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  windowHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Safety
  safetyBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  safetyTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  safetyRowBlocker: {
    backgroundColor: Colors.primaryPale + '50',
  },
  safetyRowWarning: {
    backgroundColor: Colors.accentLight + '30',
  },
  safetyEmoji: { fontSize: 20 },
  safetyBody: { flex: 1 },
  safetyRowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  safetyRowText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: FontSize.xs * 1.5,
  },
  safetyCta: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  safetyCtaText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Footer
  footer: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  chipAccent: {
    backgroundColor: Colors.primaryPale,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  labelAccent: {
    color: Colors.primaryDark,
  },
  sub: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 1,
  },
});

const macroStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardWarn: {
    borderColor: Colors.warning,
    backgroundColor: Colors.accentLight + '20',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.xs,
  },
  pct: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  pctWarn: {
    color: Colors.warning,
  },
});

const windowStyles = StyleSheet.create({
  track: {
    height: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.border,
  },
});
