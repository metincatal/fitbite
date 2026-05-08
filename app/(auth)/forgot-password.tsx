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
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../lib/constants';
import {
  AuthCornerMarks,
  AuthLogo,
  AuthInput,
  AuthCta,
  AuthFonts,
  FootSwitch,
} from '../../components/auth/AuthChrome';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('E-posta', 'Geçerli bir e-posta adresi girin.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        Alert.alert('Hata', error.message);
        return;
      }
      setSent(true);
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setLoading(false);
    }
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

          <Text style={styles.kicker}>ŞİFRE SIFIRLA</Text>

          {sent ? (
            <>
              <Text style={styles.headline}>
                E-posta <Text style={styles.headlineItalic}>yolda.</Text>
              </Text>
              <Text style={styles.lede}>
                <Text style={{ fontFamily: AuthFonts.UI, fontWeight: '500' }}>{email}</Text>
                {' '}adresine sıfırlama bağlantısı gönderdik. Gelen kutunu ve spam klasörünü kontrol et.
              </Text>
              <View style={{ marginTop: 40 }}>
                <AuthCta
                  label="Giriş Ekranına Dön"
                  kicker="←"
                  onPress={() => router.replace('/(auth)/login')}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.headline}>
                Sıfırlayalım,{'\n'}
                <Text style={styles.headlineItalic}>hemen.</Text>
              </Text>
              <Text style={styles.lede}>
                E-posta adresini gir, şifre sıfırlama bağlantısını gönderelim.
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
                  autoFocus
                />
              </View>

              <View style={{ marginTop: 28 }}>
                <AuthCta
                  label="Bağlantı Gönder"
                  kicker="→"
                  onPress={handleSubmit}
                  loading={loading}
                />
              </View>

              <FootSwitch
                kicker="Aklına geldi mi?"
                label="Giriş yap,"
                italic="devam et"
                onPress={() => router.back()}
              />
            </>
          )}
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
