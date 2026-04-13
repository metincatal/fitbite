import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function StoryLifestyle({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      {/* Dekoratif arka plan */}
      <Animated.View entering={FadeIn.duration(1000)} style={styles.bgDecoration}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </Animated.View>

      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(200).duration(700)} style={styles.overline}>
          Senin için buradayız
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(400).duration(700)} style={styles.headline}>
          Her öğün bir{'\n'}seçim, her gün{'\n'}bir şans.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(700).duration(600)} style={styles.body}>
          Büyük değişimler küçük{'\n'}adımlarla başlar.{'\n'}Hadi o ilk adımı atalım.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(1000).duration(500)} style={styles.footer}>
        <OnboardingButton title="Devam Et →" onPress={onNext} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" style={styles.backBtn} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bgDecoration: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.primaryDark + '60',
    top: -80,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primaryLight + '30',
    top: SCREEN_HEIGHT * 0.3,
    left: -60,
  },
  circle3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primaryPale + '20',
    bottom: 200,
    right: -40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  overline: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: FontSize.xxxl + 4,
    fontWeight: '800',
    color: Colors.textLight,
    lineHeight: (FontSize.xxxl + 4) * 1.25,
  },
  body: {
    fontSize: FontSize.lg,
    fontWeight: '400',
    color: Colors.textLight + 'CC',
    lineHeight: FontSize.lg * 1.6,
    marginTop: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  backBtn: {},
});
