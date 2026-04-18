import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const RATES = [
  { value: 0.25, label: 'Yavaş', subtitle: '0.25 kg/hafta', emoji: '🐢', desc: '-275 kcal/gün', highlight: false },
  { value: 0.5, label: 'Dengeli', subtitle: '0.5 kg/hafta', emoji: '⚖️', desc: '-550 kcal/gün', highlight: true },
  { value: 0.75, label: 'Hızlı', subtitle: '0.75 kg/hafta', emoji: '🏃', desc: '-825 kcal/gün', highlight: false },
  { value: 1.0, label: 'Agresif', subtitle: '1 kg/hafta', emoji: '🔥', desc: '-1100 kcal/gün', highlight: false },
];

export function WeightGoalRate({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  const currentWeight = parseFloat(data.weight_kg);
  const targetWeight = parseFloat(data.target_weight_kg);
  const diff = !isNaN(currentWeight) && !isNaN(targetWeight) ? Math.abs(targetWeight - currentWeight) : null;

  const isGainMode = !isNaN(currentWeight) && !isNaN(targetWeight) && targetWeight > currentWeight;

  // Seçili tempo vücut ağırlığının %1'inden fazlaysa uyarı göster
  const rateTooAggressive =
    !isNaN(currentWeight) &&
    currentWeight > 0 &&
    data.weekly_weight_goal_kg > 0 &&
    data.weekly_weight_goal_kg / currentWeight > 0.01;
  const aggressivePct = rateTooAggressive
    ? Math.round((data.weekly_weight_goal_kg / currentWeight) * 1000) / 10
    : null;

  return (
    <StepContainer scrollable={false}>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          📈
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Ne kadar hızlı{'\n'}{isGainMode ? 'kilo almak' : 'kilo vermek'}{'\n'}istiyorsun?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Yavaş değişim daha kalıcı olur.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.grid}>
          {RATES.map((r) => {
            const selected = data.weekly_weight_goal_kg === r.value;
            const weeks = diff ? Math.ceil(diff / r.value) : null;

            return (
              <View
                key={r.value}
                style={[styles.card, selected && styles.cardSelected, r.highlight && styles.cardHighlight]}
                onTouchEnd={() => updateField('weekly_weight_goal_kg', r.value)}
              >
                {r.highlight && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Önerilen</Text>
                  </View>
                )}
                <Text style={styles.cardEmoji}>{r.emoji}</Text>
                <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                  {r.label}
                </Text>
                <Text style={[styles.cardSubtitle, selected && styles.cardSubtitleSelected]}>
                  {r.subtitle}
                </Text>
                <Text style={[styles.cardDesc, selected && styles.cardDescSelected]}>
                  {r.desc}
                </Text>
                {weeks && (
                  <Text style={styles.cardWeeks}>~{weeks} hafta</Text>
                )}
              </View>
            );
          })}
        </Animated.View>

        {rateTooAggressive && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.warningBanner}>
            <Ionicons name="warning" size={16} color={Colors.warning} />
            <Text style={styles.warningText}>
              Seçtiğin tempo vücut ağırlığının %{aggressivePct}'ine denk geliyor. Hızlı kilo kaybı
              kas kaybına yol açar. "Dengeli" 0.5 kg/hafta önerilir.
            </Text>
          </Animated.View>
        )}

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} />
          <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
        </View>
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'space-between' },
  emoji: { fontSize: 52, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: FontSize.xxxl * 1.2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    flex: 1,
    alignContent: 'flex-start',
  },
  card: {
    width: '47.5%',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    gap: 4,
    position: 'relative',
    paddingTop: Spacing.lg,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '30',
  },
  cardHighlight: {
    borderColor: Colors.primaryLight,
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: Colors.primaryLight,
    borderTopRightRadius: BorderRadius.xl - 2,
    borderBottomLeftRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  recommendedText: {
    fontSize: FontSize.xs - 1,
    fontWeight: '800',
    color: '#fff',
  },
  cardEmoji: { fontSize: 28 },
  cardLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cardLabelSelected: { color: Colors.primary },
  cardSubtitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  cardSubtitleSelected: { color: Colors.primaryLight },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  cardDescSelected: { color: Colors.textSecondary },
  cardWeeks: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight + '40',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: FontSize.xs * 1.5,
  },
  footer: { gap: Spacing.sm, paddingTop: Spacing.md },
});
