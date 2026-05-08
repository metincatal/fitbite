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
import { Colors } from '../../lib/constants';
import {
  AuthCornerMarks,
  AuthLogo,
  AuthInput,
  AuthCta,
  AuthFonts,
  ShowToggle,
  StrengthIndicator,
  StrengthLabel,
  pwScore,
} from '../../components/auth/AuthChrome';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const score = pwScore(password);

  async function handleSubmit() {
    if (password.length < 8) {
      Alert.alert('Şifre', 'Şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Şifre', 'Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Hata', error.message);
        return;
      }
      await supabase.auth.signOut();
      Alert.alert(
        'Şifre Güncellendi',
        'Yeni şifrenle giriş yapabilirsin.',
        [{ text: 'Giriş Yap', onPress: () => router.replace('/(auth)/login') }]
      );
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

          <Text style={styles.kicker}>YENİ ŞİFRE</Text>

          <Text style={styles.headline}>
            Taze bir{'\n'}
            <Text style={styles.headlineItalic}>başlangıç.</Text>
          </Text>

          <Text style={styles.lede}>
            Güçlü bir şifre seç — büyük/küçük harf, rakam ve sembol kombinasyonu işe yarar.
          </Text>

          <View style={{ marginTop: 18 }}>
            <AuthInput
              label="YENİ ŞİFRE"
              hint="En az 8 karakter"
              value={password}
              onChange={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              autoFocus
              secondary={
                <ShowToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
              }
            />
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <StrengthIndicator score={score} />
                <StrengthLabel score={score} />
              </View>
            )}
            <AuthInput
              label="ŞİFRE TEKRAR"
              hint="Aynısını yaz"
              value={confirm}
              onChange={setConfirm}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>

          <View style={{ marginTop: 28 }}>
            <AuthCta
              label="Şifremi Güncelle"
              kicker="✓"
              onPress={handleSubmit}
              loading={loading}
              dim={password.length < 8 || confirm.length === 0}
            />
          </View>
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
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingRight: 2,
  },
});
