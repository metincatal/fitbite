// Onboarding 20 — Data Safety
// BigShield SVG centered, 3 principle rows.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { OnbColors, SERIF, MONO } from '../shared/OnbDesign';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const PRINCIPLES = [
  { label: 'Veriler şifrelenir',      hint: 'Tüm verilerin AES-256 ile uçtan uca korunur.' },
  { label: 'Satılmaz, paylaşılmaz',   hint: 'Üçüncü taraflarla paylaşmıyoruz; reklam izlemeye kapalı.' },
  { label: 'İstediğinde sil',         hint: 'Hesabını ve tüm verilerini bir tıkla silebilirsin (KVKK).' },
];

function BigShield() {
  const cx = 60, cy = 70;
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * 50, cy + Math.sin(a) * 50];
  });
  return (
    <Svg width={120} height={140} viewBox="0 0 120 140">
      <Path
        d="M60 8 L 110 22 V 70 Q 110 110 60 132 Q 10 110 10 70 V 22 Z"
        fill={OnbColors.surface}
        stroke={OnbColors.ink}
        strokeWidth="1"
      />
      <Path
        d="M60 16 L 102 28 V 70 Q 102 104 60 122 Q 18 104 18 70 V 28 Z"
        fill="none"
        stroke={OnbColors.ink}
        strokeWidth="0.4"
        opacity="0.5"
      />
      <Rect x="44" y="60" width="32" height="28" rx="2" fill={OnbColors.ink} />
      <Path d="M50 60 V 50 A 10 10 0 0 1 70 50 V 60" fill="none" stroke={OnbColors.ink} strokeWidth="2" />
      <Circle cx="60" cy="72" r="3" fill={OnbColors.terracotta} />
      <Line x1="60" y1="72" x2="60" y2="80" stroke={OnbColors.terracotta} strokeWidth="2" />
      {dots.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r="0.8" fill={OnbColors.ink} opacity="0.3" />
      ))}
      <SvgText x="60" y="135" textAnchor="middle" fontSize="8" fontFamily={MONO} fill={OnbColors.ink3} letterSpacing="3.2">
        AES-256
      </SvgText>
    </Svg>
  );
}

export function StoryPrivacy({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.shieldWrap}>
        <BigShield />
      </View>

      <Text style={styles.kicker}>Gizlilik · KVKK uyumlu</Text>
      <Text style={styles.title}>
        Verilerin <Text style={styles.titleItalic}>güvende.</Text>
      </Text>
      <Text style={styles.subtitle}>
        Sağlık verilerinin ne kadar özel olduğunu biliyoruz. Üç prensiple çalışıyoruz.
      </Text>

      <View style={styles.list}>
        {PRINCIPLES.map((p, i) => (
          <View
            key={p.label}
            style={[
              styles.principleRow,
              i === PRINCIPLES.length - 1 && styles.principleRowLast,
            ]}
          >
            <Text style={styles.principleNum}>0{i + 1}</Text>
            <View style={styles.principleBody}>
              <Text style={styles.principleLabel}>{p.label}</Text>
              <Text style={styles.principleHint}>{p.hint}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onNext} style={styles.cta} activeOpacity={0.85}>
          <Text style={styles.ctaLeft}>↵</Text>
          <Text style={styles.ctaCenter}>Anladım, devam et</Text>
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
    backgroundColor: OnbColors.bg,
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  shieldWrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontFamily: MONO,
    color: OnbColors.terracotta,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 38,
    fontFamily: SERIF,
    lineHeight: 42,
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: -0.38,
    color: OnbColors.ink,
  },
  titleItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
  subtitle: {
    fontSize: 13,
    color: OnbColors.ink2,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    alignSelf: 'center',
  },
  list: {
    marginTop: 28,
  },
  principleRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  principleRowLast: {
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
  },
  principleNum: {
    fontSize: 28,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: OnbColors.terracotta,
    width: 36,
  },
  principleBody: {
    flex: 1,
  },
  principleLabel: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  principleHint: {
    fontSize: 12.5,
    color: OnbColors.ink2,
    marginTop: 3,
    lineHeight: 18,
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
    backgroundColor: OnbColors.ink,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  ctaLeft: {
    fontSize: 10,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: OnbColors.bg,
    opacity: 0.55,
  },
  ctaCenter: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
  ctaRight: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  backText: {
    fontSize: 10.5,
    letterSpacing: 2.88,
    fontFamily: MONO,
    color: OnbColors.ink3,
    textTransform: 'uppercase',
  },
});
