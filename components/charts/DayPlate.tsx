import React from 'react';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../lib/constants';

// Premium macro ring colors
const MACRO_COLORS = {
  carbs:   '#C8974A',  // burnished amber
  protein: '#2D6A4F',  // deep forest green
  fat:     '#C45A3E',  // deep sienna
};

interface DayPlateProps {
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

export function DayPlate({ protein, carbs, fat, goal = 2000, size = 280 }: DayPlateProps) {
  const proteinKcal = protein * 4;
  const carbsKcal   = carbs * 4;
  const fatKcal     = fat * 9;
  const consumed    = proteinKcal + carbsKcal + fatKcal;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.46;
  const rInner = size * 0.22;

  const macros: { key: keyof typeof MACRO_COLORS; kcal: number }[] = [
    { key: 'carbs',   kcal: carbsKcal   },
    { key: 'protein', kcal: proteinKcal },
    { key: 'fat',     kcal: fatKcal     },
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
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* plate shadow */}
      <Circle cx={cx} cy={cy + 2} r={rOuter + 4} fill="#00000010" />
      {/* plate rim */}
      <Circle cx={cx} cy={cy} r={rOuter + 3} fill={Colors.surface} stroke={Colors.line} strokeWidth={1} />
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
        fill={Colors.ink}
        fontWeight="400"
        fontFamily="Georgia, serif"
      >
        {Math.round(consumed)}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize={10}
        fill={Colors.ink3}
        letterSpacing={1.2}
        fontFamily="Menlo, Courier, monospace"
      >
        {`/ ${goal} kcal`}
      </SvgText>

      {/* tick marks at 25% intervals */}
      {[0, 90, 180, 270].map((a) => {
        const [x1, y1] = polar(cx, cy, rOuter + 3, a);
        const [x2, y2] = polar(cx, cy, rOuter - 2, a);
        return (
          <Line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={Colors.ink4} strokeWidth={0.6} />
        );
      })}
    </Svg>
  );
}
