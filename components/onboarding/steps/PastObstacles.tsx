// Onboarding 12 — Past Challenges
// Numbered list with square checkboxes.

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
  { k: 'time',     label: 'Vakit darlığı',               hint: 'Yoğun iş temposu yüzünden' },
  { k: 'tracking', label: 'Takip etmek zor',              hint: 'Kalori saymak sıkıcı geliyor' },
  { k: 'choice',   label: 'Yiyecek seçimlerinde stres',   hint: 'Ne yesem bilmiyorum' },
  { k: 'motiv',    label: 'Motivasyon kaybı',             hint: 'Başlıyorum ama bırakıyorum' },
  { k: 'social',   label: 'Sosyal baskı',                 hint: 'Çevre uyumu zor' },
  { k: 'noise',    label: 'Bilgi karmaşası',              hint: 'Hangi diyet doğru bilmiyorum' },
] as const;

type ObstacleKey = typeof ITEMS[number]['k'];

export function PastObstacles({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();
  const selected: string[] = data.past_obstacles ?? [];

  return (
    <OnbShell step={9} total={26}>
      <OnbHead
        kicker="Geçmiş engeller"
        title="Daha önce neler"
        italic="zorladı seni?"
        subtitle="FitBot bunları biliyorsa erken müdahale eder. Hiç biri uymuyorsa atla."
      />

      <View style={styles.body}>
        {ITEMS.map((it, i) => {
          const sel = selected.includes(it.k);
          const isLast = i === ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => toggleArrayItem('past_obstacles', it.k)}
              style={[styles.row, isLast && styles.rowLast]}
              activeOpacity={0.8}
            >
              <Text style={styles.num}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, sel && styles.rowLabelSel]}>
                  {it.label}
                </Text>
                <Text style={styles.rowHint}>{it.hint}</Text>
              </View>
              <View style={[styles.checkbox, sel && styles.checkboxSel]}>
                {sel && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
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
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  rowLast: {
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
  },
  num: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: OnbColors.ink3,
    fontFamily: MONO,
    width: 24,
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
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSel: {
    backgroundColor: OnbColors.ink,
  },
  checkmark: {
    fontSize: 14,
    fontFamily: SERIF,
    color: OnbColors.bg,
  },
});
