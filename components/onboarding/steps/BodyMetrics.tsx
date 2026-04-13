import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function BodyMetrics({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  const height = parseFloat(data.height_cm);
  const weight = parseFloat(data.weight_kg);
  const targetWeight = parseFloat(data.target_weight_kg);

  const isValid =
    data.height_cm.length > 0 &&
    data.weight_kg.length > 0 &&
    data.target_weight_kg.length > 0 &&
    height > 100 && height < 250 &&
    weight > 30 && weight < 300;

  function handleNext() {
    // goal'ı otomatik hesapla
    if (!isNaN(weight) && !isNaN(targetWeight)) {
      const diff = targetWeight - weight;
      if (diff < -1) updateField('goal', 'lose');
      else if (diff > 1) updateField('goal', 'gain');
      else updateField('goal', 'maintain');
    }
    onNext();
  }

  const bmi =
    height > 0 && weight > 0
      ? (weight / Math.pow(height / 100, 2)).toFixed(1)
      : null;

  const diff =
    !isNaN(weight) && !isNaN(targetWeight) ? targetWeight - weight : null;

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          📏
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Vücut ölçülerin
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          BMI ve kalori hedefiniz hesaplanacak
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={styles.label}>Boyun (cm)</Text>
          <TextInput
            style={styles.input}
            value={data.height_cm}
            onChangeText={(v) => updateField('height_cm', v)}
            placeholder="170"
            keyboardType="number-pad"
            maxLength={3}
            placeholderTextColor={Colors.textMuted}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={styles.label}>Mevcut kilonuz (kg)</Text>
          <TextInput
            style={styles.input}
            value={data.weight_kg}
            onChangeText={(v) => updateField('weight_kg', v)}
            placeholder="70"
            keyboardType="decimal-pad"
            maxLength={5}
            placeholderTextColor={Colors.textMuted}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={styles.label}>Hedef kilonuz (kg)</Text>
          <TextInput
            style={styles.input}
            value={data.target_weight_kg}
            onChangeText={(v) => updateField('target_weight_kg', v)}
            placeholder="65"
            keyboardType="decimal-pad"
            maxLength={5}
            placeholderTextColor={Colors.textMuted}
          />
        </Animated.View>

        {(bmi || diff !== null) && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.infoRow}>
            {bmi && (
              <View style={styles.infoChip}>
                <Text style={styles.infoValue}>{bmi}</Text>
                <Text style={styles.infoLabel}>BMI</Text>
              </View>
            )}
            {diff !== null && !isNaN(diff) && (
              <View style={styles.infoChip}>
                <Text style={[styles.infoValue, diff < 0 ? styles.lose : diff > 0 ? styles.gain : styles.maintain]}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                </Text>
                <Text style={styles.infoLabel}>
                  {diff < -1 ? 'Vereceksin' : diff > 1 ? 'Alacaksın' : 'Koruyacaksın'}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={handleNext} disabled={!isValid} />
          <OnboardingButton title="Geri" onPress={onBack} variant="ghost" style={styles.backBtn} />
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
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '600',
    backgroundColor: Colors.surface,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  infoChip: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  lose: { color: Colors.primary },
  gain: { color: Colors.accent },
  maintain: { color: Colors.info },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.xl },
  backBtn: {},
});
