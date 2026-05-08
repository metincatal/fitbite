// Onboarding 18 — Goal Selection + Pace
// Faz 1: lose / maintain / gain seçimi (3 büyük tile)
// Faz 2: seçilen hedefe göre haftalık tempo (maintain atlanır, direkt devam)

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import type { Goal } from '../../../lib/constants';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

// ─── Faz 1: Hedef tile verileri ──────────────────────────────────────────────

const GOAL_OPTIONS = [
  {
    k: 'lose' as Goal,
    label: 'Kilo',
    italic: 'ver',
    subtitle: 'Yağ yakımı · beslenme açığı · bilimsel tempo',
    accent: OnbColors.terracotta,
    sy: 10, ey: 50,   // SVG trend: başlangıç Y, bitiş Y
  },
  {
    k: 'maintain' as Goal,
    label: 'Kilomu',
    italic: 'koru',
    subtitle: 'Sürdürülebilir beslenme · yoyo önleme',
    accent: OnbColors.primary,
    sy: 30, ey: 30,
  },
  {
    k: 'gain' as Goal,
    label: 'Kilo',
    italic: 'al',
    subtitle: 'Kas kütlesi · kalori fazlası · lean bulk',
    accent: '#4A7C59',
    sy: 50, ey: 10,
  },
];

function TrendMini({ sy, ey, color, selected }: { sy: number; ey: number; color: string; selected: boolean }) {
  const stroke = selected ? color : OnbColors.line;
  const r = selected ? 4.5 : 3;
  return (
    <Svg width={88} height={60} viewBox="0 0 88 60">
      <Path
        d={`M 10 ${sy} L 78 ${ey}`}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeLinecap="round"
      />
      <Circle cx={10} cy={sy} r={r} fill={stroke} />
      <Circle cx={78} cy={ey} r={r} fill={stroke} />
    </Svg>
  );
}

// ─── Faz 2: Tempo verileri ────────────────────────────────────────────────────

const LOSE_ITEMS = [
  { k: 'slow',       label: 'Yavaş',    rate: 0.25,  kcal: -275,  tag: '~20 hafta', recommended: false, warn: false },
  { k: 'balanced',   label: 'Dengeli',  rate: 0.5,   kcal: -550,  tag: '~10 hafta', recommended: true,  warn: false },
  { k: 'fast',       label: 'Hızlı',   rate: 0.75,  kcal: -825,  tag: '~7 hafta',  recommended: false, warn: false },
  { k: 'aggressive', label: 'Agresif',  rate: 1.0,   kcal: -1100, tag: '~5 hafta',  recommended: false, warn: true  },
] as const;

const GAIN_ITEMS = [
  { k: 'careful',  label: 'Temkinli', rate: 0.125, kcal: 140,  tag: 'Az yağlanma',    recommended: false, warn: false },
  { k: 'lean',     label: 'Lean',     rate: 0.25,  kcal: 280,  tag: 'Önerilen',       recommended: true,  warn: false },
  { k: 'moderate', label: 'Orta',     rate: 0.5,   kcal: 550,  tag: 'Hızlı kazanım',  recommended: false, warn: false },
  { k: 'bulk',     label: 'Bulk',     rate: 0.75,  kcal: 825,  tag: 'Dirty bulk',     recommended: false, warn: true  },
] as const;

function PaceRamp({ value, isLose }: { value: number; isLose: boolean }) {
  const items = isLose ? LOSE_ITEMS : GAIN_ITEMS;
  const accent = isLose ? OnbColors.terracotta : '#4A7C59';
  const W = 340;

  return (
    <Svg width="100%" height={80} viewBox={`0 0 ${W} 80`} preserveAspectRatio="none">
      <Line x1="0" y1="62" x2={W} y2="62" stroke={OnbColors.line} strokeWidth="0.5" />
      {items.map((it, i) => {
        const x = 28 + i * 76;
        const h = 12 + it.rate * 42;
        const sel = value === it.rate;
        return (
          <React.Fragment key={it.k}>
            <Line
              x1={x} y1="62" x2={x} y2={62 - h}
              stroke={sel ? accent : OnbColors.ink4}
              strokeWidth={sel ? 2.5 : 1}
            />
            <Circle cx={x} cy={62 - h} r={sel ? 5 : 3} fill={sel ? accent : OnbColors.ink4} />
            <SvgText x={x} y="76" textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>
              {it.rate}kg
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function WeightGoalRate({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  const savedGoal = data.goal as Goal | null;
  const [phase, setPhase] = useState<'goal' | 'tempo'>(
    savedGoal && savedGoal !== 'maintain' ? 'tempo' : 'goal',
  );

  // Aktif rate: kaydedilmiş değer yoksa varsayılan
  const loseRate  = data.weekly_weight_goal_kg > 0  ? data.weekly_weight_goal_kg : 0.5;
  const gainRate  = data.weekly_weight_goal_kg < 0  ? Math.abs(data.weekly_weight_goal_kg) : 0.25;
  const weight    = parseFloat(data.weight_kg) || 80;

  function handleGoalSelect(g: Goal) {
    updateField('goal', g);
    if (g === 'maintain') {
      updateField('weekly_weight_goal_kg', 0);
      onNext();
      return;
    }
    // lose/gain → varsayılan rate ata (eğer hedef yeni seçildiyse)
    if (g === 'lose' && data.weekly_weight_goal_kg <= 0) {
      updateField('weekly_weight_goal_kg', 0.5);
    } else if (g === 'gain' && data.weekly_weight_goal_kg >= 0) {
      updateField('weekly_weight_goal_kg', -0.25);
    }
    setPhase('tempo');
  }

  function handleRateSelect(rate: number) {
    // gain için negatif sakla (onboarding index.tsx mantığına uygun)
    const stored = savedGoal === 'gain' ? -rate : rate;
    updateField('weekly_weight_goal_kg', stored);
  }

  // ── FAZ 1: Hedef seçimi ────────────────────────────────────────────────────
  if (phase === 'goal') {
    return (
      <OnbShell step={16} total={26}>
        <OnbHead
          kicker="Plan · 1/3"
          title="Temel hedefin"
          italic="ne?"
          subtitle="Buna göre kişisel kalori, makro ve egzersiz planın hesaplanır."
        />

        <View style={styles.goalList}>
          {GOAL_OPTIONS.map((opt) => {
            const sel = savedGoal === opt.k;
            return (
              <TouchableOpacity
                key={opt.k}
                style={[
                  styles.goalTile,
                  sel && styles.goalTileSel,
                  { borderLeftColor: sel ? opt.accent : OnbColors.line },
                ]}
                onPress={() => handleGoalSelect(opt.k)}
                activeOpacity={0.75}
              >
                <View style={styles.goalTileLeft}>
                  <Text style={styles.goalLabel}>
                    {opt.label}
                    <Text style={[styles.goalLabelItalic, { color: sel ? opt.accent : OnbColors.ink3 }]}>
                      {' '}{opt.italic}
                    </Text>
                  </Text>
                  <Text style={styles.goalSubtitle}>{opt.subtitle}</Text>
                </View>
                <TrendMini sy={opt.sy} ey={opt.ey} color={opt.accent} selected={sel} />
              </TouchableOpacity>
            );
          })}
        </View>

        <OnbFoot
          onNext={() => savedGoal && handleGoalSelect(savedGoal)}
          onBack={onBack}
          dim={!savedGoal}
        />
      </OnbShell>
    );
  }

  // ── FAZ 2: Tempo seçimi ────────────────────────────────────────────────────
  const isLose    = savedGoal === 'lose';
  const items     = isLose ? LOSE_ITEMS : GAIN_ITEMS;
  const curRate   = isLose ? loseRate : gainRate;
  const accent    = isLose ? OnbColors.terracotta : '#4A7C59';
  const pct       = (curRate / weight) * 100;

  return (
    <OnbShell step={16} total={26}>
      <OnbHead
        kicker={`Plan · 2/3 · ${isLose ? 'Kilo Verme' : 'Kilo Alma'}`}
        title={isLose ? 'Ne kadar hızlı kilo' : 'Hangi tempoda kilo'}
        italic={isLose ? 'vermek istersin?' : 'almak istersin?'}
        subtitle={
          isLose
            ? 'Yavaş değişim daha kalıcı olur. Vücut ağırlığının %1\'inden fazla haftalık kayıp riskli.'
            : 'Yavaş bulk daha az yağlanma demektir. Lean kazanım için "Lean" tempoyu öneriyoruz.'
        }
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <PaceRamp value={curRate} isLose={isLose} />

        <View style={styles.grid}>
          {items.map((it) => {
            const isSel = curRate === it.rate;
            return (
              <TouchableOpacity
                key={it.k}
                onPress={() => handleRateSelect(it.rate)}
                style={[styles.cell, isSel && [styles.cellSel, { borderColor: accent }]]}
                activeOpacity={0.8}
              >
                {it.recommended && (
                  <Text style={[styles.tagRecommended, { color: accent }]}>ÖNERİLEN</Text>
                )}
                {it.warn && <Text style={styles.tagWarn}>UYARI</Text>}
                <Text style={[styles.cellLabel, isSel && { color: accent, fontStyle: 'italic' }]}>
                  {it.label}
                </Text>
                <View style={styles.cellRate}>
                  <Text style={styles.rateNum}>{it.rate}</Text>
                  <Text style={styles.rateUnit}>kg/hafta</Text>
                </View>
                <Text style={styles.cellMeta}>
                  {isLose ? '' : '+'}{it.kcal} kcal/gün · {it.tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLose && pct > 1 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>UYARI · TEMPO YÜKSEK</Text>
            <Text style={styles.warnText}>
              Seçtiğin tempo vücut ağırlığının %{pct.toFixed(1)}'ine denk geliyor. Hızlı kilo kaybı
              kas kaybına yol açar; "Dengeli" 0.5 kg/hafta önerilir.
            </Text>
          </View>
        )}
        {!isLose && pct > 0.75 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>NOT · YAĞLANMA RİSKİ</Text>
            <Text style={styles.warnText}>
              Haftada %{pct.toFixed(1)} ağırlık artışı, kas kazanımının üzerinde yağlanmaya yol
              açabilir. "Lean" 0.25 kg/hafta önerilir.
            </Text>
          </View>
        )}
      </ScrollView>

      <OnbFoot
        onNext={onNext}
        onBack={() => setPhase('goal')}
        cta="Planımı Hesapla"
      />
    </OnbShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Faz 1
  goalList: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  goalTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 88,
    borderWidth: 0.5,
    borderColor: OnbColors.line,
    borderLeftWidth: 3,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  goalTileSel: {
    backgroundColor: OnbColors.surface,
  },
  goalTileLeft: {
    flex: 1,
    paddingRight: 10,
  },
  goalLabel: {
    fontSize: 30,
    fontFamily: SERIF,
    color: OnbColors.ink,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  goalLabelItalic: {
    fontStyle: 'italic',
    fontFamily: SERIF,
  },
  goalSubtitle: {
    fontSize: 11,
    fontFamily: MONO,
    color: OnbColors.ink3,
    marginTop: 5,
    letterSpacing: 0.4,
  },

  // Faz 2
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderLeftWidth: 0.5,
    borderLeftColor: OnbColors.line,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    marginTop: 16,
  },
  cell: {
    width: '50%',
    padding: 14,
    borderRightWidth: 0.5,
    borderRightColor: OnbColors.line,
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
    position: 'relative',
    minHeight: 96,
  },
  cellSel: {
    backgroundColor: OnbColors.surface,
    borderWidth: 2,
    margin: -1,
  },
  tagRecommended: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 8,
    letterSpacing: 1.4,
    fontFamily: MONO,
  },
  tagWarn: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 8,
    letterSpacing: 1.4,
    fontFamily: MONO,
    color: OnbColors.berry,
  },
  cellLabel: {
    fontSize: 22,
    fontFamily: SERIF,
    color: OnbColors.ink,
    marginTop: 4,
  },
  cellRate: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  rateNum: {
    fontSize: 18,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  rateUnit: {
    fontSize: 10,
    fontFamily: MONO,
    color: OnbColors.ink3,
    letterSpacing: 1,
  },
  cellMeta: {
    fontSize: 10,
    fontFamily: MONO,
    color: OnbColors.ink2,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  warnBox: {
    marginTop: 14,
    marginBottom: 20,
    padding: 14,
    backgroundColor: OnbColors.berryBg,
    borderLeftWidth: 2,
    borderLeftColor: OnbColors.berry,
  },
  warnTitle: {
    fontSize: 9.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: OnbColors.berry,
    textTransform: 'uppercase',
  },
  warnText: {
    fontSize: 12,
    color: OnbColors.ink,
    marginTop: 4,
    lineHeight: 18,
  },
});
