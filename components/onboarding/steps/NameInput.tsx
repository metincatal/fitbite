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

export function NameInput({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const isValid = data.name.trim().length >= 2;

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          👋
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Merhaba!{'\n'}Adın nedir?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Seni nasıl çağıralım?
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <TextInput
            style={styles.input}
            value={data.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="Adın ve soyadın"
            autoCapitalize="words"
            autoFocus
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => isValid && onNext()}
          />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(500).duration(500)} style={styles.hint}>
          FitBot sana isminle hitap edecek 🌿
        </Animated.Text>

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
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginLeft: Spacing.xs,
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.xl },
  backBtn: {},
});
