import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { FoodLogWithFood } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.85);

interface Props {
  visible: boolean;
  onClose: () => void;
  logs: FoodLogWithFood[];
  onRemoveAll: () => void;
}

export function MealPhotoDetailModal({ visible, onClose, logs, onRemoveAll }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (visible) {
      setExpandedIndex(0);
      if (Platform.OS === 'ios') StatusBar.setBarStyle('light-content', true);
    } else {
      if (Platform.OS === 'ios') StatusBar.setBarStyle('dark-content', true);
    }
  }, [visible]);

  if (logs.length === 0) return null;

  const imageUrl = logs[0]?.image_url;
  const totalCalories = logs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = logs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = logs.reduce((s, l) => s + l.fat, 0);

  const mealLabel = logs[0]?.meal_type
    ? { breakfast: 'Kahvaltı', lunch: 'Öğle Yemeği', dinner: 'Akşam Yemeği', snack: 'Atıştırmalık' }[logs[0].meal_type] ?? ''
    : '';

  const loggedTime = logs[0]?.logged_at
    ? new Date(logs[0].logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          stickyHeaderIndices={[]}
        >
          {/* ── Full-bleed Hero Photo ── */}
          <View style={styles.heroContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroImage, { backgroundColor: Colors.borderLight }]} />
            )}

            {/* Faded gradient overlay at bottom of photo — simulated with layers */}
            <View style={styles.heroGradientLayer1} />
            <View style={styles.heroGradientLayer2} />
            <View style={styles.heroGradientLayer3} />

            {/* Back button — overlaid top-left */}
            <TouchableOpacity style={styles.backBtn} onPress={onClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Meal info — overlaid bottom of photo */}
            <View style={styles.heroMeta}>
              <View style={styles.heroMealBadge}>
                <Ionicons
                  name={
                    logs[0]?.meal_type === 'breakfast' ? 'sunny-outline'
                    : logs[0]?.meal_type === 'lunch' ? 'partly-sunny-outline'
                    : logs[0]?.meal_type === 'dinner' ? 'moon-outline'
                    : 'cafe-outline'
                  }
                  size={12}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.heroMealText}>{mealLabel}</Text>
              </View>
              <Text style={styles.heroTime}>{loggedTime}</Text>
            </View>
          </View>

          {/* ── Summary Strip ── */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryCount}>{logs.length} yiyecek / içecek</Text>
              <Text style={styles.summaryCalories}>{Math.round(totalCalories)} kcal</Text>
            </View>
            <View style={styles.summaryMacros}>
              <MacroPill label="P" value={Math.round(totalProtein)} color={Colors.protein} />
              <MacroPill label="K" value={Math.round(totalCarbs)} color={Colors.carbs} />
              <MacroPill label="Y" value={Math.round(totalFat)} color={Colors.fat} />
            </View>
          </View>

          {/* ── Section Title ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tespit Edilen Besinler</Text>
            <Text style={styles.sectionSubtitle}>AI tahmin · Dokunarak detay gör</Text>
          </View>

          {/* ── Food List ── */}
          <View style={styles.foodList}>
            {logs.map((log, index) => {
              const isExpanded = expandedIndex === index;
              const foodName = log.food?.name_tr ?? log.food?.name ?? 'Bilinmiyor';
              return (
                <TouchableOpacity
                  key={log.id}
                  style={[styles.foodCard, isExpanded && styles.foodCardExpanded]}
                  onPress={() => setExpandedIndex(isExpanded ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.foodCardHeader}>
                    <View style={styles.foodCardLeft}>
                      <View style={[styles.foodIndexBadge, { backgroundColor: `${Colors.primary}20` }]}>
                        <Text style={[styles.foodIndex, { color: Colors.primary }]}>{index + 1}</Text>
                      </View>
                      <View style={styles.foodCardInfo}>
                        <Text style={styles.foodCardName}>{foodName}</Text>
                        <Text style={styles.foodCardGrams}>~{log.serving_amount}g</Text>
                      </View>
                    </View>
                    <View style={styles.foodCardRight}>
                      <Text style={styles.foodCardCalories}>{Math.round(log.calories)} kcal</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.macroGrid}>
                      <MacroCard
                        label="Protein"
                        value={log.protein}
                        color={Colors.protein}
                        icon="fitness-outline"
                      />
                      <MacroCard
                        label="Karbonhidrat"
                        value={log.carbs}
                        color={Colors.carbs}
                        icon="leaf-outline"
                      />
                      <MacroCard
                        label="Yağ"
                        value={log.fat}
                        color={Colors.fat}
                        icon="water-outline"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Delete All ── */}
          <TouchableOpacity style={styles.deleteAllBtn} onPress={onRemoveAll}>
            <Ionicons name="trash-outline" size={16} color="#E74C3C" />
            <Text style={styles.deleteAllText}>Bu öğünü günlükten kaldır</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: `${color}22` }]}>
      <Text style={[pillStyles.label, { color }]}>{label}</Text>
      <Text style={[pillStyles.value, { color }]}>{value}g</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: BorderRadius.full },
  label: { fontSize: 11, fontWeight: '700' },
  value: { fontSize: 11, fontWeight: '600' },
});

function MacroCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <View style={[cardStyles.card, { borderColor: `${color}30`, backgroundColor: `${color}0D` }]}>
      <View style={[cardStyles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[cardStyles.value, { color }]}>{Math.round(value * 10) / 10}g</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FontSize.lg, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Hero
  heroContainer: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  heroGradientLayer1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroGradientLayer2: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroGradientLayer3: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  heroMealText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
  heroTime: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },

  // Summary
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLeft: {},
  summaryCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500', marginBottom: 2 },
  summaryCalories: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary },
  summaryMacros: { flexDirection: 'row', gap: 6 },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, fontWeight: '500' },

  // Food list
  foodList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },

  foodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  foodCardExpanded: {
    borderColor: `${Colors.primary}40`,
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  foodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  foodIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  foodIndex: { fontSize: FontSize.sm, fontWeight: '800' },
  foodCardInfo: { flex: 1 },
  foodCardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  foodCardGrams: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  foodCardRight: { alignItems: 'flex-end', gap: 2, marginLeft: Spacing.sm },
  foodCardCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },

  macroGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: 0,
  },

  // Delete
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteAllText: { fontSize: FontSize.sm, color: '#E74C3C', fontWeight: '600' },
});
