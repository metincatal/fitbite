// Onboarding 07 — Health Conditions
// Pill-shaped multi-select chips.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { MedicalCondition } from '../../../lib/constants';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const CONDITIONS: { k: MedicalCondition; label: string; hint: string }[] = [
  { k: 'none',          label: 'Hiçbiri',           hint: 'Bilinen bir durum yok' },
  { k: 'diabetes',      label: 'Diyabet',            hint: 'Tip 1 / 2' },
  { k: 'hypertension',  label: 'Yüksek Tansiyon',   hint: 'Hipertansiyon' },
  { k: 'heart_disease', label: 'Kalp Rahatsızlığı', hint: 'Kardiyovasküler' },
  { k: 'kidney_disease',label: 'Böbrek Hastalığı',  hint: 'KBH dahil' },
  { k: 'thyroid',       label: 'Tiroid',             hint: 'Hipo / Hiper' },
  { k: 'pregnancy',     label: 'Hamileyim',          hint: 'Trimester farklı' },
  { k: 'lactation',     label: 'Emziriyorum',        hint: '+500 kcal' },
];

export function MedicalConditions({ onNext, onBack }: Props) {
  const { data, toggleMedicalCondition } = useOnboardingData();
  const selected = data.medical_conditions;

  return (
    <OnbShell step={5} total={26}>
      <OnbHead
        kicker="Klinik bağlam"
        title="Bilmemizi istediğin bir"
        italic="durum var mı?"
        subtitle="Önerileri buna göre hassaslaştırırız. Doktor tavsiyesinin yerini tutmaz."
      />

      <View style={styles.body}>
        <View style={styles.chipGrid}>
          {CONDITIONS.map((c) => {
            const sel = selected.includes(c.k);
            return (
              <TouchableOpacity
                key={c.k}
                onPress={() => toggleMedicalCondition(c.k)}
                style={[styles.chip, sel && styles.chipActive]}
                activeOpacity={0.8}
              >
                <View style={[styles.chipRadio, sel && styles.chipRadioActive]}>
                  {sel ? <View style={styles.chipRadioDot} /> : null}
                </View>
                <Text style={[styles.chipLabel, sel && styles.chipLabelActive]}>
                  {c.label}
                </Text>
                <Text style={[styles.chipHint, sel && { opacity: 0.65 }]}>
                  {c.hint}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>BİRDEN FAZLA SEÇEBİLİRSİN</Text>
          <Text style={styles.infoText}>
            "Hiçbiri" işaretlenince diğerleri temizlenir. Ciddi durumlar için uzman desteği önerilir.
          </Text>
        </View>
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: OnbColors.ink,
  },
  chipRadio: {
    width: 14,
    height: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRadioActive: {
    borderColor: OnbColors.bg,
  },
  chipRadioDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: OnbColors.bg,
  },
  chipLabel: {
    fontSize: 13,
    color: OnbColors.ink,
  },
  chipLabelActive: {
    color: OnbColors.bg,
  },
  chipHint: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: OnbColors.ink3,
    fontFamily: MONO,
  },
  infoBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  infoLabel: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: OnbColors.ink2,
    lineHeight: 18,
  },
});
