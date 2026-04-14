import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, MOTIVATIONS } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function MotivationSelect({ onNext, onBack }: Props) {
  const { data, toggleArrayItem } = useOnboardingData();
  const isValid = data.motivations.length > 0;

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          ✨
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Neyi başarmak{'\n'}istiyorsun?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          FitBot odak noktalarını bilmek istiyor.{'\n'}Birden fazla seçebilirsin.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.grid}>
          {MOTIVATIONS.map((m) => {
            const selected = data.motivations.includes(m.key);
            return (
              <View key={m.key} style={styles.itemWrapper}>
                <View
                  style={[styles.item, selected && styles.itemSelected]}
                  onTouchEnd={() => toggleArrayItem('motivations', m.key)}
                >
                  <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
                    <Ionicons
                      name={m.icon as any}
                      size={22}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                    {m.label}
                  </Text>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>

        {data.motivations.length > 0 && (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.selectedCount}>
            {data.motivations.length} hedef seçildi
          </Animated.Text>
        )}

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} disabled={!isValid} />
          <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
        </View>
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, paddingBottom: Spacing.xxl },
  emoji: { fontSize: 52, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: FontSize.xxxl * 1.2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: FontSize.md * 1.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  itemWrapper: {
    width: '47%',
  },
  item: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    position: 'relative',
    minHeight: 72,
    justifyContent: 'center',
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '30',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconBoxSelected: {
    backgroundColor: Colors.primaryPale,
  },
  itemLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  itemLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
