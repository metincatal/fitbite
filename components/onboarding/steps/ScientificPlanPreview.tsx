// Onboarding 22–25 — Scientific Plan Preview
// Big calorie banner, math row, macro bar, eating window, safety checks.

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import {
  OnbColors, OnbShell, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import {
  OCCUPATIONAL_ACTIVITIES,
  EXERCISE_FREQUENCIES,
} from '../../../lib/constants';
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
    data.birth_year, data.height_cm, data.weight_kg, data.gender, data.goal,
    data.activity_level, data.occupational_activity, data.exercise_frequency,
    data.body_fat_band, data.weekly_weight_goal_kg, data.scoff_answers, data.medical_conditions,
  ]);

  const { bmr, tdee, pal, macros, safety, offset } = computed;
  const canProceed = safety.canProceed;

  const proteinPct = Math.round(((macros.protein_g * 4) / macros.calories) * 100);
  const carbsPct   = Math.round(((macros.carbs_g   * 4) / macros.calories) * 100);
  const fatPct     = Math.round(((macros.fat_g     * 9) / macros.calories) * 100);

  const occLabel = data.occupational_activity
    ? OCCUPATIONAL_ACTIVITIES.find((o) => o.key === data.occupational_activity)?.label
    : null;

  const handleConfirm = () => {
    if (!canProceed) {
      updateField('goal', 'maintain');
      updateField('weekly_weight_goal_kg', 0);
    }
    onNext();
  };

  const first = data.first_meal_time || '08:00';
  const last  = data.last_meal_time  || '20:00';
  const startH = parseInt(first) || 8;
  const endH   = parseInt(last)  || 20;
  const windowH = endH - startH;

  return (
    <OnbShell step={18} total={26}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Plan header */}
        <View style={styles.planHeader}>
          <Text style={styles.planKicker}>
            Plan hazır · {canProceed ? 'Dengeli' : 'Koruma'}
          </Text>
          <Text style={styles.planTitle}>
            Hazırsın,{' '}
            <Text style={styles.planTitleItalic}>{data.name || 'arkadaş'}.</Text>
          </Text>
          <Text style={styles.planSubtitle}>Bilimsel temelli planın aşağıda.</Text>
        </View>

        {/* Safety alerts */}
        {(safety.blockers.length > 0 || safety.warnings.length > 0) && (
          <View style={styles.safetySection}>
            {safety.blockers.map((b) => <SafetyRow key={b} flag={b} />)}
            {safety.warnings.map((w) => <SafetyRow key={w} flag={w} />)}
          </View>
        )}

        {/* Big calorie banner */}
        <View style={styles.calorieBanner}>
          <Text style={styles.bannerLabel}>GÜNLÜK KALORİ HEDEFİN</Text>
          <View style={styles.bannerValueRow}>
            <Text style={styles.bannerValue}>{macros.calories}</Text>
            <Text style={styles.bannerUnit}>kcal</Text>
          </View>
          <Text style={styles.bannerFormula}>
            {bmr.formula === 'katch_mcardle' ? 'KATCH-MCARDLE' : 'MİFFLİN-ST JEOR'} · BMR {bmr.value} kcal
          </Text>
        </View>

        {/* Math row */}
        <View style={styles.mathCard}>
          <Text style={styles.mathLabel}>MATEMATİK</Text>
          <View style={styles.mathRow}>
            <Pill>BMR {bmr.value}</Pill>
            <Text style={styles.mathOp}>×</Text>
            <Pill>{`PAL ${pal.multiplier.toFixed(2)}`}</Pill>
            <Text style={styles.mathOp}>=</Text>
            <Pill accent>TDEE {tdee}</Pill>
          </View>
          <Text style={styles.mathOffset}>
            {offset === 0
              ? '→ Koruma planı — açık yok'
              : offset > 0
                ? `→ HEDEF FAZLASI +${offset} kcal/gün`
                : `→ HEDEF AÇIĞI ${offset} kcal/gün`}
          </Text>
        </View>

        {/* Macro bar */}
        <View style={styles.macroSection}>
          <Text style={styles.macroLabel}>MAKRO DAĞILIMI (AMDR)</Text>
          <View style={styles.macroBar}>
            <View style={[styles.macroBarSlice, { flex: macros.protein_g, backgroundColor: '#7CB9E8' }]} />
            <View style={[styles.macroBarSlice, { flex: macros.carbs_g,   backgroundColor: '#A8E6CF' }]} />
            <View style={[styles.macroBarSlice, { flex: macros.fat_g,     backgroundColor: '#FFD3A0' }]} />
          </View>
          <View style={styles.macroGrid}>
            {[
              { l: 'Protein', g: macros.protein_g, pct: proteinPct, c: '#7CB9E8', amdr: `${Math.round(AMDR.protein.min*100)}–${Math.round(AMDR.protein.max*100)}%`, warn: macros.amdr_flags.protein_over_amdr },
              { l: 'Karb',    g: macros.carbs_g,   pct: carbsPct,   c: '#A8E6CF', amdr: `${Math.round(AMDR.carbs.min*100)}–${Math.round(AMDR.carbs.max*100)}%`,   warn: macros.amdr_flags.carbs_under_amdr },
              { l: 'Yağ',     g: macros.fat_g,     pct: fatPct,     c: '#FFD3A0', amdr: `${Math.round(AMDR.fat.min*100)}–${Math.round(AMDR.fat.max*100)}%`,     warn: macros.amdr_flags.fat_over_amdr },
            ].map((m) => (
              <View key={m.l} style={[styles.macroBox, m.warn && styles.macroBoxWarn]}>
                <View style={styles.macroBoxHeader}>
                  <View style={[styles.macroDot, { backgroundColor: m.c }]} />
                  <Text style={styles.macroBoxLabel}>{m.l.toUpperCase()}</Text>
                </View>
                <Text style={styles.macroBoxValue}>{m.g}<Text style={styles.macroBoxUnit}>g</Text></Text>
                <Text style={styles.macroBoxAmdr}>%{m.pct} · {m.amdr}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Eating window */}
        <View style={styles.windowCard}>
          <Text style={styles.windowLabel}>YEMEK PENCERESİ · {windowH} SAAT</Text>
          <View style={styles.windowTrack}>
            <View
              style={[
                styles.windowFill,
                { left: `${(startH / 24) * 100}%` as any, width: `${((endH - startH) / 24) * 100}%` as any },
              ]}
            />
            {[0.25, 0.5, 0.75].map((t) => (
              <View key={t} style={[styles.windowTick, { left: `${t * 100}%` as any }]} />
            ))}
          </View>
          <View style={styles.windowTimes}>
            <Text style={styles.windowTimeText}>00:00</Text>
            <Text style={styles.windowTimeCenter}>{first} → {last}</Text>
            <Text style={styles.windowTimeText}>24:00</Text>
          </View>
        </View>
      </ScrollView>

      <OnbFoot
        onNext={handleConfirm}
        onBack={onBack}
        cta={canProceed ? 'Planı Onayla' : 'Dengeli Plan ile Başla'}
      />
    </OnbShell>
  );
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <View style={[pillStyles.pill, accent && pillStyles.accent]}>
      <Text style={[pillStyles.text, accent && pillStyles.textAccent]}>{children}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    borderRadius: 999,
  },
  accent: {
    backgroundColor: OnbColors.terracotta,
    borderColor: OnbColors.terracotta,
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontFamily: MONO,
    color: OnbColors.ink,
  },
  textAccent: {
    color: OnbColors.bg,
  },
});

function SafetyRow({ flag }: { flag: SafetyBlocker | SafetyWarning }) {
  const copy = SAFETY_COPY[flag];
  const isBlocker = copy.tone === 'blocker';

  return (
    <View style={[safetyStyles.row, isBlocker ? safetyStyles.blocker : safetyStyles.warn]}>
      <Text style={safetyStyles.emoji}>{copy.emoji}</Text>
      <View style={safetyStyles.body}>
        <Text style={safetyStyles.title}>{copy.title}</Text>
        <Text style={safetyStyles.text}>{copy.body}</Text>
        {copy.ctaLabel && copy.ctaUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(copy.ctaUrl!).catch(() => {})}
            activeOpacity={0.7}
            style={safetyStyles.cta}
          >
            <Text style={safetyStyles.ctaText}>{copy.ctaLabel} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const safetyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  blocker: {
    backgroundColor: OnbColors.surface,
    borderLeftColor: OnbColors.primary,
  },
  warn: {
    backgroundColor: '#F5E8E8',
    borderLeftColor: '#A3202A',
  },
  emoji: { fontSize: 18 },
  body: { flex: 1 },
  title: { fontSize: 18, fontFamily: SERIF, color: OnbColors.ink },
  text: { fontSize: 12, color: OnbColors.ink2, marginTop: 3, lineHeight: 18 },
  cta: { marginTop: 8, alignSelf: 'flex-start' },
  ctaText: { fontSize: 13, fontFamily: SERIF, fontStyle: 'italic', color: OnbColors.ink },
});

const styles = StyleSheet.create({
  planHeader: {
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  planKicker: {
    fontSize: 10,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: OnbColors.terracotta,
    textTransform: 'uppercase',
  },
  planTitle: {
    fontSize: 40,
    fontFamily: SERIF,
    lineHeight: 44,
    marginTop: 6,
    letterSpacing: -0.8,
    color: OnbColors.ink,
  },
  planTitleItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  planSubtitle: {
    fontSize: 13,
    color: OnbColors.ink2,
    marginTop: 6,
  },
  safetySection: {
    marginHorizontal: 22,
    marginBottom: 10,
  },
  calorieBanner: {
    marginHorizontal: 22,
    marginTop: 10,
    padding: 20,
    backgroundColor: OnbColors.ink,
  },
  bannerLabel: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    fontFamily: MONO,
    color: 'rgba(242,239,230,0.6)',
  },
  bannerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  bannerValue: {
    fontSize: 80,
    lineHeight: 74,
    fontFamily: SERIF,
    color: OnbColors.bg,
    letterSpacing: -3.2,
  },
  bannerUnit: {
    fontSize: 22,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  bannerFormula: {
    fontSize: 10.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: 'rgba(242,239,230,0.55)',
    marginTop: 6,
  },
  mathCard: {
    marginHorizontal: 22,
    marginTop: 12,
    padding: 16,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  mathLabel: {
    fontSize: 9,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginBottom: 8,
  },
  mathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mathOp: {
    fontSize: 14,
    fontFamily: MONO,
    color: OnbColors.ink3,
  },
  mathOffset: {
    fontSize: 11,
    fontFamily: MONO,
    color: OnbColors.terracotta,
    marginTop: 8,
    letterSpacing: 1,
  },
  macroSection: {
    marginHorizontal: 22,
    marginTop: 12,
  },
  macroLabel: {
    fontSize: 9,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginBottom: 8,
  },
  macroBar: {
    flexDirection: 'row',
    height: 22,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    overflow: 'hidden',
  },
  macroBarSlice: {
    height: '100%',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  macroBox: {
    flex: 1,
    padding: 10,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  macroBoxWarn: {
    borderColor: '#A3202A',
    backgroundColor: '#F5E8E8',
  },
  macroBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  macroBoxLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: MONO,
    color: OnbColors.ink3,
  },
  macroBoxValue: {
    fontSize: 22,
    fontFamily: SERIF,
    color: OnbColors.ink,
    marginTop: 2,
  },
  macroBoxUnit: {
    fontSize: 12,
    color: OnbColors.ink3,
  },
  macroBoxAmdr: {
    fontSize: 9,
    letterSpacing: 0.6,
    fontFamily: MONO,
    color: OnbColors.ink2,
  },
  windowCard: {
    marginHorizontal: 22,
    marginTop: 12,
    marginBottom: 20,
    padding: 14,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  windowLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginBottom: 8,
  },
  windowTrack: {
    height: 14,
    backgroundColor: OnbColors.line,
    position: 'relative',
    overflow: 'hidden',
  },
  windowFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: OnbColors.terracotta,
    borderRadius: 2,
  },
  windowTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: OnbColors.bg,
  },
  windowTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  windowTimeText: {
    fontSize: 9,
    fontFamily: MONO,
    color: OnbColors.ink3,
    letterSpacing: 1.2,
  },
  windowTimeCenter: {
    fontSize: 9.5,
    fontFamily: MONO,
    color: OnbColors.ink,
    letterSpacing: 1.4,
  },
});
