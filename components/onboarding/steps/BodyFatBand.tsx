// Onboarding 09 — Body Fat Band
// Horizontal strip tiers + list, optional skip.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const TIERS = [
  { k: 'lean',     label: 'Zayıf',    range: '%10–15', tone: 0.30 },
  { k: 'athletic', label: 'Atletik',  range: '%15–22', tone: 0.45 },
  { k: 'average',  label: 'Ortalama', range: '%22–30', tone: 0.62 },
  { k: 'high',     label: 'Yüksek',   range: '%30+',   tone: 0.80 },
] as const;

type TierKey = typeof TIERS[number]['k'];

function tierBg(tone: number) {
  // Approximate oklch lightness via simple lerp from surface to ink
  const l = Math.round(250 - tone * 140);
  return `rgb(${l}, ${Math.round(l * 0.97)}, ${Math.round(l * 0.93)})`;
}

export function BodyFatBand({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const selected = data.body_fat_band as TierKey | null | undefined;

  const select = (k: TierKey) => updateField('body_fat_band', k);
  const skip = () => {
    updateField('body_fat_band', null as any);
    onNext();
  };

  return (
    <OnbShell step={7} total={26}>
      <OnbHead
        kicker="Biyometrik · 3/3 · Opsiyonel"
        title="Vücut yağ oranını"
        italic="biliyor musun?"
        subtitle="Bilmiyorsan atla — Mifflin-St Jeor formülünü kullanırız. Biliyorsan Katch-McArdle ile daha hassas."
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Horizontal strip */}
        <View style={styles.strip}>
          {TIERS.map((t, i) => {
            const sel = selected === t.k;
            return (
              <TouchableOpacity
                key={t.k}
                onPress={() => select(t.k)}
                style={[
                  styles.stripCell,
                  i > 0 && styles.stripCellBorder,
                  { backgroundColor: sel ? OnbColors.ink : tierBg(t.tone) },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.stripNum, sel && { color: OnbColors.bg }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {TIERS.map((t) => {
          const sel = selected === t.k;
          return (
            <TouchableOpacity
              key={t.k}
              onPress={() => select(t.k)}
              style={styles.row}
              activeOpacity={0.8}
            >
              <Text style={[styles.rowLabel, sel && styles.rowLabelActive]}>
                {t.label}
              </Text>
              <Text style={styles.rowRange}>{t.range}</Text>
              <View style={[styles.radio, sel && styles.radioActive]} />
            </TouchableOpacity>
          );
        })}

        {/* Hint box */}
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Nasıl ölçerim?</Text>
          <Text style={styles.hintText}>
            Caliper, akıllı tartı (Tanita) veya DEXA en hassası. Emin değilsen{' '}
            <Text style={{ color: OnbColors.terracotta, fontFamily: SERIF, fontStyle: 'italic' }}>
              "atla"
            </Text>
            .
          </Text>
        </View>

        {/* Skip ghost */}
        <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Bilmiyorum — atla</Text>
        </TouchableOpacity>
      </ScrollView>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 6,
  },
  strip: {
    flexDirection: 'row',
    height: 60,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    overflow: 'hidden',
  },
  stripCell: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 4,
  },
  stripCellBorder: {
    borderLeftWidth: 0.5,
    borderLeftColor: OnbColors.ink,
  },
  stripNum: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: MONO,
    color: OnbColors.ink2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  rowLabel: {
    fontSize: 24,
    fontFamily: SERIF,
    color: OnbColors.ink,
    flex: 1,
  },
  rowLabelActive: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  rowRange: {
    fontSize: 12,
    letterSpacing: 1.4,
    color: OnbColors.ink2,
    fontFamily: MONO,
    marginHorizontal: 12,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: OnbColors.ink,
    backgroundColor: 'transparent',
  },
  radioActive: {
    backgroundColor: OnbColors.ink,
  },
  hintBox: {
    marginTop: 18,
    padding: 12,
    backgroundColor: OnbColors.surface2,
    borderLeftWidth: 2,
    borderLeftColor: OnbColors.terracotta,
  },
  hintTitle: {
    fontSize: 14,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: OnbColors.ink,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 11.5,
    color: OnbColors.ink2,
    lineHeight: 17,
  },
  skipBtn: {
    marginTop: 14,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  skipText: {
    fontSize: 16,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: OnbColors.ink3,
    textDecorationLine: 'underline',
    textDecorationColor: OnbColors.line,
  },
});
