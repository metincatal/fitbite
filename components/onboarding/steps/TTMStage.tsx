// Onboarding 04 — Stage of Change (TTM)
// Pusula SVG + liste seçimi.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { TTMStage as TTMStageType } from '../../../lib/constants';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const STAGES: { k: TTMStageType; label: string; hint: string; deg: number }[] = [
  { k: 'precontemplation', label: 'Henüz düşünmüyorum',  hint: 'Şu an değişiklik aklımda yok, merak ediyorum.', deg: -90 },
  { k: 'contemplation',    label: 'Düşünüyorum',          hint: 'Bir şey yapmam gerektiğini biliyorum, başlamadım.', deg: -36 },
  { k: 'preparation',     label: 'Hazırlanıyorum',        hint: 'Önümüzdeki ay içinde başlamaya kararlıyım.', deg: 18 },
  { k: 'action',          label: 'Aktif çabalıyorum',     hint: 'Son 6 aydır değişiklik yapıyorum.', deg: 90 },
  { k: 'maintenance',     label: 'Sürdürüyorum',          hint: '6 aydan uzun süredir hedefimdeyim.', deg: 162 },
];

function CompassSvg({ activeIdx }: { activeIdx: number }) {
  const cx = 110, cy = 110, r = 84;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const polar = (a: number, rr: number) => ({
    x: cx + Math.cos(toRad(a)) * rr,
    y: cy + Math.sin(toRad(a)) * rr,
  });

  const active = STAGES[activeIdx];
  const tipPt = polar(active.deg, r - 8);
  const tailPt = polar(active.deg + 180, 28);

  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      {/* outer hairline */}
      <Circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={OnbColors.line} strokeWidth={0.5} />
      <Circle cx={cx} cy={cy} r={r} fill={OnbColors.surface} stroke={OnbColors.ink} strokeWidth={0.6} />

      {/* 60 tick marks every 6° */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = i * 6 - 90;
        const big = i % 5 === 0;
        const p1 = polar(a, r);
        const p2 = polar(a, r - (big ? 8 : 3));
        return (
          <Line
            key={i}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={OnbColors.ink}
            strokeWidth={big ? 0.8 : 0.4}
            opacity={big ? 0.7 : 0.35}
          />
        );
      })}

      {/* stage dots */}
      {STAGES.map((s, i) => {
        const p = polar(s.deg, r - 18);
        const isActive = i === activeIdx;
        return (
          <Circle
            key={s.k}
            cx={p.x} cy={p.y}
            r={isActive ? 6 : 2.5}
            fill={isActive ? OnbColors.terracotta : OnbColors.ink}
            opacity={isActive ? 1 : 0.45}
          />
        );
      })}

      {/* needle */}
      <Line
        x1={tailPt.x} y1={tailPt.y}
        x2={tipPt.x}  y2={tipPt.y}
        stroke={OnbColors.ink} strokeWidth={1.4}
      />
      <Circle cx={tipPt.x} cy={tipPt.y} r={3.5} fill={OnbColors.terracotta} />
      <Circle cx={cx} cy={cy} r={5} fill={OnbColors.ink} />
      <Circle cx={cx} cy={cy} r={1.5} fill={OnbColors.bg} />

      {/* cardinal letters */}
      {[['K', 0, -1], ['D', 1, 0], ['G', 0, 1], ['B', -1, 0]].map(([l, dx, dy]) => {
        const offset = 72;
        return (
          <SvgText
            key={String(l)}
            x={cx + Number(dx) * offset}
            y={cy + Number(dy) * offset + 4}
            textAnchor="middle"
            fontSize={9}
            fontFamily={MONO}
            fill={OnbColors.ink3}
          >
            {l}
          </SvgText>
        );
      })}

      <SvgText x={cx} y={cy + 34} textAnchor="middle" fontSize={9} fontFamily={MONO} fill={OnbColors.ink3}>
        {`SEÇİM · ${String(activeIdx + 1).padStart(2, '0')}/05`}
      </SvgText>
    </Svg>
  );
}

export function TTMStage({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const stage = data.ttm_stage;
  const activeIdx = Math.max(0, STAGES.findIndex((s) => s.k === stage));

  return (
    <OnbShell step={2} total={26}>
      <OnbHead
        kicker="Yolculuk noktası"
        title="Şu an"
        italic="neredesin?"
        subtitle="Doğrusu yok, yanlışı yok — samimi cevap planını şekillendirir."
      />

      <View style={styles.compassWrap}>
        <CompassSvg activeIdx={activeIdx} />
      </View>

      <View style={styles.list}>
        {STAGES.map((s, i) => {
          const selected = stage === s.k;
          return (
            <TouchableOpacity
              key={s.k}
              onPress={() => updateField('ttm_stage', s.k)}
              style={[styles.row, i === 0 && styles.rowFirst]}
              activeOpacity={0.7}
            >
              <Text style={styles.rowNum}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, selected && styles.rowLabelActive]}>
                  {s.label}
                </Text>
                <Text style={styles.rowHint}>{s.hint}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioActive]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  compassWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  list: {
    paddingHorizontal: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
    gap: 14,
  },
  rowFirst: {
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  rowNum: {
    fontSize: 10,
    color: OnbColors.ink3,
    letterSpacing: 1.6,
    fontFamily: MONO,
    width: 28,
    marginTop: 5,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 20,
    color: OnbColors.ink,
    fontFamily: SERIF,
  },
  rowLabelActive: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  rowHint: {
    fontSize: 12,
    color: OnbColors.ink3,
    marginTop: 2,
    lineHeight: 17,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: OnbColors.ink,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  radioActive: {
    backgroundColor: OnbColors.ink,
  },
});
