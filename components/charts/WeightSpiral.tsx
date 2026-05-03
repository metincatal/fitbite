import React from 'react';
import Svg, { Circle, Path, Line, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
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

// Linear interpolation of weight at position t (0=oldest,1=newest) across actual data
function interpWeight(data: WeightPoint[], t: number): number {
  if (data.length === 1) return data[0].weight;
  const idx = t * (data.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, data.length - 1);
  return data[lo].weight + (data[hi].weight - data[lo].weight) * (idx - lo);
}

// Approximate the design's oklch gradient in sRGB:
//   t=0 (lightest weight) → muted sage green  ~#5C9B72
//   t=1 (heaviest weight) → warm terracotta   ~#C8612E
function spiralColor(t: number): string {
  const r0 = 0x5c, g0 = 0x9b, b0 = 0x72;
  const r1 = 0xc8, g1 = 0x61, b1 = 0x2e;
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

const SPIRAL_SAMPLES = 200;
const COLOR_BANDS = 32;

export function WeightSpiral({ data, target = 72, size = 320 }: WeightSpiralProps) {
  if (!data || data.length < 2) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.44;
  const rMin = size * 0.08;
  const turns = 3.5;

  const minW = Math.min(...data.map((d) => d.weight));
  const maxW = Math.max(...data.map((d) => d.weight));
  const range = Math.max(0.1, maxW - minW);

  // Generate evenly-spaced sample points along the Archimedean spiral.
  // Oversampling ensures the curve is always visually smooth regardless of
  // how few real weight measurements exist.
  const samples = Array.from({ length: SPIRAL_SAMPLES + 1 }, (_, i) => {
    const t = i / SPIRAL_SAMPLES;
    const r = rMin + (rMax - rMin) * t;
    const deg = t * turns * 360 - 90;
    const [x, y] = polar(cx, cy, r, deg);
    const w = interpWeight(data, t);
    const wt = (w - minW) / range;
    return { x, y, wt };
  });

  // Group consecutive segments by color band to reduce SVG element count
  type Seg = { d: string; color: string; sw: number };
  const segments: Seg[] = [];
  let curBand = -1;
  let curD = '';
  let curColor = '';
  let curSw = 0;

  for (let i = 0; i < SPIRAL_SAMPLES; i++) {
    const p0 = samples[i];
    const p1 = samples[i + 1];
    const avgWt = (p0.wt + p1.wt) / 2;
    const band = Math.floor(avgWt * COLOR_BANDS);
    const sw = 1.6 + avgWt * 1.2;

    if (band !== curBand) {
      if (curD) segments.push({ d: curD, color: curColor, sw: curSw });
      curBand = band;
      curColor = spiralColor(avgWt);
      curSw = sw;
      curD = `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    } else {
      curD += ` L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
  }
  if (curD) segments.push({ d: curD, color: curColor, sw: curSw });

  const lastPt = samples[SPIRAL_SAMPLES];
  const current = data[data.length - 1].weight;

  // Periodic tick dots — placed at quarter-turn intervals along the spiral
  const tickCount = Math.round(turns * 4);
  const ticks = Array.from({ length: tickCount - 1 }, (_, i) => {
    const t = (i + 1) / tickCount;
    const r = rMin + (rMax - rMin) * t;
    const deg = t * turns * 360 - 90;
    const [x, y] = polar(cx, cy, r, deg);
    return { x, y };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <Defs>
        <RadialGradient id="spiralGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={Colors.terracotta} stopOpacity={0.12} />
          <Stop offset="1" stopColor={Colors.terracotta} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* soft radial glow */}
      <Circle cx={cx} cy={cy} r={rMax + 4} fill="url(#spiralGlow)" />

      {/* 12 spoke guides — dashed lines from center to outer edge */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30 - 90;
        const [x1, y1] = polar(cx, cy, rMin - 2, a);
        const [x2, y2] = polar(cx, cy, rMax + 8, a);
        return (
          <Line
            key={i}
            x1={x1.toFixed(1)} y1={y1.toFixed(1)}
            x2={x2.toFixed(1)} y2={y2.toFixed(1)}
            stroke={Colors.line} strokeWidth={0.5} strokeDasharray="2 3"
          />
        );
      })}

      {/* smooth colored spiral — 200 segments blended into ~32 color bands */}
      {segments.map((s, i) => (
        <Path
          key={i}
          d={s.d}
          stroke={s.color}
          strokeWidth={s.sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {/* periodic tick dots */}
      {ticks.map((d, i) => (
        <Circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={1.4} fill={Colors.ink2} fillOpacity={0.5} />
      ))}

      {/* "now" marker at the outer end of the spiral */}
      <Circle
        cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)}
        r={7} fill={Colors.terracotta} stroke={Colors.background} strokeWidth={2}
      />
      <Line
        x1={lastPt.x.toFixed(1)} y1={lastPt.y.toFixed(1)}
        x2={(lastPt.x + 22).toFixed(1)} y2={(lastPt.y - 22).toFixed(1)}
        stroke={Colors.ink2} strokeWidth={0.8}
      />
      <SvgText
        x={(lastPt.x + 24).toFixed(1)} y={(lastPt.y - 22).toFixed(1)}
        fontSize={9} fill={Colors.ink2}
        fontFamily="Menlo, Courier, monospace" letterSpacing={0.8}
      >
        BUGÜN
      </SvgText>
      <SvgText
        x={(lastPt.x + 24).toFixed(1)} y={(lastPt.y - 9).toFixed(1)}
        fontSize={15} fill={Colors.ink}
        fontFamily="Georgia, serif"
      >
        {`${current} kg`}
      </SvgText>

      {/* center circle — target weight label */}
      <Circle cx={cx} cy={cy} r={rMin - 2} fill={Colors.surface} stroke={Colors.line} strokeWidth={0.5} />
      <SvgText
        x={cx} y={cy - 2}
        textAnchor="middle" fontSize={8} fill={Colors.ink3}
        fontFamily="Menlo, Courier, monospace" letterSpacing={1}
      >
        HEDEF
      </SvgText>
      <SvgText
        x={cx} y={cy + 9}
        textAnchor="middle" fontSize={12} fill={Colors.ink}
        fontFamily="Georgia, serif"
      >
        {target}
      </SvgText>
    </Svg>
  );
}
