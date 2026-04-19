import React, { useMemo } from 'react';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface TideProps {
  glasses: number;
  goal?: number;
  width?: number;
  height?: number;
}

export function Tide({ glasses, goal = 8, width = 340, height = 86 }: TideProps) {
  const pct = Math.min(1, glasses / goal);
  const surfaceY = height - pct * (height - 8);

  const wavePath = useMemo(() => {
    let d = `M 0 ${surfaceY.toFixed(2)}`;
    for (let x = 0; x <= width; x += 8) {
      const y = surfaceY + Math.sin(x * 0.08) * 2.5;
      d += ` L ${x} ${y.toFixed(2)}`;
    }
    d += ` L ${width} ${height} L 0 ${height} Z`;
    return d;
  }, [surfaceY, width, height]);

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: 18, overflow: 'hidden' }}
    >
      <Defs>
        <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.sky} stopOpacity={0.4} />
          <Stop offset="1" stopColor={Colors.sky} stopOpacity={0.85} />
        </LinearGradient>
      </Defs>
      {/* background */}
      <Rect x={0} y={0} width={width} height={height} fill={Colors.surfaceSecondary} />

      {/* glass dividers */}
      {Array.from({ length: goal - 1 }).map((_, i) => {
        const x = ((i + 1) / goal) * width;
        return (
          <Line
            key={i}
            x1={x} y1={6} x2={x} y2={height - 6}
            stroke={Colors.line} strokeWidth={0.8} strokeDasharray="2 3"
          />
        );
      })}

      {/* wave fill */}
      <Path d={wavePath} fill="url(#tideGrad)" />

      {/* label */}
      <SvgText
        x={14} y={20}
        fontSize={10}
        fill={Colors.ink3}
        fontFamily="Menlo, Courier, monospace"
        letterSpacing={1.2}
      >
        SU · GELGİT
      </SvgText>
      <SvgText
        x={14} y={height - 14}
        fontSize={22}
        fill={Colors.ink}
        fontFamily="Georgia, serif"
      >
        {glasses}
      </SvgText>
      <SvgText
        x={14 + 22 * 0.6 + 4} y={height - 14}
        fontSize={13}
        fill={Colors.ink3}
        fontFamily="Georgia, serif"
      >
        {` / ${goal} bardak`}
      </SvgText>
    </Svg>
  );
}
