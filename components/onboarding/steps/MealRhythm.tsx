import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, MEAL_RHYTHMS } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function MealRhythm({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  return (
    <StepContainer scrollable={false}>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🍽️
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Günde kaç öğün{'\n'}yemek istersin?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Öğün hatırlatıcıları ve günlük plan buna göre ayarlanır
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.cardsRow}>
          {MEAL_RHYTHMS.map((r) => {
            const selected = data.meal_count === r.count;
            return (
              <View
                key={r.count}
                style={[styles.card, selected && styles.cardSelected]}
                onTouchEnd={() => updateField('meal_count', r.count)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={32}
                  color={selected ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                  {r.label}
                </Text>
                <Text style={[styles.cardSubtitle, selected && styles.cardSubtitleSelected]}>
                  {r.subtitle}
                </Text>
                {selected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>

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
    lineHeight: FontSize.md * 1.5,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
    alignItems: 'stretch',
  },
  card: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    position: 'relative',
    minHeight: 140,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '30',
  },
  cardLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cardLabelSelected: { color: Colors.primary },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: FontSize.xs * 1.4,
  },
  cardSubtitleSelected: { color: Colors.primaryLight },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { gap: Spacing.sm, paddingTop: Spacing.lg },
});
