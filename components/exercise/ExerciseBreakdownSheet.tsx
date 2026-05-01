import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Line, Rect, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, INTENSITY_LABELS } from '../../lib/constants';
import type { ExerciseOutput } from '../../lib/exerciseEngine';

function ExGlyph({ kind, size = 22, color = '#17201A', strokeWidth = 1.3 }: {
  kind: string; size?: number; color?: string; strokeWidth?: number;
}) {
  const p = { fill: 'none' as const, stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'pulse': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2 12h4l2-6 4 12 3-9 2 3h5" {...p}/></Svg>;
    case 'run': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={14} cy={5} r={1.6} {...p}/><Path d="M7 21L10 15L8 11L13 9L17 13L21 12" {...p}/><Path d="M10 15L6 14" {...p}/></Svg>;
    case 'walk': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={4} r={1.5} {...p}/><Path d="M9 21l1.5-6L9 12l3-3 2 2 3-1" {...p}/><Path d="M9 12l-2 2" {...p}/></Svg>;
    case 'bike': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={6} cy={16} r={3.5} {...p}/><Circle cx={18} cy={16} r={3.5} {...p}/><Path d="M6 16l4-8h4l2 8" {...p}/><Path d="M10 8h4" {...p}/></Svg>;
    case 'wave': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" {...p}/><Path d="M2 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" {...p}/></Svg>;
    case 'orbit': return <Svg width={size} height={size} viewBox="0 0 24 24"><Ellipse cx={12} cy={12} rx={9} ry={4} {...p}/><Circle cx={12} cy={12} r={2} fill={color} stroke="none"/></Svg>;
    case 'row': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={17} cy={5} r={1.5} {...p}/><Path d="M3 14l4-4 4 3 4-5 3 1" {...p}/><Path d="M3 18h18" {...p}/></Svg>;
    case 'stairs': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 20H7V16H11V12H15V8H19V4" {...p}/></Svg>;
    case 'rope': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3v4" {...p}/><Path d="M8 5c0 4 8 4 8 8s-8 4-8 8" {...p}/><Path d="M16 5c0 4-8 4-8 8s8 4 8 8" {...p}/></Svg>;
    case 'barbell': return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1={3} y1={12} x2={21} y2={12} {...p}/><Rect x={3} y={9} width={2} height={6} rx={0.5} {...p}/><Rect x={7} y={7} width={2} height={10} rx={0.5} {...p}/><Rect x={15} y={7} width={2} height={10} rx={0.5} {...p}/><Rect x={19} y={9} width={2} height={6} rx={0.5} {...p}/></Svg>;
    case 'flex': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 19c0-4 3-6 6-6s6 2 6 6" {...p}/><Path d="M8 8c0-2 1.5-4 4-4s4 2 4 4-1.5 5-4 5-4-3-4-5z" {...p}/></Svg>;
    case 'kbell': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={9} r={4} {...p}/><Path d="M8 13l-2 7h12l-2-7" {...p}/><Path d="M10 9h4" {...p}/></Svg>;
    case 'fire': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2c0 6-6 8-6 13a6 6 0 0012 0c0-5-6-7-6-13z" {...p}/><Path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z" {...p}/></Svg>;
    case 'pitch': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={4} width={20} height={16} rx={1} {...p}/><Path d="M12 4v16" {...p}/><Circle cx={12} cy={12} r={4} {...p}/></Svg>;
    case 'court': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={4} {...p}/><Path d="M5 20a7 7 0 0114 0" {...p}/></Svg>;
    case 'racquet': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={10} cy={10} r={5} {...p}/><Line x1={14} y1={14} x2={21} y2={21} {...p}/></Svg>;
    case 'net': return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1={2} y1={12} x2={22} y2={12} {...p}/><Path d="M6 6l-4 12" {...p}/><Path d="M18 6l4 12" {...p}/><Path d="M8 6h8" {...p}/></Svg>;
    case 'paddle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Ellipse cx={10} cy={10} rx={5} ry={7} {...p}/><Line x1={14} y1={16} x2={20} y2={22} {...p}/></Svg>;
    case 'shuttle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={7} r={3} {...p}/><Path d="M9 10l-4 10" {...p}/><Path d="M15 10l4 10" {...p}/><Path d="M8 20h8" {...p}/></Svg>;
    case 'lotus': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21c0-5 3-8 3-11a3 3 0 00-6 0c0 3 3 6 3 11z" {...p}/><Path d="M5 18c2-3 5-4 7-3" {...p}/><Path d="M19 18c-2-3-5-4-7-3" {...p}/></Svg>;
    case 'arc': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 20c0-6 3-10 7-10s7 4 7 10" {...p}/><Path d="M12 10V4" {...p}/></Svg>;
    case 'spiral': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 12 m-1 0 a1 1 0 1 0 2 0 a4 4 0 1 0 -7.5 -2 a8 8 0 1 0 14.5 4" {...p}/></Svg>;
    case 'dot': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={3} fill={color} stroke="none"/><Circle cx={12} cy={12} r={7} {...p}/></Svg>;
    case 'reach': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3v10" {...p}/><Path d="M8 7l4-4 4 4" {...p}/><Path d="M5 17c0-3 3-5 7-5s7 2 7 5" {...p}/></Svg>;
    case 'mountain': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 20L9 8l4 6 3-4 5 10H3z" {...p}/></Svg>;
    case 'mtb': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={6} cy={16} r={3.5} {...p}/><Circle cx={18} cy={16} r={3.5} {...p}/><Path d="M6 16l5-9h3l2 5" {...p}/><Path d="M15 7l3 5" {...p}/></Svg>;
    case 'ski': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 17l6-8 4 3 4-5 4 3" {...p}/><Path d="M2 20l20-2" {...p}/></Svg>;
    case 'bolt': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" {...p}/></Svg>;
    case 'glove': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={6} y={8} width={12} height={10} rx={3} {...p}/><Path d="M9 8V5a2 2 0 014 0v3" {...p}/><Path d="M13 8V4a2 2 0 014 0v4" {...p}/></Svg>;
    case 'spring': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3c0 3-3 5-3 9s3 6 3 9" {...p}/><Path d="M9 8c-2 1-4 3-4 5s2 4 4 5" {...p}/><Path d="M15 8c2 1 4 3 4 5s-2 4-4 5" {...p}/></Svg>;
    case 'medal': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={14} r={5} {...p}/><Path d="M8 9l-3-6h14l-3 6" {...p}/></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={5} {...p}/></Svg>;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseEmoji: string;
  exerciseGlyph?: string;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  engine: ExerciseOutput;
  weightKg: number;
  sex: 'male' | 'female';
}

export function ExerciseBreakdownSheet({
  visible, onClose,
  exerciseName, exerciseEmoji, exerciseGlyph,
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
            {exerciseGlyph
              ? <ExGlyph kind={exerciseGlyph} size={28} color={Colors.ink} />
              : <Text style={s.headerEmoji}>{exerciseEmoji}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{exerciseName}</Text>
              <Text style={s.subtitle}>{durationMinutes} dk · {intensityInfo.label}</Text>
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
