import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 05:00 - 22:00
  return `${String(h).padStart(2, '0')}:00`;
});

function TimeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={selectorStyles.container}>
      <Text style={selectorStyles.label}>{label}</Text>
      <View style={selectorStyles.row}>
        {HOURS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[selectorStyles.chip, value === h && selectorStyles.chipSelected]}
            onPress={() => onChange(h)}
            activeOpacity={0.7}
          >
            <Text style={[selectorStyles.chipText, value === h && selectorStyles.chipTextSelected]}>
              {h}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  container: { marginBottom: Spacing.xl },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '40',
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

export function MealTiming({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();

  const windowHours = (() => {
    const [fh] = data.first_meal_time.split(':').map(Number);
    const [lh] = data.last_meal_time.split(':').map(Number);
    return lh - fh;
  })();

  return (
    <StepContainer>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          ⏰
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Öğün zamanların{'\n'}nasıl?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          Bildirimler ve IF penceresi buna göre ayarlanır
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <TimeSelector
            label="İlk öğün saati"
            value={data.first_meal_time}
            onChange={(v) => updateField('first_meal_time', v)}
          />
          <TimeSelector
            label="Son öğün saati"
            value={data.last_meal_time}
            onChange={(v) => updateField('last_meal_time', v)}
          />

          {windowHours > 0 && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.windowChip}>
              <Text style={styles.windowText}>
                🕐 {windowHours} saatlik beslenme penceresi
                {windowHours <= 10 ? '  |  Aralıklı oruç uyumlu ⚡' : ''}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} />
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
  },
  windowChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: -Spacing.md,
  },
  windowText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: FontSize.sm * 1.4,
  },
  footer: { marginTop: 'auto', gap: Spacing.sm, paddingTop: Spacing.lg },
});
