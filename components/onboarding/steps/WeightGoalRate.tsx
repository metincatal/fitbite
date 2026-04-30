// Onboarding 19 — Pace / Rate of Loss
// PaceRamp SVG + 2-col grid with inline warnings.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ITEMS = [
  { k: 'slow',       label: 'Yavaş',     rate: 0.25, kcal: -275,  tag: '~20 hafta', recommended: false, warn: false },
  { k: 'balanced',   label: 'Dengeli',   rate: 0.5,  kcal: -550,  tag: '~10 hafta', recommended: true,  warn: false },
  { k: 'fast',       label: 'Hızlı',     rate: 0.75, kcal: -825,  tag: '~7 hafta',  recommended: false, warn: false },
  { k: 'aggressive', label: 'Agresif',   rate: 1.0,  kcal: -1100, tag: '~5 hafta',  recommended: false, warn: true  },
] as const;

type PaceKey = typeof ITEMS[number]['k'];

const BAR_W = 358;

function PaceRamp({ value }: { value: string }) {
  return (
    <Svg width="100%" height={80} viewBox={`0 0 ${BAR_W} 80`} preserveAspectRatio="none">
      <Line x1="0" y1="60" x2={BAR_W} y2="60" stroke={OnbColors.line} strokeWidth="0.5" />
      {ITEMS.map((it, i) => {
        const x = 24 + i * 84;
        const h = 10 + it.rate * 40;
        const sel = value === it.k;
        return (
          <React.Fragment key={it.k}>
            <Line
              x1={x} y1="60" x2={x} y2={60 - h}
              stroke={sel ? OnbColors.terracotta : OnbColors.ink}
              strokeWidth={sel ? 2 : 1}
            />
            <Circle
              cx={x} cy={60 - h}
              r={sel ? 5 : 3}
              fill={sel ? OnbColors.terracotta : OnbColors.ink}
            />
            <SvgText
              x={x} y="74"
              textAnchor="middle"
              fontSize="9"
              fontFamily={MONO}
              fill={OnbColors.ink3}
            >
              {it.rate}kg
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function WeightGoalRate({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const weight = parseFloat(data.weight_kg) || 80;
  const selected = data.weekly_weight_goal_kg;
  const selectedKey = ITEMS.find((i) => i.rate === selected)?.k ?? 'balanced';
  const sel = ITEMS.find((i) => i.k === selectedKey)!;
  const pct = (sel.rate / weight) * 100;

  return (
    <OnbShell step={16} total={26}>
      <OnbHead
        kicker="Plan · 3/3"
        title="Ne kadar hızlı kilo"
        italic="vermek istersin?"
        subtitle="Yavaş değişim daha kalıcı olur. Vücut ağırlığının %1'inden fazla haftalık kayıp riskli."
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <PaceRamp value={selectedKey} />

        <View style={styles.grid}>
          {ITEMS.map((it) => {
            const isSel = selectedKey === it.k;
            return (
              <TouchableOpacity
                key={it.k}
                onPress={() => updateField('weekly_weight_goal_kg', it.rate)}
                style={[styles.cell, isSel && styles.cellSel]}
                activeOpacity={0.8}
              >
                {it.recommended && (
                  <Text style={styles.tagRecommended}>ÖNERİLEN</Text>
                )}
                {it.warn && (
                  <Text style={styles.tagWarn}>UYARI</Text>
                )}
                <Text style={[styles.cellLabel, isSel && styles.cellLabelSel]}>
                  {it.label}
                </Text>
                <View style={styles.cellRate}>
                  <Text style={styles.rateNum}>{it.rate}</Text>
                  <Text style={styles.rateUnit}>kg/hafta</Text>
                </View>
                <Text style={styles.cellMeta}>
                  {it.kcal} kcal/gün · {it.tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {pct > 1 && (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>UYARI · TEMPO YÜKSEK</Text>
            <Text style={styles.warnText}>
              Seçtiğin tempo vücut ağırlığının %{pct.toFixed(1)}'ine denk geliyor. Hızlı kilo kaybı kas kaybına
              yol açar; "Dengeli" 0.5 kg/hafta öneririz.
            </Text>
          </View>
        )}
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
    minHeight: 90,
  },
  cellSel: {
    backgroundColor: OnbColors.surface,
    borderWidth: 2,
    borderColor: OnbColors.ink,
    margin: -1,
  },
  tagRecommended: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 8.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: OnbColors.terracotta,
  },
  tagWarn: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 8.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: '#A3202A',
  },
  cellLabel: {
    fontSize: 22,
    fontFamily: SERIF,
    color: OnbColors.ink,
    marginTop: 4,
  },
  cellLabelSel: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
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
    letterSpacing: 0.6,
  },
  warnBox: {
    marginTop: 14,
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#F5E8E8',
    borderLeftWidth: 2,
    borderLeftColor: '#A3202A',
  },
  warnTitle: {
    fontSize: 9.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: '#A3202A',
    textTransform: 'uppercase',
  },
  warnText: {
    fontSize: 12,
    color: OnbColors.ink,
    marginTop: 4,
    lineHeight: 18,
  },
});
