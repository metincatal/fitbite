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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, MEAL_TYPES, MealType } from '../../lib/constants';
import { Food } from '../../types';
import { Card } from '../../components/ui/Card';

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

  useEffect(() => {
    fetchFood();
  }, [id]);

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
    Alert.alert('Eklendi ✓', `${food.name_tr} ${MEAL_TYPES[selectedMeal]} öğününe eklendi.`, [
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>Yemek bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{food.name_tr}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Başlık Kartı */}
        <Card style={styles.titleCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{food.category}</Text>
          </View>
          <Text style={styles.foodName}>{food.name_tr}</Text>
          {food.name !== food.name_tr && (
            <Text style={styles.foodNameEn}>{food.name}</Text>
          )}
          <Text style={styles.servingInfo}>
            {food.serving_size} {food.serving_unit} · {food.calories_per_100g} kcal/100g
          </Text>
        </Card>

        {/* Besin Değerleri (100g) */}
        <Card style={styles.nutriCard}>
          <Text style={styles.sectionTitle}>Besin Değerleri (100g)</Text>
          <View style={styles.nutriTable}>
            <NutriRow label="Kalori" value={`${food.calories_per_100g} kcal`} highlight />
            <NutriRow label="Protein" value={`${food.protein} g`} color={Colors.protein} />
            <NutriRow label="Karbonhidrat" value={`${food.carbs} g`} color={Colors.carbs} />
            <NutriRow label="Yağ" value={`${food.fat} g`} color={Colors.fat} />
            {food.fiber != null && food.fiber > 0 && (
              <NutriRow label="Lif" value={`${food.fiber} g`} color={Colors.fiber} />
            )}
          </View>
        </Card>

        {/* Porsiyon Hesaplayıcı */}
        <Card style={styles.calculatorCard}>
          <Text style={styles.sectionTitle}>Porsiyon Hesaplayıcı</Text>
          <View style={styles.servingRow}>
            <TouchableOpacity
              style={styles.servingAdjust}
              onPress={() => {
                const v = Math.max(10, (parseFloat(servingAmount) || 100) - 10);
                setServingAmount(String(v));
              }}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.servingInputWrapper}>
              <TextInput
                style={styles.servingInput}
                value={servingAmount}
                onChangeText={setServingAmount}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.servingUnit}>g</Text>
            </View>
            <TouchableOpacity
              style={styles.servingAdjust}
              onPress={() => {
                const v = (parseFloat(servingAmount) || 100) + 10;
                setServingAmount(String(v));
              }}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Hızlı porsiyon butonları */}
          <View style={styles.quickServing}>
            {[50, 100, 150, 200].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.quickServingBtn, servingAmount === String(g) && styles.quickServingBtnActive]}
                onPress={() => setServingAmount(String(g))}
              >
                <Text style={[styles.quickServingText, servingAmount === String(g) && styles.quickServingTextActive]}>
                  {g}g
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hesaplanan değerler */}
          <View style={styles.calcResult}>
            <View style={styles.calcMain}>
              <Text style={styles.calcCalories}>{calcCalories}</Text>
              <Text style={styles.calcUnit}>kcal</Text>
            </View>
            <View style={styles.calcMacros}>
              <View style={styles.calcMacroItem}>
                <Text style={[styles.calcMacroValue, { color: Colors.protein }]}>{calcProtein}g</Text>
                <Text style={styles.calcMacroLabel}>Protein</Text>
              </View>
              <View style={styles.calcMacroItem}>
                <Text style={[styles.calcMacroValue, { color: Colors.carbs }]}>{calcCarbs}g</Text>
                <Text style={styles.calcMacroLabel}>Karb</Text>
              </View>
              <View style={styles.calcMacroItem}>
                <Text style={[styles.calcMacroValue, { color: Colors.fat }]}>{calcFat}g</Text>
                <Text style={styles.calcMacroLabel}>Yağ</Text>
              </View>
              {calcFiber != null && (
                <View style={styles.calcMacroItem}>
                  <Text style={[styles.calcMacroValue, { color: Colors.fiber }]}>{calcFiber}g</Text>
                  <Text style={styles.calcMacroLabel}>Lif</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Günlüğe Ekle */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowMealModal(true)}>
          <Ionicons name="add-circle" size={20} color={Colors.textLight} />
          <Text style={styles.addButtonText}>Günlüğe Ekle</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Öğün Seçim Modal */}
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hangi Öğüne?</Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {calcCalories} kcal · {servingAmount}g {food.name_tr}
            </Text>
            {(Object.keys(MEAL_TYPES) as MealType[]).map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[styles.mealOption, selectedMeal === meal && styles.mealOptionActive]}
                onPress={() => setSelectedMeal(meal)}
              >
                <Text style={[styles.mealOptionText, selectedMeal === meal && styles.mealOptionTextActive]}>
                  {MEAL_TYPES[meal]}
                </Text>
                {selectedMeal === meal && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.confirmBtn, adding && styles.confirmBtnDisabled]}
              onPress={handleAddToLog}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color={Colors.textLight} />
              ) : (
                <Text style={styles.confirmBtnText}>Ekle</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NutriRow({ label, value, highlight, color }: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <View style={nutriStyles.row}>
      <Text style={[nutriStyles.label, highlight && nutriStyles.labelHighlight]}>{label}</Text>
      <Text style={[nutriStyles.value, highlight && nutriStyles.valueHighlight, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

const nutriStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { fontSize: FontSize.md, color: Colors.textSecondary },
  labelHighlight: { fontWeight: '700', color: Colors.textPrimary },
  value: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  valueHighlight: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: FontSize.lg, color: Colors.textMuted },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  titleCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryPale,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, marginBottom: Spacing.xs,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  foodName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  foodNameEn: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  servingInfo: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  nutriCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  nutriTable: {},
  calculatorCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  servingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  servingAdjust: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  servingInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  servingInput: {
    width: 80, borderWidth: 2, borderColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.xl,
    fontWeight: '800', color: Colors.textPrimary, textAlign: 'center',
  },
  servingUnit: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  quickServing: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.md },
  quickServingBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border,
  },
  quickServingBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickServingText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  quickServingTextActive: { color: Colors.textLight },
  calcResult: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
  },
  calcMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: Spacing.sm },
  calcCalories: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.primary },
  calcUnit: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  calcMacros: { flexDirection: 'row', gap: Spacing.lg },
  calcMacroItem: { alignItems: 'center' },
  calcMacroValue: { fontSize: FontSize.md, fontWeight: '700' },
  calcMacroLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
  },
  addButtonText: { color: Colors.textLight, fontWeight: '800', fontSize: FontSize.lg },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  mealOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  mealOptionActive: {},
  mealOptionText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '500' },
  mealOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.md,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
});
