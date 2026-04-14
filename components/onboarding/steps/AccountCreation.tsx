import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function AccountCreation({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!data.email.trim()) newErrors.email = 'E-posta zorunludur';
    else if (!/\S+@\S+\.\S+/.test(data.email)) newErrors.email = 'Geçerli bir e-posta girin';
    if (!data.password) newErrors.password = 'Şifre zorunludur';
    else if (data.password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalı';
    if (data.password !== confirmPassword) newErrors.confirm = 'Şifreler eşleşmiyor';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  const isValid =
    data.email.trim().length > 0 &&
    data.password.length >= 6 &&
    data.password === confirmPassword;

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        🔐
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Hesabını{'\n'}Oluştur
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Son adım! Giriş bilgilerini belirle.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            value={data.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={Colors.textMuted}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <View>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.password ? styles.inputError : undefined]}
              value={data.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder="En az 6 karakter"
              secureTextEntry={!showPassword}
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={[styles.input, errors.confirm ? styles.inputError : undefined]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Şifreni tekrar gir"
            secureTextEntry={!showPassword}
            placeholderTextColor={Colors.textMuted}
          />
          {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <OnboardingButton title="Devam Et →" onPress={handleNext} disabled={!isValid} />
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
  },
  form: { gap: Spacing.md, marginBottom: Spacing.xl },
  inputGroup: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  passwordInput: { paddingRight: 48 },
  inputError: { borderColor: '#EF4444' },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },
  errorText: {
    fontSize: FontSize.xs,
    color: '#EF4444',
  },
  footer: { gap: Spacing.sm, paddingBottom: Spacing.xxl },
});
