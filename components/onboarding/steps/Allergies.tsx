import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius, ALLERGIES } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionChip } from '../shared/OptionChip';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function Allergies({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🛡️
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Alerjin veya{'\n'}intoleransın var mı?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Tarif önerilerinde ve yemek tanımada{'\n'}bunları göz önüne alacağız. İstersen geçebilirsin.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {ALLERGIES.map((a) => (
            <View key={a.key} style={styles.allergyItem}>
              <View style={styles.allergyRow}>
                <Text style={styles.allergyEmoji}>{a.emoji}</Text>
                <View style={styles.allergyText}>
                  <Text style={styles.allergyLabel}>{a.label}</Text>
                  <Text style={styles.allergyDesc}>{a.description}</Text>
                </View>
                <View style={[
                  styles.toggle,
                  data.allergies.includes(a.key) && styles.toggleActive
                ]}
                  onTouchEnd={() => toggleArrayItem('allergies', a.key)}
                >
                  <View style={[
                    styles.toggleKnob,
                    data.allergies.includes(a.key) && styles.toggleKnobActive
                  ]} />
                </View>
              </View>
            </View>
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
  allergyItem: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  allergyEmoji: { fontSize: 24 },
  allergyText: { flex: 1 },
  allergyLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  allergyDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
