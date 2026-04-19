import React from 'react';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface WeightPoint {
  week: number;
  weight: number;
}

interface WeightSpiralProps {
  data: WeightPoint[];
  target?: number;
  size?: number;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Interpolate between two hex-ish colors using a t value [0..1]
// heavier = terracotta, lighter = primary green
function weightColor(t: number): string {
  // t=0: lighter weight -> primary green
  // t=1: heavier weight -> terracotta
  const r0 = 0x2d, g0 = 0x6a, b0 = 0x4f; // #2D6A4F
  const r1 = 0xe8, g1 = 0x5d, b1 = 0x3c; // #E85D3C
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

export function WeightSpiral({ data, target = 72, size = 320 }: WeightSpiralProps) {
  if (!data || data.length < 2) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.44;
  const rMin = size * 0.08;
  const turns = 3.5;

  const pts = data.map((d, i) => {
    const t = i / (data.length - 1);
    const r = rMin + (rMax - rMin) * t;
    const ang = t * turns * 360 - 90;
    const [x, y] = polar(cx, cy, r, ang);
    return { x, y, r, ang, weight: d.weight, t };
  });

  const minW = Math.min(...data.map((d) => d.weight));
  const maxW = Math.max(...data.map((d) => d.weight));
  const range = Math.max(0.1, maxW - minW);

  const lastPt = pts[pts.length - 1];
  const current = data[data.length - 1].weight;

  // Line segments
  const segments = pts.slice(1).map((p, i) => {
    const prev = pts[i];
    const wt = (p.weight - minW) / range;
    const color = weightColor(wt);
    const sw = 1.4 + wt * 1.4;
    return { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color, sw };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <Defs>
        <RadialGradient id="spiralGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={Colors.terracotta} stopOpacity={0.15} />
          <Stop offset="1" stopColor={Colors.terracotta} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* glow */}
      <Circle cx={cx} cy={cy} r={rMax + 4} fill="url(#spiralGlow)" />

      {/* 12 spoke guides */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30 - 90;
        const [x1, y1] = polar(cx, cy, rMin - 2, a);
        const [x2, y2] = polar(cx, cy, rMax + 8, a);
        return (
          <Line
            key={i}
            x1={x1.toFixed(2)} y1={y1.toFixed(2)}
            x2={x2.toFixed(2)} y2={y2.toFixed(2)}
            stroke={Colors.line} strokeWidth={0.5} strokeDasharray="2 3"
          />
        );
      })}

      {/* colored spiral segments */}
      {segments.map((s, i) => (
        <Line
          key={i}
          x1={s.x1.toFixed(2)} y1={s.y1.toFixed(2)}
          x2={s.x2.toFixed(2)} y2={s.y2.toFixed(2)}
          stroke={s.color} strokeWidth={s.sw} strokeLinecap="round"
        />
      ))}

      {/* week dots every 4 weeks */}
      {pts.filter((_, i) => i % 4 === 0).map((p, i) => (
        <Circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={1.4} fill={Colors.ink2} fillOpacity={0.6} />
      ))}

      {/* "now" marker */}
      <Circle cx={lastPt.x.toFixed(2)} cy={lastPt.y.toFixed(2)} r={7} fill={Colors.terracotta} stroke={Colors.background} strokeWidth={2} />
      <Line
        x1={lastPt.x.toFixed(2)} y1={lastPt.y.toFixed(2)}
        x2={(lastPt.x + 24).toFixed(2)} y2={(lastPt.y - 24).toFixed(2)}
        stroke={Colors.ink2} strokeWidth={0.8}
      />
      <SvgText
        x={(lastPt.x + 26).toFixed(2)} y={(lastPt.y - 24).toFixed(2)}
        fontSize={9} fill={Colors.ink2}
        fontFamily="Menlo, Courier, monospace" letterSpacing={0.8}
      >
        BUGÜN
      </SvgText>
      <SvgText
        x={(lastPt.x + 26).toFixed(2)} y={(lastPt.y - 11).toFixed(2)}
        fontSize={15} fill={Colors.ink}
        fontFamily="Georgia, serif"
      >
        {`${current} kg`}
      </SvgText>

      {/* center label */}
      <Circle cx={cx} cy={cy} r={rMin - 2} fill={Colors.surface} stroke={Colors.line} strokeWidth={0.5} />
      <SvgText x={cx} y={cy - 2} textAnchor="middle" fontSize={8} fill={Colors.ink3} fontFamily="Menlo, Courier, monospace" letterSpacing={1}>
        HEDEF
      </SvgText>
      <SvgText x={cx} y={cy + 9} textAnchor="middle" fontSize={12} fill={Colors.ink} fontFamily="Georgia, serif">
        {target}
      </SvgText>
    </Svg>
  );
}
