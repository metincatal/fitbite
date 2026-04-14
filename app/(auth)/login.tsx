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
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession, fetchProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'E-posta zorunludur';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Geçerli bir e-posta girin';
    if (!password) newErrors.password = 'Şifre zorunludur';
    else if (password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalı';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('[Login] signInWithPassword başlıyor...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[Login] Sonuç:', { session: !!data.session, error: error?.message });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          Alert.alert(
            'E-posta Doğrulanmadı',
            'Hesabını doğrulamak için e-postana gelen bağlantıya tıklamalısın. E-postayı almadıysan spam klasörünü kontrol et.'
          );
        } else {
          Alert.alert('Giriş Başarısız', `Hata: ${error.message}`);
        }
      } else if (data.session) {
        setSession(data.session);
        await fetchProfile();
        const { profile } = useAuthStore.getState();
        if (profile) {
          router.replace('/(tabs)');
        } else {
          // Hesap var ama profil tamamlanmamış — onboarding'e devam
          router.replace('/onboarding');
        }
      }
    } catch (e: any) {
      console.error('[Login] Exception:', e);
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setLoading(false);
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
        {/* Logo & Başlık */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🥗</Text>
          </View>
          <Text style={styles.appName}>FitBite</Text>
          <Text style={styles.tagline}>Akıllı beslenme, sağlıklı yaşam</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Giriş Yap</Text>

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
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            error={errors.password}
            rightIcon={
              <Text style={styles.showPasswordIcon}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          <Button
            title="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />
        </View>

        {/* Kayıt Ol Linki */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabın yok mu? </Text>
          <TouchableOpacity onPress={() => router.push('/onboarding')}>
            <Text style={styles.footerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
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
    paddingTop: 80,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  showPasswordIcon: {
    fontSize: 18,
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
