import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { OptionCard } from '../shared/OptionCard';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const GENDERS = [
  { value: 'male' as const, label: 'Erkek', emoji: '👨' },
  { value: 'female' as const, label: 'Kadın', emoji: '👩' },
];

export function GenderBirthDate({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const isValid = data.gender !== null && data.birth_year.length === 4;
  const currentYear = new Date().getFullYear();

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🧬
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Biraz daha{'\n'}bilgi verelim
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Kalori hesaplama için gerekli
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={styles.label}>Cinsiyetin</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <OptionCard
                key={g.value}
                label={g.label}
                emoji={g.emoji}
                selected={data.gender === g.value}
                onPress={() => updateField('gender', g.value)}
                variant="card"
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <Text style={styles.label}>Doğum Yılın</Text>
          <TextInput
            style={styles.input}
            value={data.birth_year}
            onChangeText={(v) => updateField('birth_year', v)}
            placeholder={String(currentYear - 25)}
            keyboardType="number-pad"
            maxLength={4}
            placeholderTextColor={Colors.textMuted}
          />
          {data.birth_year.length === 4 && (
            <Text style={styles.ageHint}>
              {currentYear - parseInt(data.birth_year)} yaşındasın
            </Text>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} disabled={!isValid} />
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
  genderRow: { flexDirection: 'row', gap: Spacing.md },
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
  ageHint: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.xl },
  backBtn: {},
});
