// Onboarding 10 — Intermission
// Dark ink background, concentric rings SVG, "Her öğün bir seçim".

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { OnbColors, SERIF, MONO } from '../shared/OnbDesign';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

function ConcentricRings() {
  const radii = [110, 88, 68, 48, 30, 14];
  const cx = 120, cy = 120;
  // Orbiting dots
  const dots: [number, number, number, string][] = [
    [cx + 88, cy, 0.6, '#F4845F'],
    [cx - 68, cy, 0.5, '#52B788'],
    [cx, cy - 48, 0.7, '#FFB703'],
    [cx + 30, cy + 110, 0.4, '#E85D3C'],
  ];
  return (
    <Svg width={240} height={240} viewBox="0 0 240 240">
      {radii.map((r, i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={OnbColors.bg}
          strokeWidth={i === 0 ? 1 : 0.5}
          opacity={0.15 + i * 0.1}
        />
      ))}
      <Circle cx={cx} cy={cy} r={6} fill={OnbColors.terracotta} />
      {dots.map(([x, y, op, c], i) => (
        <Circle key={i} cx={x} cy={y} r={5} fill={c} opacity={op} />
      ))}
    </Svg>
  );
}

export function StoryLifestyle({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>ARA · 1/2 · DURAK</Text>

      <View style={styles.svgWrap}>
        <ConcentricRings />
      </View>

      <Text style={styles.headline}>
        Her öğün bir seçim,{'\n'}
        <Text style={styles.headlineItalic}>her gün bir şans.</Text>
      </Text>
      <Text style={styles.body}>
        Büyük değişimler küçük adımlarla başlar. Şimdi planını şekillendirelim.
      </Text>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onNext} style={styles.cta} activeOpacity={0.85}>
          <Text style={styles.ctaLeft}>↵</Text>
          <Text style={styles.ctaCenter}>Devam edelim</Text>
          <Text style={styles.ctaRight}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← GERİ</Text>
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
    color: 'rgba(242,239,230,0.55)',
    fontFamily: MONO,
    textTransform: 'uppercase',
  },
  svgWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  headline: {
    fontSize: 44,
    fontFamily: SERIF,
    lineHeight: 48,
    marginTop: 40,
    letterSpacing: -0.88,
    color: OnbColors.bg,
  },
  headlineItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  body: {
    fontSize: 13,
    color: 'rgba(242,239,230,0.7)',
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 280,
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
    color: OnbColors.ink,
    opacity: 0.55,
    fontFamily: MONO,
  },
  ctaCenter: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  ctaRight: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  backText: {
    fontSize: 10.5,
    letterSpacing: 2.88,
    color: 'rgba(242,239,230,0.6)',
    fontFamily: MONO,
    textTransform: 'uppercase',
  },
});
