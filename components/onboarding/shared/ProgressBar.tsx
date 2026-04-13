import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius } from '../../../lib/constants';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${(current / total) * 100}%` as any, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    }),
  }));

  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.segmentWrapper}>
          <View style={styles.segmentTrack}>
            {i < current && <View style={styles.segmentFill} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  segmentWrapper: {
    flex: 1,
  },
  segmentTrack: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
});
