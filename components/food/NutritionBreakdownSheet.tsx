import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import type { EngineOutput, CookingMethod, Texture, EngineConfidence } from '../../types/nutrition';

const COOKING_METHODS: { key: CookingMethod; label: string }[] = [
  { key: 'raw', label: 'Çiğ' },
  { key: 'boiled', label: 'Haşlama' },
  { key: 'grilled', label: 'Izgara' },
  { key: 'fried', label: 'Kızartma' },
  { key: 'deep_fried', label: 'Derin Kızartma' },
  { key: 'baked', label: 'Fırın' },
  { key: 'steamed', label: 'Buharda' },
  { key: 'sauteed', label: 'Sote' },
  { key: 'unknown', label: 'Bilinmiyor' },
];

const TEXTURES: { key: Texture; label: string }[] = [
  { key: 'fluffy', label: 'Kabarık' },
  { key: 'dense', label: 'Yoğun' },
  { key: 'granular', label: 'Granüler' },
  { key: 'liquid', label: 'Sıvı' },
  { key: 'amorphous', label: 'Amorf' },
];

const CONF_LABEL: Record<EngineConfidence, string> = {
  high: 'Yüksek güven',
  medium: 'Orta güven',
  low: 'Düşük güven',
};

const CONF_COLOR: Record<EngineConfidence, string> = {
  high: '#27AE60',
  medium: '#E67E22',
  low: '#C0392B',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  itemName: string;
  itemGrams: number;
  cookingMethod?: CookingMethod;
  texture?: Texture;
  engine: EngineOutput | null;
  onChangeCookingMethod?: (m: CookingMethod) => void;
  onChangeTexture?: (t: Texture) => void;
}

export function NutritionBreakdownSheet({
  visible,
  onClose,
  itemName,
  itemGrams,
  cookingMethod,
  texture,
  engine,
  onChangeCookingMethod,
  onChangeTexture,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>{itemGrams}g · Nasıl hesaplandı?</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            {/* Sonuç + güven */}
            {engine && (
              <View style={styles.resultCard}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={styles.resultKcal}>{engine.kcal}</Text>
                  <Text style={styles.resultUnit}>kcal</Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroChip}>P {engine.protein}g</Text>
                  <Text style={styles.macroChip}>K {engine.carbs}g</Text>
                  <Text style={styles.macroChip}>Y {engine.fat}g</Text>
                </View>
                <View
                  style={[
                    styles.confBadge,
                    { backgroundColor: CONF_COLOR[engine.confidence] + '20', borderColor: CONF_COLOR[engine.confidence] },
                  ]}
                >
                  <Text style={[styles.confBadgeText, { color: CONF_COLOR[engine.confidence] }]}>
                    {CONF_LABEL[engine.confidence]} · %{Math.round(engine.confidenceScore * 100)}
                  </Text>
                  <Text style={styles.confBadgeSource}>
                    {engine.match.source === 'composition'
                      ? `Eşleşme: ${engine.match.entryId ?? 'kompozisyon'}`
                      : 'Kompozisyon eşleşmesi yok — Gemini tahmini'}
                  </Text>
                </View>
              </View>
            )}

            {/* Adım adım breakdown */}
            <Text style={styles.sectionLabel}>Hesap zinciri</Text>
            <View style={styles.stepsCard}>
              {engine?.breakdown.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBullet}>
                    <Text style={styles.stepBulletText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                    {step.value && <Text style={styles.stepValue}>{step.value}</Text>}
                  </View>
                </View>
              ))}
            </View>

            {/* Pişirme yöntemi düzenleme */}
            {onChangeCookingMethod && (
              <>
                <Text style={styles.sectionLabel}>Pişirme yöntemi</Text>
                <View style={styles.chipRow}>
                  {COOKING_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.chip,
                        cookingMethod === m.key && styles.chipActive,
                      ]}
                      onPress={() => onChangeCookingMethod(m.key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          cookingMethod === m.key && styles.chipTextActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Doku düzenleme */}
            {onChangeTexture && (
              <>
                <Text style={styles.sectionLabel}>Doku</Text>
                <View style={styles.chipRow}>
                  {TEXTURES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.chip,
                        texture === t.key && styles.chipActive,
                      ]}
                      onPress={() => onChangeTexture(t.key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          texture === t.key && styles.chipTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: Spacing.lg }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultKcal: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  resultUnit: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
  macroChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  confBadge: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  confBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  confBadgeSource: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    gap: 10,
  },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
  },
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  stepDetail: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  stepValue: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 1,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.textLight,
  },
});
