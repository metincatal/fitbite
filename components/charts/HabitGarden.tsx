import React from 'react';
import Svg, { Line, Ellipse, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../lib/constants';

interface Habit {
  name: string;
  streak: number;
  max?: number;
}

interface HabitGardenProps {
  habits: Habit[];
  width?: number;
  height?: number;
}

export function HabitGarden({ habits, width = 340, height = 300 }: HabitGardenProps) {
  const maxStreak = 14;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* soil */}
      <Rect x={0} y={240} width={width} height={60} fill="#8a6a3d" fillOpacity={0.12} />
      <Line x1={0} y1={240} x2={width} y2={240} stroke={Colors.ink3} strokeWidth={0.5} />

      {habits.slice(0, 7).map((h, i) => {
        const x = 30 + i * Math.min(42, (width - 60) / Math.max(1, habits.length - 1));
        const growth = Math.min(1, h.streak / (h.max ?? maxStreak));
        const stemH = 20 + growth * 170;
        const stemY = 240 - stemH;
        const leafCount = Math.ceil(growth * 5);
        const opacity = 0.4 + growth * 0.6;

        return (
          <React.Fragment key={h.name}>
            {/* stem */}
            <Line
              x1={x} y1={240}
              x2={x} y2={stemY + 10}
              stroke={Colors.primary} strokeWidth={1.5}
              strokeOpacity={opacity}
            />

            {/* leaves */}
            {Array.from({ length: leafCount }).map((_, li) => {
              const ly = 240 - (stemH * (li + 1) / 5.5);
              const left = li % 2 === 0;
              const lx = x + (left ? -8 : 8);
              const rotation = left ? -35 : 35;
              return (
                <Ellipse
                  key={li}
                  cx={lx} cy={ly}
                  rx={6} ry={3}
                  fill={Colors.primary}
                  fillOpacity={0.5 + growth * 0.4}
                  transform={`rotate(${rotation} ${x} ${ly})`}
                />
              );
            })}

            {/* flower if full streak */}
            {growth >= 1 && (
              <Circle cx={x} cy={stemY + 4} r={6} fill={Colors.terracotta} />
            )}
            {/* bud if early */}
            {growth < 0.3 && (
              <Circle cx={x} cy={stemY + 4} r={3} fill={Colors.ochre} fillOpacity={0.7} />
            )}

            {/* streak count */}
            <SvgText
              x={x} y={260}
              textAnchor="middle"
              fontSize={10}
              fill={Colors.ink2}
              fontFamily="Menlo, Courier, monospace"
              letterSpacing={0.5}
            >
              {h.streak}
            </SvgText>
            {/* habit name */}
            <SvgText
              x={x} y={278}
              textAnchor="middle"
              fontSize={9}
              fill={Colors.ink3}
              fontFamily="Georgia, serif"
            >
              {h.name}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
