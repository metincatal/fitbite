// Onboarding 15 — Diet Style
// 2-col grid, single select, ink bg when active.

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

const ITEMS = [
  { k: 'normal',         label: 'Normal',           hint: 'HER ŞEY SERBEST' },
  { k: 'vegetarian',     label: 'Vejetaryen',       hint: 'ET YOK, SÜT/YUMURTA VAR' },
  { k: 'vegan',          label: 'Vegan',            hint: 'HAYVANSAL ÜRÜN YOK' },
  { k: 'pescatarian',    label: 'Pesketaryen',      hint: 'BALIK + VEJETARİYEN' },
  { k: 'keto',           label: 'Keto',             hint: 'DÜŞÜK KARB, YÜKSEK YAĞ' },
  { k: 'paleo',          label: 'Paleo',            hint: 'DOĞAL, İŞLENMEMİŞ' },
  { k: 'mediterranean',  label: 'Akdeniz',          hint: 'ZEYTİNYAĞI, SEBZE, BALIK' },
  { k: 'gluten_free',    label: 'Glutensiz',        hint: 'GLUTENSİZ' },
  { k: 'flexitarian',    label: 'Esnek Vejeteryan', hint: 'ÇOĞUNLUKLA BİTKİSEL' },
  { k: 'lactose_free',   label: 'Laktozsuz',        hint: 'SÜT ÜRÜNLERİNDEN KAÇINMA' },
] as const;

type DietKey = typeof ITEMS[number]['k'];

export function DietType({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const selected = data.diet_type;

  return (
    <OnbShell step={12} total={26}>
      <OnbHead
        kicker="Tabak"
        title="Beslenme tarzın"
        italic="ne?"
        subtitle="Tarif ve öneri sistemimiz buna göre ayarlanır. Sonra değiştirebilirsin."
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {ITEMS.map((it) => {
            const sel = selected === it.k;
            return (
              <TouchableOpacity
                key={it.k}
                onPress={() => updateField('diet_type', it.k as DietKey)}
                style={[styles.cell, sel && styles.cellSel]}
                activeOpacity={0.8}
              >
                <Text style={[styles.label, sel && styles.labelSel]}>{it.label}</Text>
                <Text style={[styles.hint, sel && { opacity: 0.65 }]}>{it.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    borderLeftWidth: 0.5,
    borderLeftColor: OnbColors.line,
    marginBottom: 16,
  },
  cell: {
    width: '50%',
    padding: 14,
    borderRightWidth: 0.5,
    borderRightColor: OnbColors.line,
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
    backgroundColor: 'transparent',
    minHeight: 70,
  },
  cellSel: {
    backgroundColor: OnbColors.ink,
  },
  label: {
    fontSize: 18,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  labelSel: {
    color: OnbColors.bg,
    fontStyle: 'italic',
  },
  hint: {
    fontSize: 9.5,
    letterSpacing: 1,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginTop: 4,
  },
});
