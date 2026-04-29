import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, INTENSITY_LABELS } from '../../lib/constants';
import type { ExerciseOutput } from '../../lib/exerciseEngine';

interface Props {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseEmoji: string;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  engine: ExerciseOutput;
  weightKg: number;
  sex: 'male' | 'female';
}

export function ExerciseBreakdownSheet({
  visible, onClose,
  exerciseName, exerciseEmoji,
  durationMinutes, intensity,
  engine, weightKg, sex,
}: Props) {
  const intensityInfo = INTENSITY_LABELS[intensity];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerEmoji}>{exerciseEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{exerciseName}</Text>
              <Text style={s.subtitle}>{durationMinutes} dk · {intensityInfo.emoji} {intensityInfo.label}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Result summary */}
            <View style={s.resultCard}>
              <View style={s.resultRow}>
                <View style={s.resultItem}>
                  <Text style={s.resultValue}>{engine.kcalNet}</Text>
                  <Text style={s.resultLabel}>kcal (net)</Text>
                </View>
                <View style={s.resultDivider} />
                <View style={s.resultItem}>
                  <Text style={s.resultValue}>+{engine.epocRange[0]}–{engine.epocRange[1]}</Text>
                  <Text style={s.resultLabel}>EPOC bonus</Text>
                </View>
                <View style={s.resultDivider} />
                <View style={s.resultItem}>
                  <Text style={s.resultValue}>+{engine.waterBonusML}</Text>
                  <Text style={s.resultLabel}>ml su</Text>
                </View>
              </View>
              <Text style={s.totalRange}>
                Toplam: {engine.totalKcalRange[0]}–{engine.totalKcalRange[1]} kcal
              </Text>
            </View>

            {/* Step-by-step breakdown */}
            <Text style={s.sectionTitle}>Hesap Zinciri</Text>

            <View style={s.stepCard}>
              <StepRow
                num="01"
                label="Bireysel Dinlenme Metabolizması (RMR)"
                formula={`Harris-Benedict (${sex === 'male' ? 'Erkek' : 'Kadın'}) — ${weightKg} kg`}
                result={`${engine.rmr} kcal/gün`}
              />
              <StepRow
                num="02"
                label="Corrected MET"
                formula={`Standart MET(${engine.standardMet}) × (RMR_ml ÷ 3.5)`}
                result={`${engine.correctedMet} MET`}
              />
              <StepRow
                num="03"
                label="Net MET (double-count önleme)"
                formula={`${engine.correctedMet} − 1 = ${(engine.correctedMet - 1).toFixed(2)}`}
                result="TDEE zaten BMR içeriyor"
              />
              <StepRow
                num="04"
                label="Net Kalori"
                formula={`Net MET × ${weightKg} kg × ${(durationMinutes / 60).toFixed(2)} sa`}
                result={`${engine.kcalNet} kcal`}
              />
              <StepRow
                num="05"
                label="EPOC Aralığı"
                formula={`Net kcal × EPOC katsayısı (${engine.metStage})`}
                result={`+${engine.epocRange[0]}–${engine.epocRange[1]} kcal`}
                isLast
              />
            </View>

            {/* Water section */}
            <Text style={s.sectionTitle}>Su Önerisi (ACSM 2007)</Text>
            <View style={s.infoCard}>
              <Text style={s.infoText}>
                Temel: +250 ml · +150 ml / 30 dk ek süre
                {intensity === 'high' ? ' · +250 ml yoğun egzersiz' : ''}
                {'\n'}
                Toplam ek su: <Text style={s.infoBold}>+{engine.waterBonusML} ml</Text>
              </Text>
              {engine.electrolytesWarning && (
                <View style={s.warningRow}>
                  <Ionicons name="warning-outline" size={14} color={Colors.warning} />
                  <Text style={s.warningText}>
                    60+ dk yoğun egzersiz → elektrolit içeceği önerilebilir (Bell & Spriet, 2025)
                  </Text>
                </View>
              )}
            </View>

            {/* Source note */}
            <View style={s.sourceCard}>
              <Ionicons name="library-outline" size={14} color={Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.sourceText}>{engine.sourceNote}</Text>
                <Text style={s.sourceText}>EPOC: Borsheim & Bahr (2003) · OT Dude MET Stages (2024)</Text>
                <Text style={s.sourceText}>Su: ACSM Position Stand (2007)</Text>
              </View>
            </View>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StepRow({
  num, label, formula, result, isLast = false,
}: {
  num: string; label: string; formula: string; result: string; isLast?: boolean;
}) {
  return (
    <View style={[stepS.row, !isLast && stepS.rowBorder]}>
      <View style={stepS.numWrap}>
        <Text style={stepS.num}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={stepS.label}>{label}</Text>
        <Text style={stepS.formula}>{formula}</Text>
      </View>
      <Text style={stepS.result}>{result}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  resultValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  resultLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  totalRange: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.warning + '12',
    borderRadius: BorderRadius.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
    lineHeight: 16,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
  },
  sourceText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});

const stepS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  numWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  formula: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  result: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
