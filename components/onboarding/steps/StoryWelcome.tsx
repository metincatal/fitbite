// Onboarding 01 — Splash
// Parchment bg, büyük serif 2026, terracotta italic vurgu.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnbColors, SERIF, MONO } from '../shared/OnbDesign';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StoryWelcome({ onNext }: Props) {
  return (
    <View style={styles.container}>
      {/* Corner registration marks */}
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />

      <Animated.Text entering={FadeIn.delay(0).duration(700)} style={styles.versionLabel}>
        FİTBİTE · SÜRÜM 2026
      </Animated.Text>

      {/* Huge serif year */}
      <Animated.Text entering={FadeIn.delay(200).duration(800)} style={styles.year}>
        2026
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(400).duration(500)} style={styles.yearSub}>
        BU YILIN BİR YENİ SÖZÜ.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(700).duration(600)}>
        <Text style={styles.headline}>
          Beslenme bir ceza değil,{'\n'}
          <Text style={styles.headlineAccent}>bir yaşam biçimi.</Text>
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(1000).duration(600)} style={styles.body}>
        FitBite seni saymakla değil — hissetmekle, fark etmekle, sevmekle tanıştıracak.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(1400).duration(500)} style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.ctaLeft}>BAŞLAT</Text>
          <Text style={styles.ctaCenter}>
            <Text style={styles.ctaItalic}>Başlayalım</Text>
          </Text>
          <Text style={styles.ctaRight}>→</Text>
        </TouchableOpacity>
        <Text style={styles.footNote}>~ 26 ADIM · 3–4 DAKİKA</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnbColors.bg,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  // Corner marks
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: OnbColors.ink,
    opacity: 0.4,
  },
  tl: { top: 70, left: 20, borderTopWidth: 0.5, borderLeftWidth: 0.5 },
  tr: { top: 70, right: 20, borderTopWidth: 0.5, borderRightWidth: 0.5 },
  bl: { bottom: 30, left: 20, borderBottomWidth: 0.5, borderLeftWidth: 0.5 },
  br: { bottom: 30, right: 20, borderBottomWidth: 0.5, borderRightWidth: 0.5 },

  versionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
  },
  year: {
    fontSize: 130,
    lineHeight: 130,
    color: OnbColors.ink,
    fontFamily: SERIF,
    letterSpacing: -6,
    marginTop: 40,
  },
  yearSub: {
    fontSize: 9,
    letterSpacing: 3,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 40,
  },
  headline: {
    fontSize: 36,
    lineHeight: 40,
    color: OnbColors.ink,
    fontFamily: SERIF,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
    fontFamily: SERIF,
  },
  body: {
    fontSize: 13.5,
    color: OnbColors.ink2,
    marginTop: 18,
    lineHeight: 21,
    maxWidth: 280,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cta: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: OnbColors.ink,
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaLeft: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: MONO,
    color: OnbColors.bg,
    opacity: 0.55,
  },
  ctaCenter: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
  ctaItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
    fontFamily: SERIF,
    fontSize: 19,
  },
  ctaRight: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
  footNote: {
    marginTop: 14,
    fontSize: 9,
    letterSpacing: 2.2,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
