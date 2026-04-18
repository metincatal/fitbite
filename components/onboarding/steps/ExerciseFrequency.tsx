import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Colors,
  Spacing,
  FontSize,
  EXERCISE_FREQUENCIES,
  ExerciseFrequency as ExKey,
} from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function ExerciseFrequency({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const isValid = data.exercise_frequency !== null;

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        🏋️
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Haftada kaç gün{'\n'}antrenman yapıyorsun?
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Yoğun iş fiziği saymaz — "spor" dediğimiz planlı hareket.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        {EXERCISE_FREQUENCIES.map((opt) => (
          <OptionCard
            key={opt.key}
            emoji={opt.emoji}
            label={opt.label}
            description={opt.description}
            selected={data.exercise_frequency === opt.key}
            onPress={() => updateField('exercise_frequency', opt.key as ExKey)}
            variant="list"
          />
        ))}
      </Animated.View>

      <View style={styles.footer}>
        <OnboardingButton title="Devam Et →" onPress={onNext} disabled={!isValid} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
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
  footer: { marginTop: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
});
