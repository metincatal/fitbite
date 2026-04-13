import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, OBSTACLES } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function PastObstacles({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🚧
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Geçmişte neler{'\n'}zorladı seni?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Seni tanımak için soruyor FitBot.{'\n'}Atlamak istersen devam et. ✌️
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {OBSTACLES.map((o) => (
            <OptionCard
              key={o.key}
              label={o.label}
              description={o.description}
              selected={data.past_obstacles.includes(o.key)}
              onPress={() => toggleArrayItem('past_obstacles', o.key)}
              variant="list"
            />
          ))}
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
    lineHeight: FontSize.md * 1.5,
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
