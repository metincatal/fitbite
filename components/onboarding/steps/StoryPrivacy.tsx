import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const TRUST_POINTS = [
  { icon: 'lock-closed-outline', title: 'Veriler şifrelenir', desc: 'Tüm verilerin AES-256 ile korunur' },
  { icon: 'server-outline', title: 'Satılmaz, paylaşılmaz', desc: 'Verilerini hiçbir 3. tarafla paylaşmıyoruz' },
  { icon: 'trash-outline', title: 'İstediğinde sil', desc: 'Hesabını ve tüm verilerini dilediğinde silebilirsin' },
];

export function StoryPrivacy({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(0).duration(600)} style={styles.shieldContainer}>
          <Ionicons name="shield-checkmark" size={80} color={Colors.primaryLight} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.title}>
          Verilerin{'\n'}güvende
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).duration(600)} style={styles.subtitle}>
          Sağlık verilerinin ne kadar özel olduğunu biliyoruz.
        </Animated.Text>

        <View style={styles.trustList}>
          {TRUST_POINTS.map((p, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(500 + i * 150).duration(500)}
              style={styles.trustItem}
            >
              <View style={styles.trustIcon}>
                <Ionicons name={p.icon as any} size={22} color={Colors.primary} />
              </View>
              <View style={styles.trustText}>
                <Text style={styles.trustTitle}>{p.title}</Text>
                <Text style={styles.trustDesc}>{p.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(1100).duration(400)} style={styles.footer}>
        <OnboardingButton title="Anladım, devam et →" onPress={onNext} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  content: { flex: 1, justifyContent: 'center' },
  shieldContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: FontSize.xxxl * 1.2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.5,
  },
  trustList: { gap: Spacing.md },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  trustIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryPale + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { flex: 1 },
  trustTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  trustDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: { gap: Spacing.sm },
});
