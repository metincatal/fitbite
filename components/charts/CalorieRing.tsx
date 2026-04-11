import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize } from '../../lib/constants';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 160 }: CalorieRingProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference * (1 - percentage);
  const isOver = consumed > goal;
  const remaining = goal - consumed;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Arka plan halkası */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Dolgu halkası */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOver ? Colors.error : Colors.primary}
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
        <Text style={[styles.consumed, isOver && styles.consumedOver]}>
          {Math.round(consumed)}
        </Text>
        <Text style={styles.kcalLabel}>kcal</Text>
        <Text style={[styles.remaining, isOver && styles.remainingOver]}>
          {isOver ? `+${Math.round(-remaining)}` : `${Math.round(remaining)} kaldı`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  consumed: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  consumedOver: {
    color: Colors.error,
  },
  kcalLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  remaining: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  remainingOver: {
    color: Colors.error,
  },
});
