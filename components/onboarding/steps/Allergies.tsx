// Onboarding 16 — Allergies
// Toggle list, skip note at bottom.

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
  { k: 'gluten', label: 'Gluten',              hint: 'Buğday, arpa, çavdar' },
  { k: 'lactose',label: 'Laktoz',              hint: 'Süt ürünlerindeki şeker' },
  { k: 'egg',    label: 'Yumurta',             hint: 'Akı veya sarısı' },
  { k: 'nuts',   label: 'Fıstık / Kuruyemiş',  hint: 'Ciddi alerjik reaksiyon' },
  { k: 'sea',    label: 'Deniz Ürünleri',      hint: 'Balık, kabuklu' },
  { k: 'soy',    label: 'Soya',                hint: 'Birçok işlenmiş gıdada' },
  { k: 'sesame', label: 'Susam',               hint: 'Ekmek, tahin' },
] as const;

type AllergyKey = typeof ITEMS[number]['k'];

function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.toggle, on && styles.toggleOn]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </View>
  );
}

export function Allergies({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();
  const selected: string[] = data.allergies ?? [];

  return (
    <OnbShell step={13} total={26}>
      <OnbHead
        kicker="Tabak · uyarılar"
        title="Alerjin veya intoleransın"
        italic="var mı?"
        subtitle="Tarif önerilerinde ve fotoğraftan yemek tanımada bunları göz önüne alacağız."
      />

      <View style={styles.body}>
        {ITEMS.map((it) => {
          const sel = selected.includes(it.k);
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => toggleArrayItem('allergies', it.k)}
              style={styles.row}
              activeOpacity={0.8}
            >
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, sel && styles.rowLabelSel]}>
                  {it.label}
                </Text>
                <Text style={styles.rowHint}>{it.hint}</Text>
              </View>
              <Toggle on={sel} />
            </TouchableOpacity>
          );
        })}
        <View style={styles.divider} />

        <Text style={styles.skipNote}>HİÇBİRİ YOKSA DİREKT DEVAM ET</Text>
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  rowLabelSel: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  rowHint: {
    fontSize: 11.5,
    color: OnbColors.ink3,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 22,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: OnbColors.ink,
  },
  knob: {
    width: 17,
    height: 17,
    borderRadius: 999,
    backgroundColor: OnbColors.ink,
  },
  knobOn: {
    backgroundColor: OnbColors.terracotta,
    alignSelf: 'flex-end',
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    marginTop: 0,
  },
  skipNote: {
    marginTop: 16,
    fontSize: 9.5,
    letterSpacing: 1.8,
    fontFamily: MONO,
    color: OnbColors.ink3,
    textAlign: 'center',
  },
});
