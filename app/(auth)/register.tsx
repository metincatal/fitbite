import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingData } from '../../hooks/useOnboardingData';
import { Colors } from '../../lib/constants';
import {
  AuthCornerMarks,
  AuthLogo,
  AuthInput,
  AuthCta,
  OrDivider,
  ProviderRow,
  FootSwitch,
  ConsentRow,
  StrengthIndicator,
  StrengthLabel,
  pwScore,
  AuthFonts,
} from '../../components/auth/AuthChrome';

const KVKK_URL = 'https://fitbite.app/kvkk';

export default function RegisterScreen() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [etk, setEtk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const score = pwScore(password);
  const formValid = kvkk && /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  const formDisabled = loading || oauthLoading;

  async function handleSignup() {
    if (!formValid) return;
    setLoading(true);
    try {
      // Hesap oluştur — duplicate kontrolü ve email doğrulama akışı için
      const { data: authData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('already registered') ||
          msg.includes('already exists') ||
          msg.includes('user already')
        ) {
          Alert.alert(
            'Hesap Mevcut',
            'Bu e-posta adresiyle zaten kayıtlısın. Giriş yap sayfasına yönlendirelim mi?',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Giriş Yap', onPress: () => router.replace('/(auth)/login') },
            ]
          );
        } else {
          Alert.alert('Kayıt Hatası', error.message);
        }
        return;
      }

      if (!authData.session) {
        // E-posta doğrulaması gerekiyor
        Alert.alert(
          'E-postanı Doğrula',
          `${email.trim()} adresine bir doğrulama bağlantısı gönderdik. Doğruladıktan sonra giriş yap.`,
          [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }

      // Hesap oluşturuldu, session aktif — onboarding store'a yaz, onboarding'e geç
      useOnboardingData.setState((s) => ({
        data: { ...s.data, email: email.trim(), password },
      }));
      router.replace('/onboarding');
    } catch {
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
      await fetchProfile();
      const { profile } = useAuthStore.getState();
      router.replace(profile ? '/(tabs)' : '/onboarding');
    } finally {
      setOauthLoading(false);
    }
  }

  function handleApple() {
    Alert.alert('Apple ile Devam', 'Apple ile giriş yakında. Şimdilik e-posta veya Google ile devam edebilirsin.');
  }

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

          <Text style={styles.kicker}>KAYIT — YENİ BAŞLANGIÇ</Text>

          <Text style={styles.headline}>
            Aramıza katıl,{'\n'}
            <Text style={styles.headlineItalic}>başlangıcın</Text> burada.
          </Text>

          <Text style={styles.lede}>
            Önce bir hesap, sonra 3–4 dakikalık kurulum. Ne yiyeceğin değil — neden yiyeceğin önemli.
          </Text>

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
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            secondary={<StrengthLabel score={score} />}
          />
          <StrengthIndicator score={score} />

          <View style={{ marginTop: 20, gap: 10 }}>
            <ConsentRow checked={kvkk} onToggle={() => setKvkk((c) => !c)} required>
              <Text style={styles.kvkkLink} onPress={() => Linking.openURL(KVKK_URL)}>
                KVKK Aydınlatma Metni'ni
              </Text>{' '}
              okudum, kişisel verilerimin işlenmesini kabul ediyorum.
            </ConsentRow>
            <ConsentRow checked={etk} onToggle={() => setEtk((c) => !c)}>
              Kampanya ve içerik bültenleri için <Text style={styles.italicInline}>e-posta tercihlerimi</Text> açık rıza ile veriyorum.
            </ConsentRow>
          </View>

          <View style={{ marginTop: 18 }}>
            <AuthCta
              label="Hesap Oluştur"
              kicker="↵"
              onPress={handleSignup}
              loading={loading}
              dim={!formValid || formDisabled}
            />
          </View>

          <OrDivider />

          <ProviderRow
            disabled={formDisabled}
            items={[
              { k: 'apple', label: 'Apple' },
              { k: 'google', label: oauthLoading ? 'Bağlanıyor…' : 'Google' },
            ]}
            onPick={(k) => {
              if (k === 'google') handleGoogle();
              if (k === 'apple') handleApple();
            }}
          />

          <FootSwitch
            kicker="Hesabın zaten var mı?"
            label="Giriş yap,"
            italic="devam et"
            onPress={() => router.replace('/(auth)/login')}
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
  kvkkLink: {
    fontFamily: AuthFonts.SERIF_ITALIC,
    color: Colors.terracotta,
  },
  italicInline: {
    fontFamily: AuthFonts.SERIF_ITALIC,
  },
});
