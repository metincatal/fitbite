import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../lib/constants';
import {
  AuthCornerMarks,
  AuthLogo,
  AuthInput,
  AuthCta,
  OrDivider,
  ProviderRow,
  FootSwitch,
  ShowToggle,
  ForgotPassword,
  AuthFonts,
} from '../../components/auth/AuthChrome';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession, fetchProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  function validate(): boolean {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('E-posta', 'Geçerli bir e-posta adresi girin.');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Şifre', 'Şifre en az 6 karakter olmalı.');
      return false;
    }
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          Alert.alert(
            'E-posta Doğrulanmadı',
            'Hesabını doğrulamak için e-postana gelen bağlantıya tıklamalısın. Spam klasörünü kontrol et.'
          );
        } else {
          Alert.alert('Giriş Başarısız', error.message);
        }
        return;
      }
      if (data.session) {
        setSession(data.session);
        await fetchProfile();
        const { profile } = useAuthStore.getState();
        router.replace(profile ? '/(tabs)' : '/onboarding');
      }
    } catch (e: any) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        if (result.reason === 'cancelled') return;
        Alert.alert('Google Girişi', result.message ?? 'Google ile giriş tamamlanamadı.');
        return;
      }
      // setSession otomatik tetiklenecek (onAuthStateChange) — ama biz de yine de profil çekelim
      await fetchProfile();
      const { profile } = useAuthStore.getState();
      router.replace(profile ? '/(tabs)' : '/onboarding');
    } finally {
      setOauthLoading(false);
    }
  }

  function handleForgot() {
    router.push('/(auth)/forgot-password');
  }

  const formDisabled = loading || oauthLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <AuthCornerMarks />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthLogo />

          <Text style={styles.kicker}>GİRİŞ — HOŞ GELDİN</Text>

          <Text style={styles.headline}>
            Tabağın <Text style={styles.headlineItalic}>seni</Text>
            {'\n'}
            bekliyor.
          </Text>

          <Text style={styles.lede}>
            Hesabına giriş yap, kaldığın yerden devam edelim. Spiraline yeni bir gün eklenecek.
          </Text>

          <View style={{ marginTop: 18 }}>
            <AuthInput
              label="E-POSTA"
              hint="ad@ornek.com"
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <AuthInput
              label="ŞİFRE"
              hint="En az 8 karakter"
              value={password}
              onChange={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              secondary={<ShowToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
            />
            <ForgotPassword onPress={handleForgot} />
          </View>

          <View style={{ marginTop: 22 }}>
            <AuthCta label="Giriş Yap" kicker="↵" onPress={handleLogin} loading={loading} dim={formDisabled} />
          </View>

          <OrDivider />

          <ProviderRow
            disabled={formDisabled}
            items={[
              { k: 'google', label: oauthLoading ? 'Bağlanıyor…' : 'Google' },
            ]}
            onPick={(k) => {
              if (k === 'google') handleGoogle();
            }}
          />

          <FootSwitch
            kicker="Henüz aramızda değil misin?"
            label="Hesap oluştur,"
            italic="başlayalım"
            onPress={() => router.push('/(auth)/register')}
          />
        </ScrollView>
      </View>
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
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 40,
  },
  kicker: {
    fontFamily: AuthFonts.MONO,
    fontSize: 10,
    letterSpacing: 2.6,
    color: Colors.terracotta,
    marginTop: 38,
  },
  headline: {
    fontFamily: AuthFonts.SERIF,
    fontSize: 44,
    lineHeight: 45,
    color: Colors.ink,
    marginTop: 10,
    letterSpacing: -0.9,
  },
  headlineItalic: {
    fontFamily: AuthFonts.SERIF_ITALIC,
    color: Colors.terracotta,
  },
  lede: {
    fontFamily: AuthFonts.UI,
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 10,
    lineHeight: 19.5,
    maxWidth: 300,
  },
});
