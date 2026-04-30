// Onboarding 11 — Goals (multi-select)
// 2-col grid, GoalGlyph SVGs, ordered selection badges.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const GOALS = [
  { k: 'weight',  label: 'Kilo Yönetimi',     hint: 'Düzenli, kalıcı', glyph: 'scale' },
  { k: 'energy',  label: 'Daha Fazla Enerji', hint: 'Sabah & akşam',   glyph: 'bolt' },
  { k: 'focus',   label: 'Zihinsel Berraklık', hint: 'Konsantrasyon',   glyph: 'lamp' },
  { k: 'gut',     label: 'Daha İyi Sindirim', hint: 'Lif, fermente',   glyph: 'leaf' },
  { k: 'immune',  label: 'Bağışıklık',        hint: 'Mevsim geçişi',   glyph: 'shield' },
  { k: 'glucose', label: 'Kan Şekeri Dengesi',hint: 'CGM ile',         glyph: 'wave' },
  { k: 'muscle',  label: 'Kas Kazanımı',      hint: 'Protein hedefi',  glyph: 'dumb' },
  { k: 'sleep',   label: 'Daha İyi Uyku',     hint: 'Akşam pencereleri',glyph: 'moon' },
  { k: 'skin',    label: 'Cilt & Saç',        hint: 'Su, omega',       glyph: 'spark' },
  { k: 'stress',  label: 'Stres Yönetimi',    hint: 'Mikro besinler',  glyph: 'heart' },
] as const;

type GoalKey = typeof GOALS[number]['k'];

function GoalGlyph({ kind, active }: { kind: string; active: boolean }) {
  const c = active ? OnbColors.terracotta : OnbColors.ink;
  const p = { fill: 'none' as const, stroke: c, strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'scale')  return <Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" {...p}/><Path d="M12 3v18M3 12h18" {...p}/><Circle cx="12" cy="12" r="2" fill={c}/></Svg>;
  if (kind === 'bolt')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M13 3 L5 13 H11 L9 21 L17 11 H11 Z" {...p}/></Svg>;
  if (kind === 'lamp')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx="12" cy="10" r="5" {...p}/><Path d="M9 16h6M10 19h4" {...p}/></Svg>;
  if (kind === 'leaf')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M5 19 Q 5 5 19 5 Q 19 19 5 19 Z M 5 19 L 12 12" {...p}/></Svg>;
  if (kind === 'shield') return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 3 L20 6 V12 Q 20 18 12 21 Q 4 18 4 12 V6 Z" {...p}/></Svg>;
  if (kind === 'wave')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M3 12 Q 7 6 11 12 T 19 12" {...p}/><Path d="M3 17 Q 7 11 11 17 T 19 17" {...p} opacity="0.5"/></Svg>;
  if (kind === 'dumb')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Rect x="2" y="9" width="3" height="6" {...p}/><Rect x="19" y="9" width="3" height="6" {...p}/><Line x1="5" y1="12" x2="19" y2="12" {...p}/></Svg>;
  if (kind === 'moon')   return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M19 14 A 8 8 0 1 1 10 5 A 6 6 0 0 0 19 14 Z" {...p}/></Svg>;
  if (kind === 'spark')  return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 4 L13 11 L20 12 L13 13 L12 20 L11 13 L4 12 L11 11 Z" {...p}/></Svg>;
  if (kind === 'heart')  return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 20 C 4 14 4 8 8 7 Q 11 7 12 10 Q 13 7 16 7 C 20 8 20 14 12 20 Z" {...p}/></Svg>;
  return null;
}

export function MotivationSelect({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();
  const selected: string[] = data.motivations ?? [];
  const isValid = selected.length > 0;

  return (
    <OnbShell step={8} total={26}>
      <OnbHead
        kicker={`Hedefler · ${selected.length} seçildi`}
        title="Neyi başarmak"
        italic="istiyorsun?"
        subtitle="FitBot odak noktalarını bilmek istiyor. Birden fazla seçilebilir — sıralama önemli."
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {GOALS.map((g, i) => {
            const sel = selected.includes(g.k);
            const order = selected.indexOf(g.k);
            const isLeft = i % 2 === 0;
            return (
              <TouchableOpacity
                key={g.k}
                onPress={() => toggleArrayItem('motivations', g.k)}
                style={[
                  styles.cell,
                  isLeft ? styles.cellLeft : styles.cellRight,
                  sel && styles.cellSel,
                ]}
                activeOpacity={0.8}
              >
                <GoalGlyph kind={g.glyph} active={sel} />
                <Text style={[styles.cellLabel, sel && styles.cellLabelSel]}>
                  {g.label}
                </Text>
                <Text style={styles.cellHint}>{g.hint}</Text>
                {sel && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{order + 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <OnbFoot
        onNext={onNext}
        onBack={onBack}
        dim={!isValid}
        cta={isValid ? 'Devam' : 'En az bir tane seç'}
      />
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
    minHeight: 86,
    padding: 14,
    borderRightWidth: 0.5,
    borderRightColor: OnbColors.line,
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
    position: 'relative',
  },
  cellLeft: {},
  cellRight: {},
  cellSel: {
    backgroundColor: OnbColors.surface,
  },
  cellLabel: {
    fontSize: 16,
    fontFamily: SERIF,
    color: OnbColors.ink,
    marginTop: 8,
    lineHeight: 18,
  },
  cellLabelSel: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  cellHint: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: OnbColors.ink3,
    fontFamily: MONO,
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 99,
    backgroundColor: OnbColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: MONO,
    color: OnbColors.bg,
  },
});
