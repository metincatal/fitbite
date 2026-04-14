import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const { width: W, height: H } = Dimensions.get('window');

function FoodIllustration() {
  return (
    <Svg width={W} height={H * 0.55} viewBox={`0 0 ${W} ${H * 0.55}`}>
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#52B788" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#1B4332" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="plate" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
        </RadialGradient>
      </Defs>

      {/* Arkaplan parıltısı */}
      <Ellipse cx={W / 2} cy={H * 0.25} rx={W * 0.7} ry={H * 0.28} fill="url(#bg)" />

      {/* Ana tabak */}
      <Circle cx={W / 2} cy={H * 0.28} r={W * 0.32} fill="url(#plate)" />
      <Circle cx={W / 2} cy={H * 0.28} r={W * 0.32} stroke="#FFFFFF" strokeWidth={1} strokeOpacity={0.15} fill="none" />

      {/* Yeşillik — yapraklar */}
      <Path
        d={`M${W * 0.38} ${H * 0.18} Q${W * 0.28} ${H * 0.10} ${W * 0.22} ${H * 0.14} Q${W * 0.32} ${H * 0.20} ${W * 0.38} ${H * 0.18}`}
        fill="#52B788"
        fillOpacity={0.8}
      />
      <Path
        d={`M${W * 0.42} ${H * 0.15} Q${W * 0.36} ${H * 0.07} ${W * 0.32} ${H * 0.12} Q${W * 0.40} ${H * 0.17} ${W * 0.42} ${H * 0.15}`}
        fill="#B7E4C7"
        fillOpacity={0.7}
      />
      <Path
        d={`M${W * 0.60} ${H * 0.16} Q${W * 0.70} ${H * 0.08} ${W * 0.76} ${H * 0.13} Q${W * 0.66} ${H * 0.19} ${W * 0.60} ${H * 0.16}`}
        fill="#52B788"
        fillOpacity={0.8}
      />

      {/* Tabaktaki yiyecekler — renkli daireler */}
      <Circle cx={W * 0.44} cy={H * 0.25} r={W * 0.08} fill="#F4845F" fillOpacity={0.85} />
      <Circle cx={W * 0.58} cy={H * 0.23} r={W * 0.065} fill="#FFB703" fillOpacity={0.85} />
      <Circle cx={W * 0.50} cy={H * 0.32} r={W * 0.055} fill="#52B788" fillOpacity={0.9} />
      <Circle cx={W * 0.39} cy={H * 0.33} r={W * 0.04} fill="#B7E4C7" fillOpacity={0.8} />
      <Circle cx={W * 0.62} cy={H * 0.31} r={W * 0.045} fill="#F9B8A3" fillOpacity={0.8} />

      {/* Küçük dekor noktaları */}
      <Circle cx={W * 0.20} cy={H * 0.35} r={4} fill="#52B788" fillOpacity={0.4} />
      <Circle cx={W * 0.80} cy={H * 0.20} r={6} fill="#F4845F" fillOpacity={0.3} />
      <Circle cx={W * 0.15} cy={H * 0.15} r={3} fill="#FFB703" fillOpacity={0.4} />
      <Circle cx={W * 0.85} cy={H * 0.38} r={5} fill="#52B788" fillOpacity={0.35} />
      <Circle cx={W * 0.25} cy={H * 0.42} r={7} fill="#B7E4C7" fillOpacity={0.25} />
    </Svg>
  );
}

export function StoryLifestyle({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      {/* Görsel alan */}
      <Animated.View entering={FadeIn.duration(900)} style={styles.illustration}>
        <FoodIllustration />
      </Animated.View>

      {/* Metin içeriği */}
      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.overline}>
          Senin için buradayız
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(600).duration(700)} style={styles.headline}>
          Her öğün bir{'\n'}seçim,{'\n'}her gün bir şans.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(900).duration(600)} style={styles.body}>
          Büyük değişimler küçük{'\n'}adımlarla başlar.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.delay(1100).duration(500)} style={styles.footer}>
        <OnboardingButton title="Devam Et →" onPress={onNext} />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" style={styles.backBtn} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
  },
  illustration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    // Alt içerik görselin üstünde kalır
    marginTop: H * 0.42,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryLight,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  headline: {
    fontSize: FontSize.xxxl + 2,
    fontWeight: '800',
    color: Colors.textLight,
    lineHeight: (FontSize.xxxl + 2) * 1.2,
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: FontSize.md,
    fontWeight: '400',
    color: Colors.textLight + 'BB',
    lineHeight: FontSize.md * 1.6,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  backBtn: {},
});
