import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, TTM_STAGES, TTMStage as TTMStageKey } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function TTMStage({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const isValid = data.ttm_stage !== null;

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        🧭
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Sağlıklı yaşam{'\n'}yolculuğunda neredesin?
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Doğrusu yok, yanlışı yok — samimi cevap planını şekillendirir.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.list}>
        {TTM_STAGES.map((stage) => (
          <OptionCard
            key={stage.key}
            emoji={stage.emoji}
            label={stage.label}
            description={stage.description}
            selected={data.ttm_stage === stage.key}
            onPress={() => updateField('ttm_stage', stage.key as TTMStageKey)}
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
  list: {
    gap: 0,
  },
  footer: { marginTop: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
});
