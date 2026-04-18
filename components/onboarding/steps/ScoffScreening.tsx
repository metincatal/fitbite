import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, SCOFF_QUESTIONS } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { YesNoQuestion } from '../shared/YesNoQuestion';
import type { ScoffAnswers } from '../../../types/database';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const KEYS: (keyof ScoffAnswers)[] = ['q1', 'q2', 'q3', 'q4', 'q5'];

export function ScoffScreening({ onNext, onBack }: Props) {
  const { data, setScoffAnswer } = useOnboardingData();
  const isValid = KEYS.every((k) => typeof data.scoff_answers[k] === 'boolean');

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        🤍
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Birkaç hassas soru
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Cevapların tamamen gizli. Sağlıklı bir plan kurabilmek için gerekli.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.privacyRow}>
        <Ionicons name="lock-closed" size={14} color={Colors.primary} />
        <Text style={styles.privacyText}>Cevapların şifrelenmiş olarak saklanır.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.list}>
        {SCOFF_QUESTIONS.map((q, i) => (
          <YesNoQuestion
            key={i}
            number={i + 1}
            question={q}
            value={data.scoff_answers[KEYS[i]]}
            onChange={(v) => setScoffAnswer(KEYS[i], v)}
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
    marginBottom: Spacing.md,
    lineHeight: FontSize.md * 1.5,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryPale + '40',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    gap: 0,
  },
  footer: { marginTop: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
});
