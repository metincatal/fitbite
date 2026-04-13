import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ACTIVITY_LEVELS, ActivityLevel as ActivityLevelType } from '../../../lib/constants';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ACTIVITY_ICONS: Record<string, string> = {
  sedentary: 'laptop-outline',
  light: 'walk-outline',
  moderate: 'bicycle-outline',
  active: 'fitness-outline',
  very_active: 'barbell-outline',
};

export function ActivityLevel({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const isValid = data.activity_level !== null;

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🏃
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Ne kadar{'\n'}aktifsin?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Günlük enerji harcamanı hesaplayalım
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {(Object.entries(ACTIVITY_LEVELS) as [ActivityLevelType, typeof ACTIVITY_LEVELS[ActivityLevelType]][]).map(
            ([key, val]) => (
              <OptionCard
                key={key}
                label={val.label}
                description={val.description}
                icon={ACTIVITY_ICONS[key]}
                selected={data.activity_level === key}
                onPress={() => updateField('activity_level', key)}
                variant="list"
              />
            )
          )}
        </Animated.View>

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} disabled={!isValid} />
          <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
        </View>
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, paddingBottom: Spacing.xxl },
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
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
