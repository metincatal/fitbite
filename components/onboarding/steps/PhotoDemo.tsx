import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

const FEATURES = [
  { icon: 'camera-outline', title: 'Fotoğrafla tanı', desc: 'Tabağını fotoğrafla, besin değerlerini saniyeler içinde gör' },
  { icon: 'barcode-outline', title: 'Barkod okuyucu', desc: 'Marketteki ürünleri anında tara ve ekle' },
  { icon: 'chatbubble-ellipses-outline', title: 'FitBot AI', desc: 'Diyetisyen AI\'ın her an yanında' },
  { icon: 'trending-up-outline', title: 'İlerleme takibi', desc: 'Haftalık raporlar ve kilo timeline\'ı' },
];

export function PhotoDemo({ onNext, onBack, loading = false }: Props) {
  const { data } = useOnboardingData();

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.topSection}>
        <View style={styles.demoScreen}>
          <View style={styles.mockCamera}>
            <Ionicons name="camera" size={48} color={Colors.primaryLight} />
            <View style={styles.scanLine} />
            <View style={styles.focusCornerTL} />
            <View style={styles.focusCornerTR} />
            <View style={styles.focusCornerBL} />
            <View style={styles.focusCornerBR} />
          </View>
          <Animated.View
            entering={FadeInDown.delay(800).duration(400)}
            style={styles.resultCard}
          >
            <Text style={styles.resultEmoji}>🥗</Text>
            <View>
              <Text style={styles.resultName}>Mercimek Çorbası</Text>
              <Text style={styles.resultCalorie}>245 kcal · %92 güven</Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
          Hazır mısın,{'\n'}{data.name || 'arkadaş'}? 🚀
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).duration(500)} style={styles.subtitle}>
          FitBite'ın güçlü özelliklerini keşfet
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.footer}>
        <OnboardingButton title="Haydi başlayalım! 🌿" onPress={onNext} loading={loading} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  topSection: {
    height: 180,
    marginBottom: Spacing.lg,
  },
  demoScreen: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCamera: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: '60%',
    height: 2,
    backgroundColor: Colors.primaryLight + '80',
    top: '50%',
  },
  focusCornerTL: {
    position: 'absolute', top: 20, left: 30,
    width: 24, height: 24,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderColor: Colors.primaryLight,
  },
  focusCornerTR: {
    position: 'absolute', top: 20, right: 30,
    width: 24, height: 24,
    borderTopWidth: 3, borderRightWidth: 3,
    borderColor: Colors.primaryLight,
  },
  focusCornerBL: {
    position: 'absolute', bottom: 20, left: 30,
    width: 24, height: 24,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderColor: Colors.primaryLight,
  },
  focusCornerBR: {
    position: 'absolute', bottom: 20, right: 30,
    width: 24, height: 24,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderColor: Colors.primaryLight,
  },
  resultCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultEmoji: { fontSize: 28 },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  resultCalorie: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  content: { flex: 1 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: FontSize.xxl * 1.25,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  featureList: { gap: Spacing.sm },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryPale + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: FontSize.xs * 1.4,
  },
  footer: { gap: Spacing.sm, paddingTop: Spacing.md },
});
