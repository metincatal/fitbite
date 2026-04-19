import React, { useMemo } from 'react';
import Svg, { Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface Star {
  x: number;
  y: number;
  name: string;
  unlocked: boolean;
  big?: boolean;
}

interface AchievementConstellationProps {
  stars: Star[];
  edges?: [number, number][];
  width?: number;
  height?: number;
}

export function AchievementConstellation({
  stars,
  edges = [],
  width = 340,
  height = 310,
}: AchievementConstellationProps) {
  const bgStars = useMemo(() => {
    // Deterministic starfield using seed
    const result: { cx: number; cy: number; r: number; opacity: number }[] = [];
    let s = 42;
    for (let i = 0; i < 40; i++) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const cx = Math.abs(s % width);
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const cy = Math.abs(s % height);
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const r = (Math.abs(s % 8) / 10) + 0.2;
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const opacity = (Math.abs(s % 5) / 10) + 0.2;
      result.push({ cx, cy, r, opacity });
    }
    return result;
  }, [width, height]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* dark bg */}
      <Rect x={0} y={0} width={width} height={height} fill={Colors.ink} rx={18} />

      {/* starfield */}
      {bgStars.map((s, i) => (
        <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={Colors.background} fillOpacity={s.opacity} />
      ))}

      {/* constellation edges between unlocked stars */}
      {edges.map((e, i) => {
        const [a, b] = e;
        if (!stars[a]?.unlocked || !stars[b]?.unlocked) return null;
        return (
          <Line
            key={i}
            x1={stars[a].x} y1={stars[a].y}
            x2={stars[b].x} y2={stars[b].y}
            stroke={Colors.ochre} strokeWidth={0.6} strokeOpacity={0.5} strokeDasharray="1 2"
          />
        );
      })}

      {/* stars */}
      {stars.map((s, i) => (
        <React.Fragment key={i}>
          {s.unlocked && (
            <Circle cx={s.x} cy={s.y} r={s.big ? 14 : 9} fill={Colors.ochre} fillOpacity={0.15} />
          )}
          <Circle
            cx={s.x} cy={s.y}
            r={s.unlocked ? (s.big ? 3.5 : 2.5) : 1.5}
            fill={s.unlocked ? Colors.ochre : Colors.ink3}
          />
          <SvgText
            x={s.x} y={s.y + (s.big ? 22 : 18)}
            textAnchor="middle"
            fontSize={9}
            fill={s.unlocked ? Colors.background : Colors.ink3}
            fontFamily="Menlo, Courier, monospace"
            letterSpacing={0.8}
          >
            {s.name.toUpperCase()}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}
