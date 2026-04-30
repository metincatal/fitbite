// Onboarding 14 — Training Frequency
// List with hand-drawn SVG bar per item.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ITEMS = [
  { k: 'none',    label: 'Hiç',     hint: 'Yapılandırılmış antrenman yapmıyorum', kcal: 0,   bar: 0.05 },
  { k: 'low',     label: '1–2 gün', hint: 'Hafif — yürüyüş, esneme',              kcal: 110, bar: 0.25 },
  { k: 'moderate',label: '3–4 gün', hint: 'Orta tempo — koşu, gym, bisiklet',     kcal: 230, bar: 0.55 },
  { k: 'high',    label: '5–6 gün', hint: 'Yoğun — kuvvet antrenmanı, HIIT',     kcal: 360, bar: 0.80 },
  { k: 'athlete', label: '6–7 gün', hint: 'Profesyonel — çift seans olabilir',   kcal: 500, bar: 1.0 },
] as const;

type FreqKey = typeof ITEMS[number]['k'];
const BAR_W = 320;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

function HandBar({ fill, active }: { fill: number; active: boolean }) {
  return (
    <Svg width="100%" height={14} viewBox={`0 0 ${BAR_W} 14`} preserveAspectRatio="none">
      <Line x1="0" y1="7" x2={BAR_W} y2="7" stroke={OnbColors.line} strokeWidth="0.5" />
      <Line
        x1="0" y1="7"
        x2={BAR_W * fill} y2="7"
        stroke={active ? OnbColors.terracotta : OnbColors.ink}
        strokeWidth={active ? 2 : 1}
      />
      {TICKS.map((t, i) => (
        <Line
          key={i}
          x1={BAR_W * t} y1="3"
          x2={BAR_W * t} y2="11"
          stroke={OnbColors.ink3}
          strokeWidth="0.4"
        />
      ))}
    </Svg>
  );
}

export function ExerciseFrequency({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const selected = data.exercise_frequency;
  const isValid = !!selected;

  return (
    <OnbShell step={11} total={26}>
      <OnbHead
        kicker="Yaşam tarzı · 2/2"
        title="Haftada kaç gün"
        italic="antrenman?"
        subtitle='Yoğun iş fiziği saymaz — "spor" dediğimiz planlı, kasıtlı hareket.'
      />

      <View style={styles.body}>
        {ITEMS.map((it, i) => {
          const sel = selected === it.k;
          const isLast = i === ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => updateField('exercise_frequency', it.k as FreqKey)}
              style={[styles.row, isLast && styles.rowLast]}
              activeOpacity={0.8}
            >
              <View style={styles.rowTop}>
                <Text style={[styles.rowLabel, sel && styles.rowLabelSel]}>
                  {it.label}
                </Text>
                <Text style={styles.kcalText}>+{it.kcal} kcal/gün</Text>
              </View>
              <Text style={styles.rowHint}>{it.hint}</Text>
              <HandBar fill={it.bar} active={sel} />
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
  row: {
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    gap: 6,
  },
  rowLast: {
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 22,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  rowLabelSel: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  kcalText: {
    fontSize: 10.5,
    letterSpacing: 1.4,
    fontFamily: MONO,
    color: OnbColors.ink3,
  },
  rowHint: {
    fontSize: 12,
    color: OnbColors.ink2,
  },
});
