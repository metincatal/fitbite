import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';

interface YesNoQuestionProps {
  number: number;
  question: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}

export function YesNoQuestion({ number, question, value, onChange }: YesNoQuestionProps) {
  const isYes = value === true;
  const isNo = value === false;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
        <Text style={styles.question}>{question}</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pill, isYes && styles.pillActive]}
          onPress={() => onChange(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillLabel, isYes && styles.pillLabelActive]}>Evet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, isNo && styles.pillActive]}
          onPress={() => onChange(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillLabel, isNo && styles.pillLabelActive]}>Hayır</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  question: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: FontSize.md * 1.35,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  pillLabelActive: {
    color: Colors.textLight,
  },
});
