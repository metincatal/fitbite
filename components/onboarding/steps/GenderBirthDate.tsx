// Onboarding 05 — Sex & Birth Year
// 2-sütun cinsiyet seçimi + cetvel yıl seçici.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const MIN_YEAR = 1940;
const MAX_YEAR = new Date().getFullYear() - 12;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const TICK_WIDTH = 16;
const RULER_PADDING = Math.round(Dimensions.get('window').width / 2);

export function GenderBirthDate({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const gender = data.gender;
  const birthYear = parseInt(data.birth_year) || 1995;
  const age = new Date().getFullYear() - birthYear;

  const isValid = !!gender && !!data.birth_year;

  return (
    <OnbShell step={3} total={26}>
      <OnbHead
        kicker="Biyometrik · 1/3"
        title="Bizi biraz daha"
        italic="tanı."
        subtitle="Cinsiyet ve yaş, BMR (bazal metabolizma) hesabı için gereklidir."
      />

      <View style={styles.body}>
        {/* Gender */}
        <Text style={styles.sectionLabel}>BİYOLOJİK CİNSİYET</Text>
        <View style={styles.genderRow}>
          {(['female', 'male'] as const).map((g) => {
            const sel = gender === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, sel && styles.genderBtnActive]}
                onPress={() => updateField('gender', g)}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderHint, sel && { color: OnbColors.bg, opacity: 0.6 }]}>
                  {g === 'female' ? 'AMAB · 23.5 kcal/kg' : 'AMAB · 22.0 kcal/kg'}
                </Text>
                <Text style={[styles.genderLabel, sel && styles.genderLabelActive]}>
                  {g === 'female' ? 'Kadın' : 'Erkek'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Birth year */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>DOĞUM YILI</Text>

        <Text style={styles.yearDisplay}>{birthYear}</Text>

        {/* Ruler */}
        <View style={styles.rulerWrap}>
          <View style={styles.rulerCenterLine} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (birthYear - MIN_YEAR) * TICK_WIDTH, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / TICK_WIDTH);
              const y = Math.max(MIN_YEAR, Math.min(MAX_YEAR, MIN_YEAR + idx));
              updateField('birth_year', String(y));
            }}
            onScrollEndDrag={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / TICK_WIDTH);
              const y = Math.max(MIN_YEAR, Math.min(MAX_YEAR, MIN_YEAR + idx));
              updateField('birth_year', String(y));
            }}
          >
            <View style={styles.tickRow}>
              {YEARS.map((y) => {
                const isBig = y % 10 === 0;
                const isMed = y % 5 === 0;
                return (
                  <TouchableOpacity
                    key={y}
                    onPress={() => updateField('birth_year', String(y))}
                    style={[styles.tick, { width: TICK_WIDTH }]}
                  >
                    <View
                      style={[
                        styles.tickBar,
                        {
                          height: isBig ? 24 : isMed ? 14 : 8,
                          backgroundColor: y === birthYear ? OnbColors.terracotta : OnbColors.ink,
                          opacity: isBig ? 0.85 : isMed ? 0.6 : 0.35,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.yearRange}>
          <Text style={styles.yearRangeText}>{MIN_YEAR}</Text>
          <Text style={styles.yearRangeText}>{MAX_YEAR}</Text>
        </View>

        <Text style={styles.ageHint}>
          → {age} yaşındasın · Mifflin-St Jeor için kullanılır
        </Text>
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} dim={!isValid} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
  },
  sectionLabel: {
    fontSize: 9.5,
    letterSpacing: 2,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    padding: 20,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
  },
  genderBtnActive: {
    backgroundColor: OnbColors.ink,
  },
  genderHint: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: OnbColors.ink3,
    fontFamily: MONO,
    marginBottom: 6,
  },
  genderLabel: {
    fontSize: 28,
    fontFamily: SERIF,
    color: OnbColors.ink,
    fontStyle: 'italic',
  },
  genderLabelActive: {
    color: OnbColors.bg,
  },
  yearDisplay: {
    fontSize: 64,
    lineHeight: 68,
    color: OnbColors.ink,
    fontFamily: SERIF,
    letterSpacing: -2,
    marginBottom: 14,
  },
  rulerWrap: {
    height: 38,
    position: 'relative',
  },
  rulerCenterLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: OnbColors.terracotta,
    zIndex: 2,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 38,
    paddingLeft: RULER_PADDING,
    paddingRight: RULER_PADDING,
  },
  tick: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 38,
  },
  tickBar: {
    width: 1,
    backgroundColor: OnbColors.ink,
  },
  yearRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  yearRangeText: {
    fontSize: 9,
    color: OnbColors.ink3,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  ageHint: {
    marginTop: 10,
    fontSize: 11,
    letterSpacing: 1,
    color: OnbColors.terracotta,
    fontFamily: MONO,
  },
});
