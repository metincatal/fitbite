import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  MEDICAL_CONDITIONS,
} from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function MedicalConditions({ onNext, onBack }: Props) {
  const { data, toggleMedicalCondition } = useOnboardingData();
  const isValid = data.medical_conditions.length > 0;

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        🩺
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Bilinmesi gereken{'\n'}sağlık durumun var mı?
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Önerileri sağlık durumuna göre hassaslaştırırız.{'\n'}Doktor önerilerinin yerini tutmaz.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.disclaimerBox}>
        <Ionicons name="information-circle" size={16} color={Colors.primary} />
        <Text style={styles.disclaimerText}>
          Birden fazla seçebilirsin. "Hiçbiri" seçilince diğerleri temizlenir.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.chipWrap}>
        {MEDICAL_CONDITIONS.map((c) => (
          <OptionCard
            key={c.key}
            emoji={c.emoji}
            label={c.label}
            selected={data.medical_conditions.includes(c.key)}
            onPress={() => toggleMedicalCondition(c.key)}
            variant="chip"
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
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: { marginTop: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
});
