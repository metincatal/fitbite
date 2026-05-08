// Onboarding 18 — Meal Times
// DayClock 24h SVG + time chip ScrollViews.

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const FIRST_MEAL_HOURS = [
  '05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00',
];

const LAST_MEAL_HOURS = [
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
];

function hourAngle(h: number) { return (h / 24) * 360 - 90; }
function polar(a: number, r: number, cx = 110, cy = 110): [number, number] {
  return [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r];
}

function DayClock({ first, last }: { first: string; last: string }) {
  const cx = 110, cy = 110, r = 88;
  const fh = parseInt(first);
  const lh = parseInt(last);
  const a1 = hourAngle(fh);
  const a2 = hourAngle(lh);
  const [x1, y1] = polar(a1, r - 6, cx, cy);
  const [x2, y2] = polar(a2, r - 6, cx, cy);
  // CW angle from first to last (handles midnight crossing and edge cases)
  const cwAngle = ((a2 - a1) + 360) % 360;
  const large = cwAngle > 180 ? 1 : 0;

  const ticks = Array.from({ length: 24 }, (_, h) => {
    const a = hourAngle(h);
    const [x1t, y1t] = polar(a, r, cx, cy);
    const len = h % 6 === 0 ? 12 : h % 3 === 0 ? 7 : 4;
    const [x2t, y2t] = polar(a, r - len, cx, cy);
    return { h, x1t, y1t, x2t, y2t };
  });

  // Window in hours, handles midnight crossing
  const windowH = lh >= fh ? lh - fh : 24 - fh + lh;

  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Circle cx={cx} cy={cy} r={r} fill={OnbColors.surface} stroke={OnbColors.ink} strokeWidth="0.6" />
      {ticks.map(({ h, x1t, y1t, x2t, y2t }) => (
        <Line
          key={h}
          x1={x1t} y1={y1t} x2={x2t} y2={y2t}
          stroke={OnbColors.ink}
          strokeWidth={h % 6 === 0 ? 1 : 0.4}
          opacity={h % 6 === 0 ? 0.8 : 0.4}
        />
      ))}
      <SvgText x={cx} y={cy - r + 24} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>00</SvgText>
      <SvgText x={cx + r - 22} y={cy + 4} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>06</SvgText>
      <SvgText x={cx} y={cy + r - 18} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>12</SvgText>
      <SvgText x={cx - r + 22} y={cy + 4} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>18</SvgText>

      <Path
        d={`M ${x1} ${y1} A ${r - 6} ${r - 6} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={OnbColors.terracotta}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Circle cx={x1} cy={y1} r="6" fill={OnbColors.ink} />
      <Circle cx={x2} cy={y2} r="6" fill={OnbColors.ink} />

      <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={OnbColors.ink3}>
        YEMEK PENCERESİ
      </SvgText>
      <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize="22" fontFamily={SERIF} fill={OnbColors.ink}>
        {windowH}
      </SvgText>
      <SvgText x={cx + 16} y={cy + 14} textAnchor="start" fontSize="12" fontFamily={MONO} fill={OnbColors.ink3}>
        {' '}saat
      </SvgText>
    </Svg>
  );
}

function TimeStrip({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <View style={strip.wrap}>
      <Text style={strip.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={strip.scroll} contentContainerStyle={strip.row}>
        {options.map((h) => {
          const sel = h === value;
          return (
            <TouchableOpacity
              key={h}
              onPress={() => onChange(h)}
              style={[strip.chip, sel && strip.chipSel]}
              activeOpacity={0.8}
            >
              <Text style={[strip.chipText, sel && strip.chipTextSel]}>{h}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const strip = StyleSheet.create({
  wrap: { marginTop: 18 },
  label: { fontSize: 9, letterSpacing: 3.2, fontFamily: MONO, color: OnbColors.ink3, textTransform: 'uppercase', marginBottom: 8 },
  scroll: {},
  row: { flexDirection: 'row', gap: 4, paddingBottom: 4 },
  chip: { flexShrink: 0, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 0.5, borderColor: OnbColors.line, backgroundColor: 'transparent' },
  chipSel: { backgroundColor: OnbColors.ink, borderColor: OnbColors.ink },
  chipText: { fontSize: 11, letterSpacing: 0.6, fontFamily: MONO, color: OnbColors.ink },
  chipTextSel: { color: OnbColors.bg },
});

export function MealTiming({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const first = data.first_meal_time || '08:00';
  const last  = data.last_meal_time  || '20:00';
  const [fh]  = first.split(':').map(Number);
  const [lh]  = last.split(':').map(Number);
  const windowH = lh >= fh ? lh - fh : 24 - fh + lh;

  return (
    <OnbShell step={15} total={26}>
      <OnbHead
        kicker="Plan · 2/3"
        title="Öğün zamanların"
        italic="nasıl?"
        subtitle="Bildirimler ve aralıklı oruç (IF) penceresi buna göre ayarlanır."
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.clockWrap}>
          <DayClock first={first} last={last} />
        </View>

        <View style={styles.timesRow}>
          <View>
            <Text style={styles.timeLabel}>İLK ÖĞÜN</Text>
            <Text style={styles.timeValue}>{first}</Text>
          </View>
          <Text style={styles.windowLabel}>↔ {windowH} SAATLİK PENCERE</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timeLabel}>SON ÖĞÜN</Text>
            <Text style={styles.timeValue}>{last}</Text>
          </View>
        </View>

        <TimeStrip label="İLK ÖĞÜN" value={first} onChange={(v) => updateField('first_meal_time', v)} options={FIRST_MEAL_HOURS} />
        <TimeStrip label="SON ÖĞÜN" value={last}  onChange={(v) => updateField('last_meal_time', v)} options={LAST_MEAL_HOURS} />

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>ÖNERİ · SON ÖĞÜN UYKUDAN ≥ 3 SAAT ÖNCE OLMALI.</Text>
        </View>
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
  clockWrap: {
    alignItems: 'center',
    paddingBottom: 14,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: MONO,
    color: OnbColors.ink3,
  },
  timeValue: {
    fontSize: 32,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  windowLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: MONO,
    color: OnbColors.terracotta,
  },
  tipBox: {
    marginTop: 14,
    marginBottom: 20,
    padding: 12,
    backgroundColor: OnbColors.surface2,
    borderLeftWidth: 2,
    borderLeftColor: OnbColors.terracotta,
  },
  tipText: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: MONO,
    color: OnbColors.ink2,
  },
});
