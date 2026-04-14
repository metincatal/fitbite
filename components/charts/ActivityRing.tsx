import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize } from '../../lib/constants';

interface ActivityRingProps {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  unit: string;
}

export function ActivityRing({
  value,
  goal,
  size = 80,
  strokeWidth = 8,
  color,
  label,
  unit,
}: ActivityRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / (goal || 1), 1);
  const strokeDashoffset = circumference * (1 - percentage);

  const displayValue =
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;

  return (
    <View style={styles.container}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${color}20`}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.value, { color }]}>{displayValue}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: '800',
    lineHeight: 18,
  },
  unit: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
});
