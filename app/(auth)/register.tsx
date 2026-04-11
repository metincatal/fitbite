import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSize } from '../../lib/constants';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Ad zorunludur';
    if (!email.trim()) newErrors.email = 'E-posta zorunludur';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Geçerli bir e-posta girin';
    if (!password) newErrors.password = 'Şifre zorunludur';
    else if (password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalı';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Kayıt Başarısız', error.message);
      return;
    }

    if (data.session) {
      // Oturum açıldı, onboarding'e yönlendir
      router.replace('/onboarding');
    } else if (data.user) {
      // Email doğrulaması gerekiyor (Supabase ayarı açık)
      Alert.alert(
        'E-postanı Doğrula',
        `${email} adresine bir doğrulama e-postası gönderildi. Bağlantıya tıkladıktan sonra giriş yapabilirsin.`,
        [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>FitBite ile sağlıklı yaşama başla</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Adın"
            value={name}
            onChangeText={setName}
            placeholder="Adın ve soyadın"
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
          />

          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Input
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="En az 6 karakter"
            secureTextEntry={!showPassword}
            error={errors.password}
            rightIcon={
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Input
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Şifreni tekrar gir"
            secureTextEntry={!showPassword}
            error={errors.confirmPassword}
          />

          <Text style={styles.terms}>
            Kayıt olarak{' '}
            <Text style={styles.termsLink}>Kullanım Koşulları</Text>
            {' '}ve{' '}
            <Text style={styles.termsLink}>Gizlilik Politikası</Text>
            'nı kabul etmiş olursunuz.
          </Text>

          <Button
            title="Kayıt Ol"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.registerButton}
          />
        </View>

        {/* Giriş Linki */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  eyeIcon: {
    fontSize: 18,
  },
  terms: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  registerButton: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '700',
  },
});
