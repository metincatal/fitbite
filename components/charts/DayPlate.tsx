import React from 'react';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../lib/constants';

// Premium macro ring colors
const MACRO_COLORS = {
  carbs:   '#C8974A',  // burnished amber
  protein: '#2D6A4F',  // deep forest green
  fat:     '#C45A3E',  // deep sienna
};

// Hedef aşımı için sıcak ama agresif olmayan terracotta tonu
const OVER_COLOR = '#C45A3E';

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const polarPt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  };
  const [x1, y1] = polarPt(startDeg);
  const [x2, y2] = polarPt(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

interface DayPlateProps {
  consumed: number; // gerçek depolanan kalori (totals.calories'den)
  protein: number;
  carbs: number;
  fat: number;
  goal?: number;
  size?: number;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function DayPlate({ consumed, protein, carbs, fat, goal = 2000, size = 280 }: DayPlateProps) {
  const proteinKcal = protein * 4;
  const carbsKcal   = carbs * 4;
  const fatKcal     = fat * 9;
  const macroTotal  = proteinKcal + carbsKcal + fatKcal;

  // Tam tur: hedefin %98'i ile %105'i arasında. Üzeri ayrı (taşma) durum.
  const isComplete = consumed >= goal * 0.98 && consumed <= goal * 1.05;
  const isOver     = consumed > goal * 1.05;

  // Taşma varsa dilimleri 360°'de durdurmak için consumed'ı goal'da kapat.
  const cappedConsumed = Math.min(consumed, goal);
  const overflow       = Math.max(0, consumed - goal);
  const overflowAngle  = goal > 0 ? Math.min((overflow / goal) * 360, 359.9) : 0;

  // Makrolar yalnızca dolgu alanını orantısal olarak böler; toplam dolgu = cappedConsumed.
  const scaledProtein = macroTotal > 0 ? (proteinKcal / macroTotal) * cappedConsumed : 0;
  const scaledCarbs   = macroTotal > 0 ? (carbsKcal   / macroTotal) * cappedConsumed : 0;
  const scaledFat     = macroTotal > 0 ? (fatKcal     / macroTotal) * cappedConsumed : 0;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.46;
  const rInner = size * 0.22;

  const macros: { key: keyof typeof MACRO_COLORS; kcal: number }[] = [
    { key: 'carbs',   kcal: scaledCarbs   },
    { key: 'protein', kcal: scaledProtein },
    { key: 'fat',     kcal: scaledFat     },
  ];

  const slices: { key: string; start: number; end: number; color: string }[] = [];
  let angle = -90;

  for (const { key, kcal } of macros) {
    if (kcal <= 0) continue;
    const frac = kcal / goal;
    const span = Math.min(frac * 360, 359.9);
    slices.push({ key, start: angle, end: angle + span, color: MACRO_COLORS[key] });
    angle += span;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`-12 -12 ${size + 24} ${size + 24}`}
    >
      {/* plate shadow */}
      <Circle cx={cx} cy={cy + 2} r={rOuter + 4} fill="#00000010" />
      {/* plate rim */}
      <Circle cx={cx} cy={cy} r={rOuter + 3} fill={Colors.surface} stroke={Colors.line} strokeWidth={1} />
      {/* tam tur halesi — yalnız hedef tamamlandığında */}
      {isComplete && (
        <>
          <Circle cx={cx} cy={cy} r={rOuter + 7} fill="none" stroke={Colors.primary} strokeWidth={1} strokeOpacity={0.5} />
          <Circle cx={cx} cy={cy} r={rOuter + 10} fill="none" stroke={Colors.primary} strokeWidth={0.5} strokeOpacity={0.25} />
        </>
      )}
      {/* taşma göstergesi — hedef aşıldıysa tabağın dışında ince bir kuşak */}
      {isOver && (
        <>
          {/* arka iz — tam çevre, çok soluk terracotta */}
          <Circle cx={cx} cy={cy} r={rOuter + 8} fill="none" stroke={OVER_COLOR} strokeWidth={2.5} strokeOpacity={0.12} />
          {/* taşma yayı — aşan kalori kadar */}
          <Path
            d={arcPath(cx, cy, rOuter + 8, -90, -90 + overflowAngle)}
            fill="none"
            stroke={OVER_COLOR}
            strokeWidth={2.5}
            strokeOpacity={0.7}
            strokeLinecap="round"
          />
          {/* dış hafif hale */}
          <Circle cx={cx} cy={cy} r={rOuter + 12} fill="none" stroke={OVER_COLOR} strokeWidth={0.5} strokeOpacity={0.18} />
        </>
      )}
      <Circle cx={cx} cy={cy} r={rOuter - 2} fill="none" stroke={Colors.line2} strokeWidth={1} />
      {/* empty plate area */}
      <Circle cx={cx} cy={cy} r={rOuter - 6} fill={Colors.surfaceSecondary} fillOpacity={0.5} />

      {/* macro donut slices */}
      {slices.map((s) => {
        const [x1, y1]   = polar(cx, cy, rOuter - 6, s.start);
        const [x2, y2]   = polar(cx, cy, rOuter - 6, s.end);
        const [xi1, yi1] = polar(cx, cy, rInner, s.end);
        const [xi2, yi2] = polar(cx, cy, rInner, s.start);
        const large = s.end - s.start > 180 ? 1 : 0;
        const d =
          `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
          `A ${(rOuter - 6).toFixed(2)} ${(rOuter - 6).toFixed(2)} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
          `L ${xi1.toFixed(2)} ${yi1.toFixed(2)} ` +
          `A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 ${large} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`;
        return <Path key={s.key} d={d} fill={s.color} fillOpacity={0.93} />;
      })}

      {/* inner well */}
      <Circle cx={cx} cy={cy} r={rInner - 2} fill={Colors.surface} stroke={Colors.line} strokeWidth={0.5} />

      {/* center: consumed kcal */}
      <SvgText
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={size * 0.14}
        fill={isComplete ? Colors.primary : isOver ? OVER_COLOR : Colors.ink}
        fontWeight="400"
        fontFamily="Georgia, serif"
      >
        {Math.round(consumed) || 0}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize={10}
        fill={isComplete ? Colors.primary : isOver ? OVER_COLOR : Colors.ink3}
        letterSpacing={1.2}
        fontFamily="Menlo, Courier, monospace"
      >
        {isComplete
          ? `✓ HEDEF · ${goal}`
          : isOver
          ? `${goal} + ${Math.round(overflow)} aşım`
          : `/ ${goal} kcal`}
      </SvgText>

      {/* tick marks at 25% intervals */}
      {[0, 90, 180, 270].map((a) => {
        const [x1, y1] = polar(cx, cy, rOuter + 3, a);
        const [x2, y2] = polar(cx, cy, rOuter - 2, a);
        return (
          <Line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isComplete ? Colors.primary : isOver ? OVER_COLOR : Colors.ink4}
            strokeWidth={0.6}
            strokeOpacity={isComplete ? 0.7 : isOver ? 0.5 : 1}
          />
        );
      })}
    </Svg>
  );
}
