// Onboarding 02 — Philosophy
// "Biz böyle inanıyoruz" — YERİNE çaprazlı karşıtlık çifti listesi.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnbColors, OnbFoot, SERIF, MONO } from '../shared/OnbDesign';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const PAIRS = [
  ['Sezgi',  'Kısıtlama'],
  ['Şefkat', 'Ceza'],
  ['Denge',  'Aşırılık'],
  ['Keyif',  'Suçluluk'],
];

export function StoryManifesto({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>FİTBİTE FELSEFESİ</Text>
        <Text style={styles.title}>
          Biz böyle{'\n'}
          <Text style={styles.titleItalic}>inanıyoruz.</Text>
        </Text>

        <View style={styles.pairs}>
          {PAIRS.map(([yes, no], i) => (
            <View key={i} style={styles.pairRow}>
              <Text style={styles.pairNo}>{no}</Text>
              <Text style={styles.pairLabel}>YERİNE</Text>
              <Text style={styles.pairYes}>
                <Text style={{ fontStyle: 'italic' }}>{yes}</Text>
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.quoteBox}>
          <Text style={styles.quoteLabel}>ÜÇ SÖZ</Text>
          <Text style={styles.quoteText}>
            İlaç yok · Kısıt yok ·{' '}
            <Text style={{ fontStyle: 'italic', color: OnbColors.terracotta }}>
              Yargı yok
            </Text>
            .
          </Text>
        </View>
      </View>

      <OnbFoot cta="Hemfikirim" onNext={onNext} onBack={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnbColors.bg,
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 0,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2.2,
    color: OnbColors.terracotta,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
    color: OnbColors.ink,
    fontFamily: SERIF,
    letterSpacing: -1,
    marginBottom: 38,
  },
  titleItalic: {
    fontStyle: 'italic',
    color: OnbColors.ink,
    fontFamily: SERIF,
  },
  pairs: {
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
  },
  pairYes: {
    flex: 1,
    fontSize: 28,
    color: OnbColors.ink,
    fontFamily: SERIF,
    textAlign: 'right',
  },
  pairLabel: {
    fontSize: 10,
    color: OnbColors.ink3,
    letterSpacing: 2,
    fontFamily: MONO,
    paddingHorizontal: 14,
    textTransform: 'uppercase',
  },
  pairNo: {
    flex: 1,
    fontSize: 22,
    color: OnbColors.ink3,
    fontFamily: SERIF,
    textDecorationLine: 'line-through',
    textDecorationColor: OnbColors.terracotta,
  },
  quoteBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
    marginBottom: 16,
  },
  quoteLabel: {
    fontSize: 9.5,
    letterSpacing: 2,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 18,
    color: OnbColors.ink,
    fontFamily: SERIF,
  },
});
