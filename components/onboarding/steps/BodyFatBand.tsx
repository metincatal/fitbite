import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  BODY_FAT_BANDS,
  BodyFatBand as BandKey,
} from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function BodyFatBand({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const gender = data.gender ?? 'male';

  const handleSelect = (key: BandKey) => {
    updateField('body_fat_band', data.body_fat_band === key ? null : key);
  };

  const handleSkip = () => {
    updateField('body_fat_band', null);
    onNext();
  };

  return (
    <StepContainer>
      <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
        📐
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
        Vücut yağ oranın{'\n'}hakkında
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
        Opsiyonel — bilmiyorsan atla. Seçersen planını daha hassas hesaplarız (Katch-McArdle).
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.grid}>
        {BODY_FAT_BANDS.map((band) => {
          const selected = data.body_fat_band === band.key;
          const range = band[gender].range;
          return (
            <TouchableOpacity
              key={band.key}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => handleSelect(band.key as BandKey)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>{band.emoji}</Text>
              <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                {band.label}
              </Text>
              <Text style={[styles.cardRange, selected && styles.cardRangeSelected]}>{range}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.hintBox}>
        <Text style={styles.hintTitle}>Nasıl öğrenirim?</Text>
        <Text style={styles.hintText}>
          Caliper, akıllı tartı (Tanita) veya DEXA taraması en doğru sonuçları verir. Emin değilsen
          "atla" — seni Mifflin-St Jeor formülüyle hesaplayacağız.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <OnboardingButton title="Devam Et →" onPress={onNext} disabled={!data.body_fat_band} />
        <OnboardingButton title="Bilmiyorum, atla" onPress={handleSkip} variant="ghost" />
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: Spacing.lg,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 140,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale + '40',
  },
  cardEmoji: { fontSize: 36, marginBottom: Spacing.xs },
  cardLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cardLabelSelected: { color: Colors.primary },
  cardRange: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  cardRangeSelected: { color: Colors.primaryLight, fontWeight: '600' },

  hintBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  hintTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: FontSize.xs * 1.6,
  },

  footer: { marginTop: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
});
