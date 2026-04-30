// Onboarding 08 — Body Measurements
// +/- stepper, BMI + fark stat kutucukları.

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

function RulerInput({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
  accent,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  return (
    <View style={styles.rulerBlock}>
      <View style={styles.rulerHeader}>
        <Text style={styles.rulerLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.rulerRange}>{min}–{max} {unit}</Text>
      </View>
      <View style={styles.rulerValueRow}>
        <TouchableOpacity onPress={dec} style={styles.stepBtn} activeOpacity={0.7}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.rulerValue, accent && { color: OnbColors.terracotta }]}>
          {value}
          <Text style={styles.rulerUnit}> {unit}</Text>
        </Text>
        <TouchableOpacity onPress={inc} style={styles.stepBtn} activeOpacity={0.7}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      {/* Visual track */}
      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${((value - min) / (max - min)) * 100}%` as any,
              backgroundColor: accent ? OnbColors.terracotta : OnbColors.ink,
            },
          ]}
        />
      </View>
    </View>
  );
}

function StatBox({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, accent && { color: OnbColors.terracotta }]}>
        {value}
      </Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

export function BodyMetrics({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const height = parseFloat(data.height_cm) || 170;
  const weight = parseFloat(data.weight_kg) || 70;
  const target = parseFloat(data.target_weight_kg) || 65;

  const bmi = +(weight / ((height / 100) ** 2)).toFixed(1);
  const diff = +(target - weight).toFixed(1);
  const bmiLabel = bmi < 18.5 ? 'Düşük' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Fazla' : 'Yüksek';
  const diffLabel = diff < 0 ? 'Vereceksin' : 'Alacaksın';

  const isValid = height > 0 && weight > 0;

  return (
    <OnbShell step={6} total={26}>
      <OnbHead
        kicker="Biyometrik · 2/3"
        title="Şu anki vücut"
        italic="ölçülerin."
        subtitle="BMR ve günlük kalori hedefin bunlardan hesaplanır. Sonradan değiştirebilirsin."
      />

      <View style={styles.body}>
        <RulerInput
          label="Boy"
          unit="cm"
          value={height}
          min={140}
          max={210}
          onChange={(v) => updateField('height_cm', String(v))}
        />
        <RulerInput
          label="Mevcut kilo"
          unit="kg"
          value={weight}
          min={40}
          max={160}
          step={0.5}
          onChange={(v) => updateField('weight_kg', String(v))}
        />
        <RulerInput
          label="Hedef kilo"
          unit="kg"
          value={target}
          min={40}
          max={160}
          step={0.5}
          onChange={(v) => updateField('target_weight_kg', String(v))}
          accent
        />

        <View style={styles.statRow}>
          <StatBox label="BMI" value={String(bmi)} hint={bmiLabel} />
          <StatBox
            label={diffLabel}
            value={`${diff > 0 ? '+' : ''}${diff} kg`}
            hint={`%${Math.abs((diff / weight) * 100).toFixed(1)} değişim`}
            accent
          />
        </View>
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
  rulerBlock: {
    marginTop: 20,
  },
  rulerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  rulerLabel: {
    fontSize: 9.5,
    letterSpacing: 2,
    color: OnbColors.ink3,
    fontFamily: MONO,
  },
  rulerRange: {
    fontSize: 9,
    color: OnbColors.ink3,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  rulerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    color: OnbColors.ink,
    fontFamily: SERIF,
    lineHeight: 26,
  },
  rulerValue: {
    fontSize: 44,
    fontFamily: SERIF,
    color: OnbColors.ink,
    letterSpacing: -1,
    lineHeight: 48,
    textAlign: 'center',
    flex: 1,
  },
  rulerUnit: {
    fontSize: 14,
    fontFamily: MONO,
    color: OnbColors.ink3,
    letterSpacing: 1.2,
  },
  track: {
    height: 2,
    backgroundColor: OnbColors.line,
    marginTop: 10,
    borderRadius: 1,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    padding: 14,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: OnbColors.ink3,
    fontFamily: MONO,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 26,
    fontFamily: SERIF,
    color: OnbColors.ink,
    marginTop: 2,
  },
  statHint: {
    fontSize: 11,
    color: OnbColors.ink3,
    marginTop: 2,
  },
});
