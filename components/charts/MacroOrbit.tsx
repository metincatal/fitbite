import React from 'react';
import Svg, { Circle, Path, Text as SvgText, G } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface MacroOrbitProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  size?: number;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function MacroOrbit({
  protein,
  carbs,
  fat,
  proteinGoal = 120,
  carbsGoal = 240,
  fatGoal = 70,
  size = 110,
}: MacroOrbitProps) {
  const cx = size / 2;
  const cy = size / 2;

  const orbits = [
    { r: size * 0.42, val: protein, goal: proteinGoal, color: Colors.protein, label: 'P' },
    { r: size * 0.30, val: carbs, goal: carbsGoal, color: Colors.carbs, label: 'K' },
    { r: size * 0.18, val: fat, goal: fatGoal, color: Colors.fat, label: 'Y' },
  ];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* center sun */}
      <Circle cx={cx} cy={cy} r={3.5} fill={Colors.ink} />

      {orbits.map((o, i) => {
        const frac = Math.min(1, o.val / o.goal);
        const angle = -90 + frac * 360;
        const [mx, my] = polar(cx, cy, o.r, angle);
        const moonR = Math.max(6, 7 + (frac) * 4);
        const arcEnd = frac >= 1 ? angle - 0.01 : angle;

        return (
          <G key={i}>
            {/* orbit ring */}
            <Circle
              cx={cx} cy={cy} r={o.r}
              fill="none" stroke={Colors.line} strokeWidth={0.8}
              strokeDasharray="1 3"
            />
            {/* progress arc */}
            {frac > 0.01 && (
              <Path
                d={arcPath(cx, cy, o.r, -90, arcEnd)}
                fill="none"
                stroke={o.color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )}
            {/* moon */}
            <Circle cx={mx} cy={my} r={moonR} fill={o.color} />
            <SvgText
              x={mx}
              y={my + 3.5}
              textAnchor="middle"
              fontSize={8}
              fontWeight="700"
              fill={Colors.surface}
              fontFamily="Menlo, Courier, monospace"
            >
              {o.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
