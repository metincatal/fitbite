// Onboarding 17 — Meal Count
// Big number readout + segmented chooser + meal stones visualization.

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

const OPTS = [
  { k: 2, label: '2', hint: '16/8 oruç akışı',    desc: 'Aralıklı oruç (IF)' },
  { k: 3, label: '3', hint: 'Dengeli akış',        desc: 'Klasik düzen — kahvaltı / öğle / akşam' },
  { k: 4, label: '4', hint: 'Sık ve az',           desc: 'Üç ana + bir ara öğün' },
  { k: 5, label: '5+', hint: 'Yoğun antrenman',    desc: 'Bodybuilding tarzı' },
] as const;

const STONE_TIMES = ['08:00', '11:00', '13:30', '16:30', '20:00', '22:00'];

export function MealRhythm({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const count = data.meal_count ?? 3;
  const sel = OPTS.find((o) => o.k === count) ?? OPTS[1];

  return (
    <OnbShell step={14} total={26}>
      <OnbHead
        kicker="Plan · 1/3"
        title="Günde kaç öğün"
        italic="yemek istersin?"
        subtitle="Öğün hatırlatıcıları ve günlük plan buna göre ayarlanır."
      />

      <View style={styles.body}>
        {/* Big readout */}
        <View style={styles.readout}>
          <Text style={styles.bigNum}>{count}</Text>
          <View style={styles.readoutMeta}>
            <Text style={styles.readoutLabel}>Günlük öğün</Text>
            <Text style={styles.readoutHint}>{sel.hint}</Text>
            <Text style={styles.readoutDesc}>{sel.desc}</Text>
          </View>
        </View>

        {/* Segmented chooser */}
        <View style={styles.seg}>
          {OPTS.map((o, i) => {
            const active = count === o.k;
            return (
              <TouchableOpacity
                key={o.k}
                onPress={() => updateField('meal_count', o.k)}
                style={[
                  styles.segBtn,
                  i < OPTS.length - 1 && styles.segBtnBorder,
                  active && styles.segBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Meal stones */}
        <View style={styles.stones}>
          {STONE_TIMES.map((time, i) => {
            const active = i < count;
            const size = active ? (i === 0 ? 36 : i === count - 1 ? 32 : 28) : 14;
            return (
              <View key={i} style={[styles.stone, { opacity: active ? 1 : 0.3 }]}>
                <View
                  style={[
                    styles.stoneDot,
                    { width: size, height: size, borderRadius: size / 2 },
                    active ? styles.stoneDotActive : styles.stoneDotEmpty,
                  ]}
                />
                <Text style={styles.stoneTime}>{active ? time : '—'}</Text>
              </View>
            );
          })}
        </View>
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
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
  },
  bigNum: {
    fontSize: 88,
    lineHeight: 78,
    fontFamily: SERIF,
    color: OnbColors.terracotta,
    letterSpacing: -3.5,
  },
  readoutMeta: {
    flex: 1,
  },
  readoutLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: MONO,
    color: OnbColors.ink3,
    textTransform: 'uppercase',
  },
  readoutHint: {
    fontSize: 18,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: OnbColors.ink,
    marginTop: 4,
  },
  readoutDesc: {
    fontSize: 11.5,
    color: OnbColors.ink2,
    marginTop: 4,
    lineHeight: 16,
  },
  seg: {
    flexDirection: 'row',
    marginTop: 14,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segBtnBorder: {
    borderRightWidth: 0.5,
    borderRightColor: OnbColors.ink,
  },
  segBtnActive: {
    backgroundColor: OnbColors.ink,
  },
  segLabel: {
    fontSize: 18,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  segLabelActive: {
    color: OnbColors.bg,
    fontStyle: 'italic',
  },
  stones: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 24,
    paddingBottom: 6,
    height: 110,
  },
  stone: {
    alignItems: 'center',
  },
  stoneDot: {},
  stoneDotActive: {
    backgroundColor: OnbColors.ink,
  },
  stoneDotEmpty: {
    borderWidth: 0.5,
    borderStyle: 'dashed' as any,
    borderColor: OnbColors.ink3,
    backgroundColor: 'transparent',
  },
  stoneTime: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginTop: 6,
  },
});
