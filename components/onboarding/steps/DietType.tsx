import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DIET_TYPES, DietType as DietTypeValue } from '../../../lib/constants';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function DietType({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🍽️
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Beslenme{'\n'}tarzın ne?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Tarif ve öneri sistemin buna göre ayarlanır
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {(Object.entries(DIET_TYPES) as [DietTypeValue, typeof DIET_TYPES[DietTypeValue]][]).map(
            ([key, val]) => (
              <OptionCard
                key={key}
                label={val.label}
                description={val.description}
                emoji={val.emoji}
                selected={data.diet_type === key}
                onPress={() => updateField('diet_type', key)}
                variant="list"
              />
            )
          )}
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
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
