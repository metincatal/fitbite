import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, MEAL_TYPES, MealType } from '../../lib/constants';
import { Food } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MACRO_COLORS = {
  protein: Colors.protein,
  carbs: Colors.carbs,
  fat: Colors.fat,
};

const MEAL_OPTIONS: { key: MealType; label: string; icon: string; color: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: 'sunny-outline', color: '#F59E0B' },
  { key: 'lunch', label: 'Öğle', icon: 'partly-sunny-outline', color: '#10B981' },
  { key: 'dinner', label: 'Akşam', icon: 'moon-outline', color: '#6366F1' },
  { key: 'snack', label: 'Atıştırmalık', icon: 'cafe-outline', color: '#F97316' },
];

const QUICK_AMOUNTS = [50, 100, 150, 200, 300];

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addFoodLog, selectedDate } = useNutritionStore();

  const [food, setFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [servingAmount, setServingAmount] = useState('100');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [showMealModal, setShowMealModal] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchFood(); }, [id]);

  async function fetchFood() {
    setLoading(true);
    const { data } = await supabase.from('foods').select('*').eq('id', id).single();
    setFood(data);
    setLoading(false);
  }

  async function handleAddToLog() {
    if (!food || !user) return;
    const amount = parseFloat(servingAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir porsiyon miktarı girin');
      return;
    }
    setAdding(true);
    const ratio = amount / 100;
    await addFoodLog({
      user_id: user.id,
      food_id: food.id,
      meal_type: selectedMeal,
      serving_amount: amount,
      calories: Math.round(food.calories_per_100g * ratio),
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      logged_at: new Date().toISOString(),
    });
    setAdding(false);
    setShowMealModal(false);
    Alert.alert('Eklendi', `${food.name_tr} ${MEAL_TYPES[selectedMeal]} öğününe eklendi.`, [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  }

  const amount = parseFloat(servingAmount) || 0;
  const ratio = amount / 100;
  const calcCalories = Math.round((food?.calories_per_100g ?? 0) * ratio);
  const calcProtein = Math.round((food?.protein ?? 0) * ratio * 10) / 10;
  const calcCarbs = Math.round((food?.carbs ?? 0) * ratio * 10) / 10;
  const calcFat = Math.round((food?.fat ?? 0) * ratio * 10) / 10;
  const calcFiber = food?.fiber ? Math.round(food.fiber * ratio * 10) / 10 : null;

  // Macro percent bars (relative to each other)
  const totalMacroG = (food?.protein ?? 0) + (food?.carbs ?? 0) + (food?.fat ?? 0);
  const proteinPct = totalMacroG > 0 ? food!.protein / totalMacroG : 0;
  const carbsPct = totalMacroG > 0 ? food!.carbs / totalMacroG : 0;
  const fatPct = totalMacroG > 0 ? food!.fat / totalMacroG : 0;

  const currentMealOption = MEAL_OPTIONS.find((m) => m.key === selectedMeal)!;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!food) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAbsolute}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>Yemek bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Hero Header ── */}
        <View style={styles.heroHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <View style={styles.heroCategoryBadge}>
            <Text style={styles.heroCategoryText}>{food.category}</Text>
          </View>
          <Text style={styles.heroFoodName}>{food.name_tr}</Text>
          {food.name !== food.name_tr && (
            <Text style={styles.heroFoodNameEn}>{food.name}</Text>
          )}
          <View style={styles.heroServingRow}>
            <Ionicons name="scale-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroServingText}>
              {food.serving_size} {food.serving_unit} · {food.calories_per_100g} kcal/100g
            </Text>
          </View>
        </View>

        {/* ── Macro Overview Card ── */}
        <View style={styles.macroCard}>
          <View style={styles.macroCardTop}>
            <View style={styles.caloriePill}>
              <Text style={styles.calorieValue}>{food.calories_per_100g}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
            <Text style={styles.per100Label}>100g başına</Text>
          </View>

          {/* Macro Bars */}
          <View style={styles.macroBars}>
            <MacroBar label="Protein" value={food.protein} pct={proteinPct} color={MACRO_COLORS.protein} unit="g" />
            <MacroBar label="Karbonhidrat" value={food.carbs} pct={carbsPct} color={MACRO_COLORS.carbs} unit="g" />
            <MacroBar label="Yağ" value={food.fat} pct={fatPct} color={MACRO_COLORS.fat} unit="g" />
            {food.fiber != null && food.fiber > 0 && (
              <MacroBar label="Lif" value={food.fiber} pct={food.fiber / (totalMacroG || 1)} color={Colors.fiber ?? '#6B7280'} unit="g" />
            )}
          </View>
        </View>

        {/* ── Serving Calculator ── */}
        <View style={styles.calculatorCard}>
          <Text style={styles.sectionLabel}>Porsiyon Hesaplayıcı</Text>

          {/* Stepper */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setServingAmount(String(Math.max(5, (parseFloat(servingAmount) || 100) - 10)))}
            >
              <Ionicons name="remove" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.stepperCenter}>
              <TextInput
                style={styles.stepperInput}
                value={servingAmount}
                onChangeText={setServingAmount}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.stepperUnit}>gram</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setServingAmount(String((parseFloat(servingAmount) || 100) + 10))}
            >
              <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick amounts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAmountsScroll}>
            {QUICK_AMOUNTS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.quickAmountChip, servingAmount === String(g) && styles.quickAmountChipActive]}
                onPress={() => setServingAmount(String(g))}
              >
                <Text style={[styles.quickAmountText, servingAmount === String(g) && styles.quickAmountTextActive]}>
                  {g}g
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Calculated result */}
          <View style={styles.calcResultCard}>
            <View style={styles.calcCalorieRow}>
              <Text style={styles.calcCalorieValue}>{calcCalories}</Text>
              <Text style={styles.calcCalorieUnit}>kcal</Text>
              <Text style={styles.calcAmountLabel}>· {amount}g için</Text>
            </View>
            <View style={styles.calcMacroRow}>
              <CalcMacroChip label="Protein" value={calcProtein} color={MACRO_COLORS.protein} />
              <CalcMacroChip label="Karb" value={calcCarbs} color={MACRO_COLORS.carbs} />
              <CalcMacroChip label="Yağ" value={calcFat} color={MACRO_COLORS.fat} />
              {calcFiber != null && (
                <CalcMacroChip label="Lif" value={calcFiber} color={Colors.fiber ?? '#6B7280'} />
              )}
            </View>
          </View>
        </View>

        {/* ── Meal Picker ── */}
        <View style={styles.mealPickerCard}>
          <Text style={styles.sectionLabel}>Öğün Seçimi</Text>
          <View style={styles.mealGrid}>
            {MEAL_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.mealTile, selectedMeal === m.key && { borderColor: m.color, backgroundColor: `${m.color}12` }]}
                onPress={() => setSelectedMeal(m.key)}
              >
                <View style={[styles.mealTileIcon, { backgroundColor: selectedMeal === m.key ? m.color : Colors.surfaceSecondary }]}>
                  <Ionicons name={m.icon as any} size={18} color={selectedMeal === m.key ? '#fff' : Colors.textSecondary} />
                </View>
                <Text style={[styles.mealTileLabel, selectedMeal === m.key && { color: m.color, fontWeight: '700' }]}>
                  {m.label}
                </Text>
                {selectedMeal === m.key && (
                  <Ionicons name="checkmark-circle" size={14} color={m.color} style={{ position: 'absolute', top: 6, right: 6 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Fixed Bottom Add Button ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarSummary}>
          <Text style={styles.bottomBarCalories}>{calcCalories} kcal</Text>
          <Text style={styles.bottomBarDetail}>{amount}g · {MEAL_TYPES[selectedMeal]}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, adding && { opacity: 0.6 }]}
          onPress={handleAddToLog}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Günlüğe Ekle</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MacroBar({ label, value, pct, color, unit }: {
  label: string; value: number; pct: number; color: string; unit: string;
}) {
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.barTrack}>
        <View style={[barStyles.barFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[barStyles.value, { color }]}>{value}{unit}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  label: { width: 100, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  value: { width: 40, fontSize: FontSize.sm, fontWeight: '700', textAlign: 'right' },
});

function CalcMacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: `${color}15` }]}>
      <Text style={[chipStyles.value, { color }]}>{value}g</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  value: { fontSize: FontSize.md, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, marginTop: 2, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  backBtnAbsolute: { position: 'absolute', top: 16, left: 16, zIndex: 10 },

  // Hero
  heroHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    position: 'relative',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  heroCategoryText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: 0.5 },
  heroFoodName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroFoodNameEn: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  heroServingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  heroServingText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },

  // Macro Overview Card
  macroCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  macroCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  caloriePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  calorieValue: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  calorieUnit: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  per100Label: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  macroBars: {},

  // Calculator Card
  calculatorCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.md },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: { alignItems: 'center' },
  stepperInput: {
    width: 90,
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
  },
  stepperUnit: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500', marginTop: 4 },

  quickAmountsScroll: { marginBottom: Spacing.md },
  quickAmountChip: {
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  quickAmountChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickAmountText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  quickAmountTextActive: { color: '#fff' },

  calcResultCard: {
    backgroundColor: `${Colors.primary}08`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  calcCalorieRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: Spacing.sm },
  calcCalorieValue: { fontSize: 36, fontWeight: '900', color: Colors.primary },
  calcCalorieUnit: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  calcAmountLabel: { fontSize: FontSize.sm, color: Colors.textMuted, marginLeft: 4 },
  calcMacroRow: { flexDirection: 'row', gap: Spacing.sm },

  // Meal Picker
  mealPickerCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  mealTile: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  mealTileIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTileLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', flex: 1 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarSummary: { flex: 1 },
  bottomBarCalories: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  bottomBarDetail: { fontSize: FontSize.sm, color: Colors.textMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  addBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
});
