import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';

interface OptionCardProps {
  label: string;
  description?: string;
  emoji?: string;
  icon?: string;
  selected?: boolean;
  onPress: () => void;
  variant?: 'card' | 'list' | 'chip';
}

export function OptionCard({
  label,
  description,
  emoji,
  icon,
  selected = false,
  onPress,
  variant = 'list',
}: OptionCardProps) {
  if (variant === 'chip') {
    return (
      <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {emoji && <Text style={styles.chipEmoji}>{emoji}</Text>}
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'card') {
    return (
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {emoji && <Text style={styles.cardEmoji}>{emoji}</Text>}
        {icon && (
          <Ionicons
            name={icon as any}
            size={28}
            color={selected ? Colors.primary : Colors.textSecondary}
          />
        )}
        <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>{label}</Text>
        {description && (
          <Text style={[styles.cardDesc, selected && styles.cardDescSelected]}>{description}</Text>
        )}
      </TouchableOpacity>
    );
  }

  // list variant
  return (
    <TouchableOpacity
      style={[styles.listItem, selected && styles.listItemSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.listLeft}>
        {emoji && <Text style={styles.listEmoji}>{emoji}</Text>}
        {icon && (
          <Ionicons
            name={icon as any}
            size={22}
            color={selected ? Colors.primary : Colors.textSecondary}
            style={styles.listIcon}
          />
        )}
        <View style={styles.listTextWrapper}>
          <Text style={[styles.listLabel, selected && styles.listLabelSelected]}>{label}</Text>
          {description && (
            <Text style={[styles.listDesc, selected && styles.listDescSelected]}>{description}</Text>
          )}
        </View>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Card variant
  card: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    flex: 1,
    gap: Spacing.xs,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '40',
  },
  cardEmoji: { fontSize: 28 },
  cardLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cardLabelSelected: { color: Colors.primary },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  cardDescSelected: { color: Colors.primaryLight },

  // List variant
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  listItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '30',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  listEmoji: { fontSize: 22 },
  listIcon: { marginRight: Spacing.xs },
  listTextWrapper: { flex: 1 },
  listLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listLabelSelected: { color: Colors.primary, fontWeight: '700' },
  listDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listDescSelected: { color: Colors.textSecondary },

  // Radio circle
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  // Chip variant
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
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '40',
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipLabelSelected: { color: Colors.primary, fontWeight: '700' },
});
