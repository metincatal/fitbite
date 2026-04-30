// Onboarding 13 — Work Day (PAL)
// Stacked tiles with active ink background.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ITEMS = [
  { k: 'desk',     label: 'Masa başında',        hint: 'Neredeyse tüm gün oturuyorum',           pal: 1.2 },
  { k: 'light',    label: 'Karışık',              hint: 'Kısmen ayakta, kısmen oturarak',          pal: 1.4 },
  { k: 'moderate', label: 'Ayakta / yürüyerek',  hint: 'Çoğunlukla ayaktayım, hareket ediyorum', pal: 1.6 },
  { k: 'heavy',    label: 'Fiziksel iş',          hint: 'Ağır kaldırma, inşaat, saha',             pal: 1.9 },
] as const;

type OccKey = typeof ITEMS[number]['k'];

export function OccupationalActivity({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const selected = data.occupational_activity;
  const isValid = !!selected;

  return (
    <OnbShell step={10} total={26}>
      <OnbHead
        kicker="Yaşam tarzı · 1/2"
        title="İş günün"
        italic="nasıl geçiyor?"
        subtitle="Gün boyu harcadığın enerji kalori hesabının yarısı. PAL (Physical Activity Level) katsayısı buradan gelir."
      />

      <View style={styles.body}>
        {ITEMS.map((it, i) => {
          const sel = selected === it.k;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => updateField('occupational_activity', it.k as OccKey)}
              style={[
                styles.tile,
                i === 0 && styles.tileFirst,
                sel && styles.tileSel,
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.tileBody}>
                <Text style={[styles.tileLabel, sel && styles.tileLabelSel]}>
                  {it.label}
                </Text>
                <Text style={[styles.tileHint, sel && { opacity: 0.7 }]}>
                  {it.hint}
                </Text>
              </View>
              <Text style={[styles.palText, sel && { color: OnbColors.bg }]}>
                PAL {it.pal.toFixed(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} dim={!isValid} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  tileFirst: {
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.ink,
  },
  tileSel: {
    backgroundColor: OnbColors.ink,
    borderColor: OnbColors.ink,
  },
  tileBody: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 22,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  tileLabelSel: {
    color: OnbColors.bg,
    fontStyle: 'italic',
  },
  tileHint: {
    fontSize: 12,
    color: OnbColors.ink2,
    marginTop: 2,
  },
  palText: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: MONO,
    color: OnbColors.ink2,
  },
});
