// Onboarding 26 — Ready (final screen)
// Dark ink background, plate donut SVG.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { OnbColors, SERIF, MONO } from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

function PlateSvg({ kcal }: { kcal: number }) {
  const cx = 110, cy = 110;
  const slices = [
    { s: -90, e: 0,   c: '#7CB9E8' },
    { s: 0,   e: 110, c: '#A8E6CF' },
    { s: 110, e: 200, c: '#FFD3A0' },
    { s: 200, e: 270, c: OnbColors.terracotta },
  ];

  function polar(a: number, r: number): [number, number] {
    return [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r];
  }

  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Circle cx={cx} cy={cy} r={94} fill="none" stroke={OnbColors.bg} strokeWidth="0.8" opacity="0.4" />
      <Circle cx={cx} cy={cy} r={70} fill="none" stroke={OnbColors.bg} strokeWidth="0.5" opacity="0.6" />
      {slices.map((sl, i) => {
        const [x1, y1] = polar(sl.s, 88);
        const [x2, y2] = polar(sl.e, 88);
        const [xi1, yi1] = polar(sl.e, 26);
        const [xi2, yi2] = polar(sl.s, 26);
        const large = sl.e - sl.s > 180 ? 1 : 0;
        return (
          <Path
            key={i}
            d={`M ${x1} ${y1} A 88 88 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A 26 26 0 ${large} 0 ${xi2} ${yi2} Z`}
            fill={sl.c}
            opacity="0.85"
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={22} fill={OnbColors.ink} />
      <SvgText x={cx} y={cx - 4} textAnchor="middle" fontSize="8" fontFamily={MONO} fill="rgba(242,239,230,0.6)" letterSpacing="1.8">
        HEDEF
      </SvgText>
      <SvgText x={cx} y={cx + 10} textAnchor="middle" fontSize="14" fontFamily={SERIF} fill={OnbColors.bg}>
        {kcal}
      </SvgText>
    </Svg>
  );
}

export function PhotoDemo({ onNext, onBack, loading = false }: Props) {
  const { data } = useOnboardingData();
  const name = data.name || 'arkadaş';

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Kurulum tamamlandı · 26 / 26</Text>

      <View style={styles.svgWrap}>
        <PlateSvg kcal={1606} />
      </View>

      <Text style={styles.headline}>
        Tabağın hazır,{'\n'}
        <Text style={styles.headlineItalic}>{name}.</Text>
      </Text>
      <Text style={styles.body}>
        İlk öğünü kaydetmek için ortadaki diyaframı dokun. Bugün küçük bir adım yeter.
      </Text>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onNext}
          style={[styles.cta, loading && { opacity: 0.7 }]}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.ctaLeft}>↵</Text>
          <Text style={styles.ctaCenter}><Text style={styles.ctaItalic}>FitBite'a giriş</Text></Text>
          <Text style={styles.ctaRight}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnbColors.ink,
    paddingTop: 70,
    paddingHorizontal: 28,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 4.8,
    fontFamily: MONO,
    color: 'rgba(242,239,230,0.55)',
    textTransform: 'uppercase',
  },
  svgWrap: {
    alignItems: 'center',
    marginTop: 30,
  },
  headline: {
    fontSize: 44,
    fontFamily: SERIF,
    lineHeight: 48,
    marginTop: 30,
    letterSpacing: -0.88,
    color: OnbColors.bg,
  },
  headlineItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  body: {
    fontSize: 13.5,
    color: 'rgba(242,239,230,0.7)',
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 300,
  },
  footer: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 36,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: OnbColors.bg,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  ctaLeft: {
    fontSize: 10,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: OnbColors.ink,
    opacity: 0.55,
  },
  ctaCenter: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  ctaItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  ctaRight: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
});
