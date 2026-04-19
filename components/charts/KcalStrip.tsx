import React from 'react';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface KcalStripProps {
  data: number[];
  goal?: number;
  width?: number;
  height?: number;
}

export function KcalStrip({ data, goal = 2000, width = 300, height = 60 }: KcalStripProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, goal * 1.15);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* goal line */}
      <Line
        x1={0} y1={(height - (goal / max) * (height - 10)).toFixed(2)}
        x2={width} y2={(height - (goal / max) * (height - 10)).toFixed(2)}
        stroke={Colors.line} strokeWidth={0.8} strokeDasharray="2 3"
      />

      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * (width - 6) + 3;
        const barH = (v / max) * (height - 10);
        const over = v > goal;
        const isLast = i === data.length - 1;
        return (
          <Rect
            key={i}
            x={(x - 3).toFixed(2)} y={(height - barH).toFixed(2)}
            width={6} height={barH.toFixed(2)}
            rx={1}
            fill={over ? Colors.terracotta : Colors.primary}
            fillOpacity={isLast ? 1 : 0.55}
          />
        );
      })}

      <SvgText
        x={width - 2}
        y={(height - (goal / max) * (height - 10) - 3).toFixed(2)}
        textAnchor="end"
        fontSize={9}
        fill={Colors.ink3}
        fontFamily="Menlo, Courier, monospace"
      >
        {goal}
      </SvgText>
    </Svg>
  );
}
