import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, MEAL_TYPES, MealType } from '../../lib/constants';
import { Food } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { recognizeFoodFromImage } from '../../lib/gemini';

export default function FoodLogScreen() {
  const { user } = useAuthStore();
  const { foodLogs, fetchDayLogs, addFoodLog, removeFoodLog, selectedDate } = useNutritionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [showSearch, setShowSearch] = useState(false);
  const [servingAmount, setServingAmount] = useState('100');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [searching, setSearching] = useState(false);

  // Fotoğraf tanıma state
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedFood, setRecognizedFood] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    if (user) fetchDayLogs(user.id, selectedDate);
  }, [user, selectedDate]);

  async function searchFoods(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('foods')
      .select('*')
      .or(`name.ilike.%${query}%,name_tr.ilike.%${query}%`)
      .limit(20);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  async function handleAddFood() {
    if (!selectedFood || !user) return;
    const amount = parseFloat(servingAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir porsiyon miktarı girin');
      return;
    }

    const ratio = amount / 100;
    await addFoodLog({
      user_id: user.id,
      food_id: selectedFood.id,
      meal_type: selectedMeal,
      serving_amount: amount,
      calories: Math.round(selectedFood.calories_per_100g * ratio),
      protein: Math.round(selectedFood.protein * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbs * ratio * 10) / 10,
      fat: Math.round(selectedFood.fat * ratio * 10) / 10,
      logged_at: new Date().toISOString(),
    });

    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }

  async function handleAddRecognizedFood() {
    if (!recognizedFood || !user) return;
    const amount = parseFloat(servingAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir porsiyon miktarı girin');
      return;
    }

    // Önce yemeği foods tablosuna ekle
    const { data: newFood, error } = await supabase
      .from('foods')
      .insert({
        name: recognizedFood.name,
        name_tr: recognizedFood.name,
        category: 'AI Tanıma',
        calories_per_100g: recognizedFood.calories,
        protein: recognizedFood.protein,
        carbs: recognizedFood.carbs,
        fat: recognizedFood.fat,
        fiber: 0,
        serving_size: 100,
        serving_unit: 'g',
        is_turkish: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !newFood) {
      Alert.alert('Hata', 'Yemek kaydedilemedi');
      return;
    }

    const ratio = amount / 100;
    await addFoodLog({
      user_id: user.id,
      food_id: newFood.id,
      meal_type: selectedMeal,
      serving_amount: amount,
      calories: Math.round(recognizedFood.calories * ratio),
      protein: Math.round(recognizedFood.protein * ratio * 10) / 10,
      carbs: Math.round(recognizedFood.carbs * ratio * 10) / 10,
      fat: Math.round(recognizedFood.fat * ratio * 10) / 10,
      logged_at: new Date().toISOString(),
    });

    setRecognizedFood(null);
    setServingAmount('100');
    setShowSearch(false);
  }

  async function openImagePicker(source: 'camera' | 'gallery') {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermeniz gerekiyor.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
    }

    if (result.canceled || !result.assets[0].base64) return;

    setRecognizing(true);
    setRecognizedFood(null);
    setSelectedFood(null);

    try {
      const food = await recognizeFoodFromImage(result.assets[0].base64);
      setRecognizedFood(food);
      setServingAmount('100');
    } catch {
      Alert.alert('Tanıma Başarısız', 'Yemek tanınamadı. Lütfen daha net bir fotoğraf çekin.');
    } finally {
      setRecognizing(false);
    }
  }

  const getMealLogs = (meal: MealType) =>
    foodLogs.filter((l) => l.meal_type === meal);

  const getMealCalories = (meal: MealType) =>
    getMealLogs(meal).reduce((sum, l) => sum + l.calories, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Başlık */}
      <View style={styles.header}>
        <Text style={styles.title}>Yemek Günlüğü</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.addButtonText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Öğün Seçici */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mealTabs}
          contentContainerStyle={styles.mealTabsContent}
        >
          {(Object.keys(MEAL_TYPES) as MealType[]).map((meal) => (
            <TouchableOpacity
              key={meal}
              style={[styles.mealTab, selectedMeal === meal && styles.mealTabActive]}
              onPress={() => setSelectedMeal(meal)}
            >
              <Text style={[styles.mealTabText, selectedMeal === meal && styles.mealTabTextActive]}>
                {MEAL_TYPES[meal]}
              </Text>
              <Text style={[styles.mealTabCalories, selectedMeal === meal && styles.mealTabCaloriesActive]}>
                {Math.round(getMealCalories(meal))} kcal
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Seçili Öğünün Yemekleri */}
        <View style={styles.foodList}>
          {getMealLogs(selectedMeal).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>{MEAL_TYPES[selectedMeal]} için henüz yemek eklenmedi</Text>
              <Text style={styles.emptySubtitle}>Yemek eklemek için + Ekle butonuna bas</Text>
            </View>
          ) : (
            getMealLogs(selectedMeal).map((log) => (
              <Card key={log.id} style={styles.foodItem}>
                <View style={styles.foodItemHeader}>
                  <Text style={styles.foodName}>{log.food?.name_tr ?? log.food?.name}</Text>
                  <TouchableOpacity onPress={() => removeFoodLog(log.id)}>
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.foodServing}>{log.serving_amount}g</Text>
                <View style={styles.foodMacros}>
                  <Text style={styles.foodCalories}>{Math.round(log.calories)} kcal</Text>
                  <Text style={styles.foodMacro}>P: {log.protein}g</Text>
                  <Text style={styles.foodMacro}>K: {log.carbs}g</Text>
                  <Text style={styles.foodMacro}>Y: {log.fat}g</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Yemek Arama Modal */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yemek Ara</Text>
            <TouchableOpacity onPress={() => {
            setShowSearch(false);
            setSelectedFood(null);
            setSearchQuery('');
            setRecognizedFood(null);
            setSearchResults([]);
          }}>
              <Text style={styles.modalClose}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Öğün Seçimi */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.modalMealTabs}
            contentContainerStyle={styles.mealTabsContent}
          >
            {(Object.keys(MEAL_TYPES) as MealType[]).map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[styles.mealTab, selectedMeal === meal && styles.mealTabActive]}
                onPress={() => setSelectedMeal(meal)}
              >
                <Text style={[styles.mealTabText, selectedMeal === meal && styles.mealTabTextActive]}>
                  {MEAL_TYPES[meal]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Fotoğrafla Tara Butonları */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => openImagePicker('camera')}
              disabled={recognizing}
            >
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Kamerayla Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => openImagePicker('gallery')}
              disabled={recognizing}
            >
              <Text style={styles.photoButtonIcon}>🖼️</Text>
              <Text style={styles.photoButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>

          {/* Tanıma Yükleniyor */}
          {recognizing && (
            <View style={styles.recognizingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.recognizingText}>Yemek tanınıyor...</Text>
            </View>
          )}

          {/* AI Tanıma Sonucu */}
          {recognizedFood && !recognizing && (
            <Card style={styles.recognizedCard}>
              <View style={styles.recognizedHeader}>
                <Text style={styles.recognizedLabel}>AI Tanıma Sonucu</Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: recognizedFood.confidence >= 0.7 ? Colors.primary : Colors.accent }
                ]}>
                  <Text style={styles.confidenceText}>
                    %{Math.round(recognizedFood.confidence * 100)}
                  </Text>
                </View>
              </View>
              <Text style={styles.selectedFoodName}>{recognizedFood.name}</Text>
              <Text style={styles.selectedFoodCalories}>
                {recognizedFood.calories} kcal / 100g
              </Text>
              <View style={styles.macroRow}>
                <Text style={styles.macroItem}>P: {recognizedFood.protein}g</Text>
                <Text style={styles.macroItem}>K: {recognizedFood.carbs}g</Text>
                <Text style={styles.macroItem}>Y: {recognizedFood.fat}g</Text>
              </View>
              <View style={styles.servingRow}>
                <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                <TextInput
                  style={styles.servingInput}
                  value={servingAmount}
                  onChangeText={setServingAmount}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <Text style={styles.calculatedCalories}>
                = {Math.round(recognizedFood.calories * (parseFloat(servingAmount) || 0) / 100)} kcal
              </Text>
              <View style={styles.recognizedActions}>
                <Button
                  title="Ekle"
                  onPress={handleAddRecognizedFood}
                  style={styles.addFoodButton}
                />
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setRecognizedFood(null)}
                >
                  <Text style={styles.retryText}>Yeniden Dene</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Ayırıcı */}
          {!recognizedFood && !recognizing && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya ara</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Arama Kutusu */}
          {!recognizedFood && !recognizing && (
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Yemek adı ara... (örn: tavuk, pilav)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchFoods(text);
              }}
              placeholderTextColor={Colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          )}

          {/* Seçili Yemek Detayı */}
          {selectedFood && !recognizedFood && (
            <Card style={styles.selectedFoodCard}>
              <Text style={styles.selectedFoodName}>{selectedFood.name_tr}</Text>
              <Text style={styles.selectedFoodCalories}>
                {selectedFood.calories_per_100g} kcal / 100g
              </Text>
              <View style={styles.servingRow}>
                <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                <TextInput
                  style={styles.servingInput}
                  value={servingAmount}
                  onChangeText={setServingAmount}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <Text style={styles.calculatedCalories}>
                = {Math.round(selectedFood.calories_per_100g * (parseFloat(servingAmount) || 0) / 100)} kcal
              </Text>
              <Button title="Ekle" onPress={handleAddFood} style={styles.addFoodButton} />
            </Card>
          )}

          {/* Arama Sonuçları */}
          <FlatList
            data={recognizedFood || recognizing ? [] : searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.searchResult, selectedFood?.id === item.id && styles.searchResultSelected]}
                onPress={() => setSelectedFood(item)}
              >
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{item.name_tr}</Text>
                  <Text style={styles.searchResultCategory}>{item.category}</Text>
                </View>
                <Text style={styles.searchResultCalories}>{item.calories_per_100g} kcal/100g</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searchQuery.length >= 2 && !searching ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>"{searchQuery}" için sonuç bulunamadı</Text>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addButtonText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.sm },
  mealTabs: { marginBottom: Spacing.md },
  mealTabsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  mealTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 80,
  },
  mealTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealTabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  mealTabTextActive: { color: Colors.textLight },
  mealTabCalories: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  mealTabCaloriesActive: { color: Colors.primaryPale },
  foodList: { paddingHorizontal: Spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  foodItem: { marginBottom: Spacing.sm },
  foodItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  foodName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  deleteIcon: { fontSize: FontSize.sm, color: Colors.textMuted, padding: 4 },
  foodServing: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  foodMacros: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  foodCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.accent },
  foodMacro: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  modalMealTabs: { paddingVertical: Spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchIcon: { fontSize: 18, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: Spacing.sm + 2 },
  clearSearch: { fontSize: FontSize.sm, color: Colors.textMuted, padding: Spacing.sm },
  selectedFoodCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  selectedFoodName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  selectedFoodCalories: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
  servingLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  servingInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    width: 80,
    textAlign: 'center',
  },
  calculatedCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.accent, marginBottom: Spacing.sm },
  addFoodButton: {},
  searchResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchResultSelected: { backgroundColor: Colors.primaryPale },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  searchResultCategory: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  searchResultCalories: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent },
  noResults: { alignItems: 'center', padding: Spacing.xl },
  noResultsText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Fotoğraf tanıma
  photoSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryPale,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  photoButtonIcon: { fontSize: 18 },
  photoButtonText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  recognizingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  recognizingText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '500' },
  recognizedCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  recognizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  recognizedLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  confidenceText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight },
  macroRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  macroItem: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  recognizedActions: { gap: Spacing.sm },
  retryButton: { alignItems: 'center', paddingVertical: Spacing.sm },
  retryText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dividerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
});
