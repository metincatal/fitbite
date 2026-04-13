import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';

interface OptionChipProps {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionChip({ label, emoji, selected, onPress }: OptionChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '40',
  },
  emoji: { fontSize: 16 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
