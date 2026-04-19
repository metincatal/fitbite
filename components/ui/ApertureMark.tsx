import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Colors } from '../../lib/constants';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ApertureMarkProps {
  animValue: Animated.Value;
  size?: number;
}

export function ApertureMark({ animValue, size = 62 }: ApertureMarkProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.484; // ~30 at 62
  const discR = size * 0.355;  // ~22 at 62
  const tickOuter = size * 0.468;
  const tickInner = size * 0.403;
  const barWidth = size * 0.468; // ~29
  const barX = cx - barWidth / 2;
  const barH = size * 0.048; // ~3

  // Bar Y positions: closed → open
  const topBarY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [cy - barH * 1.6, cy - discR * 0.72],
  });
  const bottomBarY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [cy + barH * 0.6, cy + discR * 0.56],
  });

  // Center pip: ink3 when closed, terracotta when open
  const pipFill = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.ink3, Colors.terracotta],
  });

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30 - 90;
    const rad = (deg * Math.PI) / 180;
    return {
      x1: cx + tickOuter * Math.cos(rad),
      y1: cy + tickOuter * Math.sin(rad),
      x2: cx + tickInner * Math.cos(rad),
      y2: cy + tickInner * Math.sin(rad),
    };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* outer bezel ring */}
      <Circle cx={cx} cy={cy} r={outerR} stroke={Colors.ink3} strokeWidth={1} fill="none" />

      {/* 12 tick marks */}
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={t.x1} y1={t.y1}
          x2={t.x2} y2={t.y2}
          stroke={Colors.ink3}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}

      {/* solid disc */}
      <Circle cx={cx} cy={cy} r={discR} fill={Colors.ink} />

      {/* shutter bars */}
      <AnimatedRect
        x={barX}
        y={topBarY}
        width={barWidth}
        height={barH}
        rx={barH / 2}
        fill={Colors.background}
      />
      <AnimatedRect
        x={barX}
        y={bottomBarY}
        width={barWidth}
        height={barH}
        rx={barH / 2}
        fill={Colors.background}
      />

      {/* center pip */}
      <AnimatedCircle cx={cx} cy={cy} r={size * 0.052} fill={pipFill} />
    </Svg>
  );
}
