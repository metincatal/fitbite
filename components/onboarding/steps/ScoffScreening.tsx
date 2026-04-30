// Onboarding 06 — SCOFF Tarama
// 5 hassas soru, Hayır/Evet split button, kilit ikonu.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const QUESTIONS = [
  { k: 'q1' as const, text: 'Kendini tok hissettirecek kadar yemek yedikten sonra kusma ihtiyacı duyar mısın?' },
  { k: 'q2' as const, text: 'Ne yediğin konusunda kontrolü kaybettiğin endişesini taşıyor musun?' },
  { k: 'q3' as const, text: "Son 3 ayda 6 kg'dan fazla kilo verdin mi?" },
  { k: 'q4' as const, text: 'Başkaları seni zayıf bulsa bile kendini kilolu hissediyor musun?' },
  { k: 'q5' as const, text: 'Yemeğin hayatına hükmettiğini söyler misin?' },
];

function LockIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Rect x={2} y={5} width={8} height={6} fill="none" stroke={OnbColors.ink} strokeWidth={0.8} />
      <Path d="M 4 5 V 3.5 A 2 2 0 0 1 8 3.5 V 5" fill="none" stroke={OnbColors.ink} strokeWidth={0.8} />
    </Svg>
  );
}

export function ScoffScreening({ onNext, onBack }: Props) {
  const { data, setScoffAnswer } = useOnboardingData();
  const answers = data.scoff_answers;

  return (
    <OnbShell step={4} total={26}>
      <OnbHead
        kicker="Hassas — gizli kalır"
        title="Beş kısa"
        italic="soru."
        subtitle="SCOFF tarama testi. Cevapların şifrelenir; üyelik ekibi dahil kimse okuyamaz."
      />

      <View style={styles.body}>
        {/* Encryption badge */}
        <View style={styles.badge}>
          <LockIcon />
          <Text style={styles.badgeText}>AES-256 · UÇTAN UCA</Text>
        </View>

        {QUESTIONS.map((q, i) => {
          const ans = answers[q.k];
          return (
            <View key={q.k} style={styles.qRow}>
              <Text style={styles.qNum}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.qText}>{q.text}</Text>
                <View style={styles.answerRow}>
                  {(['no', 'yes'] as const).map((v, vi) => {
                    const selected = ans === (v === 'yes');
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setScoffAnswer(q.k, v === 'yes')}
                        style={[
                          styles.ansBtn,
                          vi === 0 && styles.ansBtnLeft,
                          selected && styles.ansBtnActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.ansBtnText, selected && styles.ansBtnTextActive]}>
                          {v === 'no' ? 'Hayır' : 'Evet'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <OnbFoot
        onNext={onNext}
        onBack={onBack}
        note="Cevaplar yargılamak için değil — koruyucu."
      />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: OnbColors.surface,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: OnbColors.ink2,
    fontFamily: MONO,
  },
  qRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    alignItems: 'flex-start',
  },
  qNum: {
    fontSize: 36,
    fontFamily: SERIF,
    color: OnbColors.ink3,
    fontStyle: 'italic',
    width: 56,
    lineHeight: 44,
    flexShrink: 0,
  },
  qText: {
    fontSize: 13.5,
    color: OnbColors.ink,
    lineHeight: 20,
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
  },
  ansBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ansBtnLeft: {
    borderRightWidth: 0.5,
    borderRightColor: OnbColors.ink,
  },
  ansBtnActive: {
    backgroundColor: OnbColors.ink,
  },
  ansBtnText: {
    fontSize: 16,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  ansBtnTextActive: {
    color: OnbColors.bg,
    fontStyle: 'italic',
  },
});
