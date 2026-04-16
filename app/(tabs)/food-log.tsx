import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, getMealTypes, MealType, MEAL_TYPES } from '../../lib/constants';
import { Food, FoodLogWithFood } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { recognizeMealFromImage, DetectedFoodItem, generateMealName } from '../../lib/gemini';
import { lookupBarcode, BarcodeFoodResult } from '../../lib/openfoodfacts';
import { uploadFoodPhoto } from '../../lib/storage';
import { PhotoMealReviewModal } from '../../components/food/PhotoMealReviewModal';
import { MealPhotoDetailModal } from '../../components/food/MealPhotoDetailModal';
import { LinearGradient } from 'expo-linear-gradient';
import { setQuickActionCallbacks } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Arka planda kayıt süreci için tip
interface PendingSave {
  imageBase64: string;
  items: DetectedFoodItem[];
  mealType: MealType;
  progress: number;      // 0-100
  statusText: string;
  imageUrl?: string;     // upload sonrası doldurulur
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#F9B8A3',
  lunch: '#B7E4C7',
  dinner: '#8ECAE6',
  snack: '#FFD6A5',
};

const MEAL_TEXT_COLORS: Record<string, string> = {
  breakfast: '#C05C3A',
  lunch: '#2D6A4F',
  dinner: '#1A5276',
  snack: '#B7791F',
};

export default function FoodLogScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { foodLogs, fetchDayLogs, addFoodLog, removeFoodLog, selectedDate } = useNutritionStore();

  const [yesterdayLogs, setYesterdayLogs] = useState<FoodLogWithFood[]>([]);
  // Espritüel öğün isimleri: image_url → isim
  const [mealNames, setMealNames] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<string>('breakfast');
  const [showSearch, setShowSearch] = useState(false);
  const [servingAmount, setServingAmount] = useState('100');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [searching, setSearching] = useState(false);

  const [recognizing, setRecognizing] = useState(false);
  const [photoMealItems, setPhotoMealItems] = useState<DetectedFoodItem[]>([]);
  const [showPhotoReview, setShowPhotoReview] = useState(false);

  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [showHintPrompt, setShowHintPrompt] = useState(false);
  const [photoHintText, setPhotoHintText] = useState('');
  const [photoDetailGroup, setPhotoDetailGroup] = useState<FoodLogWithFood[]>([]);

  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeFoodResult | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Arka planda kayıt süreci
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);

  // AsyncStorage'dan espritüel isimleri yükle
  useEffect(() => {
    AsyncStorage.getItem('fitbite_meal_names').then((raw) => {
      if (raw) {
        try { setMealNames(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // mealNames değişince AsyncStorage'a kaydet
  useEffect(() => {
    if (Object.keys(mealNames).length > 0) {
      AsyncStorage.setItem('fitbite_meal_names', JSON.stringify(mealNames)).catch(() => {});
    }
  }, [mealNames]);

  useEffect(() => {
    if (user) {
      fetchDayLogs(user.id, selectedDate);
      fetchYesterdayLogs(user.id);
    }
  }, [user, selectedDate]);

  async function fetchYesterdayLogs(userId: string) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    const { data } = await supabase
      .from('food_logs')
      .select('*, food:foods(*)')
      .eq('user_id', userId)
      .gte('logged_at', `${yesterday}T00:00:00`)
      .lte('logged_at', `${yesterday}T23:59:59`)
      .order('logged_at', { ascending: true });
    setYesterdayLogs((data as FoodLogWithFood[]) ?? []);
  }

  useEffect(() => {
    // FAB'dan gelen kamera/galeri aksiyonlarını dinle
    setQuickActionCallbacks(
      (base64) => {
        router.push('/(tabs)/food-log');
        setPendingBase64(base64);
        setPhotoHintText('');
        setShowHintPrompt(true);
      },
      (base64) => {
        router.push('/(tabs)/food-log');
        setPendingBase64(base64);
        setPhotoHintText('');
        setShowHintPrompt(true);
      }
    );
    return () => setQuickActionCallbacks(() => {}, () => {});
  }, [router]);

  async function searchFoods(query: string) {
    if (query.length < 2) { setSearchResults([]); return; }
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
    if (isNaN(amount) || amount <= 0) { Alert.alert('Hata', 'Geçerli bir porsiyon miktarı girin'); return; }
    const ratio = amount / 100;
    await addFoodLog({
      user_id: user.id,
      food_id: selectedFood.id,
      meal_type: selectedMeal as MealType,
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

  function handleSavePhotoMeal(items: DetectedFoodItem[], mealType: MealType) {
    if (!user) return;

    const base64 = capturedImageBase64;

    // Modal'ı hemen kapat
    setShowPhotoReview(false);
    setPhotoMealItems([]);

    if (!base64) return;

    // Pending save state'ini oluştur
    const pending: PendingSave = {
      imageBase64: base64,
      items,
      mealType,
      progress: 0,
      statusText: 'Fotoğraf yükleniyor...',
    };
    setPendingSave(pending);
    pendingSaveRef.current = pending;
    setCapturedImageBase64(null);

    // Arka planda kayıt sürecini başlat
    runBackgroundSave(user.id, base64, items, mealType);
  }

  async function runBackgroundSave(
    userId: string,
    base64: string,
    items: DetectedFoodItem[],
    mealType: MealType
  ) {
    const totalSteps = items.length + 2; // upload + items + mealName
    let completedSteps = 0;

    function updateProgress(statusText: string) {
      completedSteps++;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      setPendingSave((prev) => prev ? { ...prev, progress, statusText } : null);
    }

    try {
      // Adım 1: Fotoğrafı yükle
      const imageUrl = await uploadFoodPhoto(userId, base64);
      // imageUrl'yi pendingSave'e kaydet (feed'de çift kartı önlemek için)
      setPendingSave((prev) => prev ? { ...prev, imageUrl: imageUrl ?? undefined } : null);
      updateProgress('Besinler kaydediliyor...');

      // Adım 2: Her item için food + log ekle
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const per100 = item.estimatedGrams > 0 ? 100 / item.estimatedGrams : 1;
        const { data: newFood, error } = await supabase
          .from('foods')
          .insert({
            name: item.name, name_tr: item.name, category: 'AI Tanıma',
            calories_per_100g: Math.round(item.calories * per100),
            protein: Math.round(item.protein * per100 * 10) / 10,
            carbs: Math.round(item.carbs * per100 * 10) / 10,
            fat: Math.round(item.fat * per100 * 10) / 10,
            fiber: 0, serving_size: 100, serving_unit: 'g', is_turkish: true, created_by: userId,
          })
          .select()
          .single();
        if (error || !newFood) {
          updateProgress(`${item.name} kaydediliyor...`);
          continue;
        }
        await addFoodLog({
          user_id: userId, food_id: newFood.id, meal_type: mealType,
          serving_amount: item.estimatedGrams,
          calories: Math.round(item.calories),
          protein: Math.round(item.protein * 10) / 10,
          carbs: Math.round(item.carbs * 10) / 10,
          fat: Math.round(item.fat * 10) / 10,
          image_url: imageUrl,
          logged_at: new Date().toISOString(),
        });
        updateProgress(i < items.length - 1 ? `${items[i + 1].name} kaydediliyor...` : 'İsim oluşturuluyor...');
      }

      // Adım 3: Espritüel isim üret
      if (imageUrl) {
        try {
          const name = await generateMealName(items.map((i) => i.name));
          setMealNames((prev) => ({ ...prev, [imageUrl!]: name }));
        } catch {}
      }

      // Tamamlandı
      setPendingSave((prev) => prev ? { ...prev, progress: 100, statusText: 'Tamamlandı!' } : null);

      // Kısa bekleme sonra pending'i kaldır
      setTimeout(() => {
        setPendingSave(null);
        pendingSaveRef.current = null;
      }, 600);
    } catch {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
      setPendingSave(null);
      pendingSaveRef.current = null;
    }
  }

  async function handleBarcodeScanned({ data }: { type: string; data: string }) {
    if (scanned || lookingUpBarcode) return;
    setScanned(true);
    setLookingUpBarcode(true);
    const food = await lookupBarcode(data);
    setLookingUpBarcode(false);
    if (!food || food.calories === 0) {
      Alert.alert('Ürün Bulunamadı', 'Bu barkod için besin değerleri bulunamadı.', [
        { text: 'Tamam', onPress: () => { setScanned(false); setScanningBarcode(false); } },
      ]);
      return;
    }
    setBarcodeResult(food);
    setScanningBarcode(false);
    setServingAmount('100');
  }

  async function handleAddBarcodeFood() {
    if (!barcodeResult || !user) return;
    const amount = parseFloat(servingAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Hata', 'Geçerli bir porsiyon miktarı girin'); return; }
    const fullName = barcodeResult.brand ? `${barcodeResult.brand} - ${barcodeResult.name}` : barcodeResult.name;
    const { data: newFood, error } = await supabase
      .from('foods')
      .insert({
        name: fullName, name_tr: barcodeResult.name, category: 'Paketli Ürün',
        calories_per_100g: barcodeResult.calories, protein: barcodeResult.protein,
        carbs: barcodeResult.carbs, fat: barcodeResult.fat, fiber: barcodeResult.fiber,
        serving_size: 100, serving_unit: 'g', is_turkish: false, created_by: user.id,
      })
      .select().single();
    if (error || !newFood) { Alert.alert('Hata', 'Yemek kaydedilemedi'); return; }
    const ratio = amount / 100;
    await addFoodLog({
      user_id: user.id, food_id: newFood.id, meal_type: selectedMeal as MealType, serving_amount: amount,
      calories: Math.round(barcodeResult.calories * ratio),
      protein: Math.round(barcodeResult.protein * ratio * 10) / 10,
      carbs: Math.round(barcodeResult.carbs * ratio * 10) / 10,
      fat: Math.round(barcodeResult.fat * ratio * 10) / 10,
      logged_at: new Date().toISOString(),
    });
    setBarcodeResult(null); setScanned(false); setServingAmount('100'); setShowSearch(false);
  }

  async function openBarcodeScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { Alert.alert('İzin Gerekli', 'Barkod okumak için kamera iznine ihtiyaç var.'); return; }
    }
    setScanned(false); setBarcodeResult(null); setScanningBarcode(true);
  }

  async function openImagePicker(source: 'camera' | 'gallery') {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor.'); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermeniz gerekiyor.'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    }
    if (result.canceled || !result.assets[0].base64) return;
    const base64Data = result.assets[0].base64;
    setPendingBase64(base64Data);
    setPhotoHintText('');
    setShowHintPrompt(true);
  }

  async function startAnalysis(hint: string) {
    if (!pendingBase64) return;
    setShowHintPrompt(false);
    setShowSearch(false);
    const base64Data = pendingBase64;
    setPendingBase64(null);
    setCapturedImageBase64(base64Data);
    setSelectedFood(null);
    setRecognizing(true);
    try {
      const items = await recognizeMealFromImage(base64Data, hint.trim() || undefined);
      setPhotoMealItems(items);
      setShowPhotoReview(true);
    } catch {
      setCapturedImageBase64(null);
      Alert.alert('Tanıma Başarısız', 'Yemek tanınamadı. Lütfen daha net bir fotoğraf çekin.');
    } finally {
      setRecognizing(false);
    }
  }

  const mealTypes = getMealTypes(profile?.meal_count ?? 3);
  const totalCaloriesToday = foodLogs.reduce((s, l) => s + l.calories, 0);
  const totalCaloriesYesterday = yesterdayLogs.reduce((s, l) => s + l.calories, 0);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  }

  const todayLabel = formatDate(selectedDate);
  const yesterdayDate = (() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const yesterdayLabel = formatDate(yesterdayDate);

  function getMealLabel(mealType: string) {
    return mealTypes.find((m) => m.key === mealType)?.label ?? MEAL_TYPES[mealType as MealType] ?? mealType;
  }

  function renderFeedItems(logs: FoodLogWithFood[], readonly = false) {
    const rendered: React.ReactNode[] = [];
    const seenUrls = new Set<string>();

    logs.forEach((log) => {
      if (log.image_url) {
        // Pending save sırasında aynı image_url'ye sahip logları atla (çift kart önleme)
        if (pendingSave && pendingSave.imageUrl && log.image_url === pendingSave.imageUrl) return;
        if (seenUrls.has(log.image_url)) return;
        seenUrls.add(log.image_url);
        const group = logs.filter((l) => l.image_url === log.image_url);
        const totalCal = group.reduce((s, l) => s + l.calories, 0);
        const mealName = mealNames[log.image_url];

        rendered.push(
          <TouchableOpacity
            key={`photo-${log.image_url}`}
            style={styles.photoCard}
            onPress={() => !readonly && setPhotoDetailGroup(group)}
            activeOpacity={0.92}
          >
            <Image source={{ uri: log.image_url }} style={styles.photoCardImage} resizeMode="cover" />

            {/* Üst overlay: öğün badge + kalori chip + silme */}
            <View style={styles.photoCardTopRow}>
              <View style={[styles.mealBadge, { backgroundColor: MEAL_COLORS[log.meal_type] ?? Colors.borderLight }]}>
                <Text style={[styles.mealBadgeText, { color: MEAL_TEXT_COLORS[log.meal_type] ?? Colors.textPrimary }]}>
                  {getMealLabel(log.meal_type)}
                </Text>
              </View>
              <View style={styles.photoCardTopRight}>
                <View style={styles.caloriePill}>
                  <Text style={styles.caloriePillText}>{Math.round(totalCal)} kcal</Text>
                </View>
                {!readonly && (
                  <TouchableOpacity
                    style={styles.photoDeleteBtn}
                    onPress={() => group.forEach((l) => removeFoodLog(l.id))}
                  >
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Espritüel isim — sol alt köşe, yarı şeffaf arka plan */}
            {mealName ? (
              <View style={styles.photoMealNameWrap}>
                <Text style={styles.photoMealName} numberOfLines={1}>{mealName}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      } else {
        const bg = MEAL_COLORS[log.meal_type] ?? Colors.borderLight;
        const tc = MEAL_TEXT_COLORS[log.meal_type] ?? Colors.textPrimary;
        rendered.push(
          <View key={log.id} style={[styles.textItem, readonly && styles.textItemReadonly]}>
            <View style={[styles.textItemAccent, { backgroundColor: bg }]} />
            <View style={styles.textItemBody}>
              <Text style={styles.textItemName} numberOfLines={1}>
                {log.food?.name_tr ?? log.food?.name}
              </Text>
              <View style={styles.textItemMeta}>
                <View style={[styles.mealPill, { backgroundColor: bg }]}>
                  <Text style={[styles.mealPillText, { color: tc }]}>{getMealLabel(log.meal_type)}</Text>
                </View>
                <Text style={styles.textItemServing}>{log.serving_amount}g</Text>
              </View>
            </View>
            <View style={styles.textItemRight}>
              <Text style={styles.textItemCalories}>{Math.round(log.calories)}</Text>
              <Text style={styles.textItemKcal}>kcal</Text>
            </View>
            {!readonly && (
              <View style={styles.textItemActions}>
                <TouchableOpacity onPress={() => router.push(`/food/${log.food_id}`)} style={styles.textActionBtn}>
                  <Ionicons name="information-circle-outline" size={19} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFoodLog(log.id)} style={styles.textActionBtn}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }
    });

    return rendered;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Yemek Günlüğü</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.headerCalories}>{Math.round(totalCaloriesToday)} kcal</Text>
          <Text style={styles.headerCaloriesLabel}>bugün</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bugün */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Bugün</Text>
            <Text style={styles.sectionDate}>{todayLabel}</Text>
          </View>
          <Text style={styles.sectionCalories}>{Math.round(totalCaloriesToday)} kcal</Text>
        </View>

        {foodLogs.length === 0 && !pendingSave ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant-outline" size={28} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>Henüz yemek eklenmedi</Text>
            <Text style={styles.emptySubtext}>Sağ alttaki + butonuna bas</Text>
          </View>
        ) : (
          <View style={styles.feedSection}>
            {renderFeedItems(foodLogs, false)}
            {pendingSave && <PendingPhotoCard pending={pendingSave} />}
          </View>
        )}

        {/* Dün */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.textMuted }]} />
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Dün</Text>
            <Text style={styles.sectionDate}>{yesterdayLabel}</Text>
          </View>
          {yesterdayLogs.length > 0 && (
            <Text style={[styles.sectionCalories, { color: Colors.textMuted }]}>
              {Math.round(totalCaloriesYesterday)} kcal
            </Text>
          )}
        </View>

        {yesterdayLogs.length === 0 ? (
          <View style={[styles.emptyState, { paddingVertical: Spacing.md }]}>
            <Text style={styles.emptySubtext}>Dün kayıt yok</Text>
          </View>
        ) : (
          <View style={[styles.feedSection, { opacity: 0.75 }]}>{renderFeedItems(yesterdayLogs, true)}</View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB + Analiz Sürüyor Banner — yan yana, ekranın altında */}
      <View style={styles.fabRow}>
        {recognizing && (
          <View style={styles.analyzingBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <View style={styles.analyzingTexts}>
              <Text style={styles.analyzingTitle}>Analiz Sürüyor</Text>
              <Text style={styles.analyzingSubtext}>AI yemeğinizi analiz ediyor, lütfen bekleyin...</Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.fab} onPress={() => setShowSearch(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <MealPhotoDetailModal
        visible={photoDetailGroup.length > 0}
        onClose={() => setPhotoDetailGroup([])}
        logs={photoDetailGroup}
        onRemoveAll={() => { photoDetailGroup.forEach((l) => removeFoodLog(l.id)); setPhotoDetailGroup([]); }}
        mealName={photoDetailGroup[0]?.image_url ? mealNames[photoDetailGroup[0].image_url] : undefined}
        onNameChange={(name) => {
          const url = photoDetailGroup[0]?.image_url;
          if (url) setMealNames((prev) => ({ ...prev, [url]: name }));
        }}
      />

      <PhotoMealReviewModal
        visible={showPhotoReview}
        onClose={() => { setShowPhotoReview(false); setCapturedImageBase64(null); setPhotoMealItems([]); }}
        items={photoMealItems}
        imageBase64={capturedImageBase64}
        onSave={handleSavePhotoMeal}
      />

      {/* Fotoğraf Hint Prompt Modal */}
      <Modal visible={showHintPrompt} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.hintModal}>
          <View style={styles.hintHeader}>
            <TouchableOpacity
              onPress={() => { setShowHintPrompt(false); setPendingBase64(null); }}
              style={styles.hintCloseBtn}
            >
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.hintHeaderTitle}>Fotoğrafı Analiz Et</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {pendingBase64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${pendingBase64}` }}
                style={styles.hintPreview}
                resizeMode="cover"
              />
            )}

            <View style={styles.hintBody}>
              <Text style={styles.hintLabel}>Bu yemeği açıkla (opsiyonel)</Text>
              <Text style={styles.hintSublabel}>
                AI'nın daha doğru tanıması için yemeğin ne olduğunu yazabilirsiniz.
              </Text>
              <TextInput
                style={styles.hintInput}
                placeholder="örn. kazandibi, 2 porsiyon..."
                placeholderTextColor={Colors.textMuted}
                value={photoHintText}
                onChangeText={setPhotoHintText}
                multiline
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.hintFooter}>
              <TouchableOpacity
                style={styles.hintSkipBtn}
                onPress={() => startAnalysis('')}
              >
                <Text style={styles.hintSkipText}>Atla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hintAnalyzeBtn}
                onPress={() => startAnalysis(photoHintText)}
              >
                <Ionicons name="sparkles-outline" size={16} color="#fff" />
                <Text style={styles.hintAnalyzeText}>Analiz Et</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Yemek Ekle Modal — Yeniden Tasarım */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowSearch(false); setSelectedFood(null); setSearchQuery('');
              setBarcodeResult(null); setScanned(false); setScanningBarcode(false); setSearchResults([]);
            }}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yemek Ekle</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Barkod tarayıcı */}
          {scanningBarcode && (
            <View style={StyleSheet.absoluteFillObject}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
              />
              <View style={styles.barcodeScanFrame}>
                <View style={styles.barcodeScanBox} />
                <Text style={styles.barcodeScanHint}>
                  {lookingUpBarcode ? 'Ürün aranıyor...' : 'Barkodu çerçeveye hizalayın'}
                </Text>
                {lookingUpBarcode && <ActivityIndicator size="large" color="#fff" style={{ marginTop: Spacing.md }} />}
              </View>
              <TouchableOpacity style={styles.barcodeClose} onPress={() => { setScanningBarcode(false); setScanned(false); }}>
                <Text style={styles.barcodeCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}

          {!scanningBarcode && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Arama kutusu — her zaman üstte */}
              {!recognizing && !barcodeResult && (
                <View style={styles.addSearchWrap}>
                  <View style={[styles.addSearchBox, searchQuery.length > 0 && styles.addSearchBoxActive]}>
                    <Ionicons name="search-outline" size={20} color={searchQuery.length > 0 ? Colors.primary : Colors.textMuted} />
                    <TextInput
                      style={styles.addSearchInput}
                      placeholder="Yemek adı yazın..."
                      value={searchQuery}
                      onChangeText={(t) => { setSearchQuery(t); searchFoods(t); }}
                      placeholderTextColor={Colors.textMuted}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                        <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* AI Kart Bölümü */}
              {!recognizing && !barcodeResult && !selectedFood && searchQuery.length === 0 && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiSectionLabel}>AI ile Analiz Et</Text>
                  <Text style={styles.aiSectionSub}>Yemeğin fotoğrafını çek, AI anında tanısın</Text>

                  <View style={styles.aiCardRow}>
                    <TouchableOpacity style={[styles.aiCard, { backgroundColor: '#EDF6FF', borderColor: '#BFDBFE' }]} onPress={() => openImagePicker('camera')}>
                      <View style={[styles.aiCardIconWrap, { backgroundColor: '#2563EB' }]}>
                        <Ionicons name="camera" size={28} color="#fff" />
                      </View>
                      <Text style={[styles.aiCardTitle, { color: '#1D4ED8' }]}>Fotoğraf Çek</Text>
                      <Text style={styles.aiCardSub}>Kamerayla anında analiz</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.aiCard, { backgroundColor: '#F5F0FF', borderColor: '#DDD6FE' }]} onPress={() => openImagePicker('gallery')}>
                      <View style={[styles.aiCardIconWrap, { backgroundColor: '#7C3AED' }]}>
                        <Ionicons name="images" size={28} color="#fff" />
                      </View>
                      <Text style={[styles.aiCardTitle, { color: '#6D28D9' }]}>Galeriden Seç</Text>
                      <Text style={styles.aiCardSub}>Daha önce çektiğin fotoğraf</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.barcodeCard} onPress={openBarcodeScanner}>
                    <View style={styles.barcodeCardLeft}>
                      <View style={[styles.barcodeCardIcon, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                        <Ionicons name="barcode" size={28} color="#EA580C" />
                      </View>
                      <View>
                        <Text style={styles.barcodeCardTitle}>Barkod Tara</Text>
                        <Text style={styles.barcodeCardSub}>Paketli ürünler için hızlı ekleme</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Analiz yükleniyor */}
              {recognizing && (
                <View style={styles.recognizingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.recognizingText}>Yemekler analiz ediliyor...</Text>
                  <Text style={styles.recognizingSubtext}>AI görselinizi inceliyor</Text>
                </View>
              )}

              {/* Barkod Sonucu */}
              {barcodeResult && !scanningBarcode && (
                <View style={styles.barcodeResultCard}>
                  <View style={styles.barcodeResultHeader}>
                    <Ionicons name="barcode-outline" size={20} color={Colors.primary} />
                    <Text style={styles.barcodeResultTitle}>Ürün Bulundu</Text>
                  </View>
                  {barcodeResult.brand && <Text style={styles.barcodeBrand}>{barcodeResult.brand}</Text>}
                  <Text style={styles.selectedFoodName}>{barcodeResult.name}</Text>
                  <Text style={styles.selectedFoodCalories}>{barcodeResult.calories} kcal / 100g</Text>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroItem}>P: {barcodeResult.protein}g</Text>
                    <Text style={styles.macroItem}>K: {barcodeResult.carbs}g</Text>
                    <Text style={styles.macroItem}>Y: {barcodeResult.fat}g</Text>
                  </View>
                  <View style={styles.servingRow}>
                    <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                    <TextInput
                      style={styles.servingInput} value={servingAmount}
                      onChangeText={setServingAmount} keyboardType="numeric" selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.calculatedCalories}>
                    = {Math.round(barcodeResult.calories * (parseFloat(servingAmount) || 0) / 100)} kcal
                  </Text>
                  <View style={styles.barcodeResultActions}>
                    <TouchableOpacity style={styles.barcodeRetryBtn} onPress={() => { setBarcodeResult(null); setScanned(false); }}>
                      <Text style={styles.barcodeRetryText}>Yeniden Tara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.barcodeAddBtn} onPress={handleAddBarcodeFood}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.barcodeAddText}>Günlüğe Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Arama sonuçları ve seçili yemek */}
              {!recognizing && !barcodeResult && (
                <View style={styles.searchSection}>
                  {/* Seçili yemek detayı */}
                  {selectedFood && (
                    <View style={styles.selectedFoodCard}>
                      <View style={styles.selectedFoodHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedFoodName}>{selectedFood.name_tr}</Text>
                          <Text style={styles.selectedFoodCalories}>{selectedFood.calories_per_100g} kcal / 100g</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedFood(null)}>
                          <Ionicons name="close" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.servingRow}>
                        <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                        <TextInput
                          style={styles.servingInput} value={servingAmount}
                          onChangeText={setServingAmount} keyboardType="numeric" selectTextOnFocus
                        />
                      </View>
                      <Text style={styles.calculatedCalories}>
                        = {Math.round(selectedFood.calories_per_100g * (parseFloat(servingAmount) || 0) / 100)} kcal
                      </Text>
                      <TouchableOpacity style={styles.addFoodBtn} onPress={handleAddFood}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.addFoodBtnText}>Günlüğe Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Arama sonuçları */}
                  {!selectedFood && searchResults.length > 0 && (
                    <View style={styles.searchResultsList}>
                      {searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.searchResult, selectedFood && (selectedFood as Food).id === item.id && styles.searchResultSelected]}
                          onPress={() => { setSelectedFood(item); setServingAmount('100'); }}
                        >
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{item.name_tr}</Text>
                            <Text style={styles.searchResultCategory}>{item.category}</Text>
                          </View>
                          <Text style={styles.searchResultCalories}>{item.calories_per_100g} kcal/100g</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <View style={styles.noResults}>
                      <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
                      <Text style={styles.noResultsText}>"{searchQuery}" bulunamadı</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: Spacing.xxl }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing.xl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  headerMeta: { alignItems: 'flex-end' },
  headerCalories: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  headerCaloriesLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  sectionDate: { fontSize: FontSize.sm, color: Colors.textMuted },
  sectionCalories: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },

  feedSection: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Fotoğraflı kart
  photoCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 220,
    backgroundColor: Colors.borderLight,
  },
  photoCardImage: { ...StyleSheet.absoluteFillObject },
  photoCardTopRow: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  mealBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  mealBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  photoCardTopRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  caloriePill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  caloriePillText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },
  photoDeleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoMealNameWrap: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '75%',
  },
  photoMealName: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    fontStyle: 'italic',
  },

  // Metin kart
  textItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight,
  },
  textItemReadonly: {},
  textItemAccent: { width: 4, alignSelf: 'stretch' },
  textItemBody: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  textItemName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  textItemMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  mealPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  mealPillText: { fontSize: FontSize.xs, fontWeight: '700' },
  textItemServing: { fontSize: FontSize.xs, color: Colors.textMuted },
  textItemRight: { alignItems: 'flex-end', paddingRight: 4 },
  textItemCalories: { fontSize: FontSize.md, fontWeight: '800', color: Colors.accent },
  textItemKcal: { fontSize: FontSize.xs, color: Colors.textMuted },
  textItemActions: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  textActionBtn: { padding: 6 },

  // FAB row — banner ve FAB yan yana alt köşede
  fabRow: {
    position: 'absolute', bottom: 28, left: 24, right: 24,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },

  // Arama kutusu (modal üstü)
  addSearchWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  addSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  addSearchBoxActive: { borderColor: Colors.primary },
  addSearchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },

  // AI Kart Bölümü
  aiSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  aiSectionLabel: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  aiSectionSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: -4, marginBottom: 4 },
  aiCardRow: { flexDirection: 'row', gap: Spacing.sm },
  aiCard: {
    flex: 1, borderRadius: BorderRadius.xl, borderWidth: 1.5,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    alignItems: 'center', gap: 8,
  },
  aiCardIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  aiCardTitle: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center' },
  aiCardSub: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },

  // Barkod kart (tam genişlik)
  barcodeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
  },
  barcodeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  barcodeCardIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  barcodeCardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  barcodeCardSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Analiz yükleniyor (modal içi)
  recognizingContainer: {
    alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  recognizingText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  recognizingSubtext: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Analiz sürüyor banner (food-log ana ekran — FAB'ın solunda)
  analyzingBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}40`,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzingTexts: { flex: 1 },
  analyzingTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  analyzingSubtext: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Hint prompt modal
  hintModal: { flex: 1, backgroundColor: Colors.background },
  hintHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  hintCloseBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary,
  },
  hintHeaderTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  hintPreview: { width: '100%', height: 240, backgroundColor: Colors.borderLight },
  hintBody: { padding: Spacing.lg, gap: Spacing.sm, flex: 1 },
  hintLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  hintSublabel: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  hintInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top', marginTop: Spacing.xs,
  },
  hintFooter: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  hintSkipBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  hintSkipText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  hintAnalyzeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  hintAnalyzeText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },

  // Barkod
  barcodeResultCard: {
    margin: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight, gap: Spacing.xs,
  },
  barcodeResultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  barcodeResultTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  barcodeBrand: { fontSize: FontSize.sm, color: Colors.textMuted },
  barcodeResultActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  barcodeRetryBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
  },
  barcodeRetryText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  barcodeAddBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary,
  },
  barcodeAddText: { fontSize: FontSize.sm, color: '#fff', fontWeight: '700' },

  // Arama bölümü
  searchSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },

  selectedFoodCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
    gap: Spacing.xs, marginBottom: Spacing.sm,
  },
  selectedFoodHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  selectedFoodName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  selectedFoodCalories: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  servingLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  servingInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    fontSize: FontSize.md, width: 80, textAlign: 'center',
  },
  calculatedCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.accent },
  addFoodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, marginTop: 4,
  },
  addFoodBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  searchResultsList: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  searchResult: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  searchResultSelected: { backgroundColor: Colors.primaryPale },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  searchResultCategory: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  searchResultCalories: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noResultsText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Barkod tarayıcı
  barcodeScanFrame: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  barcodeScanBox: {
    width: 260, height: 140, borderWidth: 3,
    borderColor: Colors.primaryLight, borderRadius: BorderRadius.md, backgroundColor: 'transparent',
  },
  barcodeScanHint: {
    marginTop: Spacing.lg, fontSize: FontSize.md, color: '#fff', fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  barcodeClose: {
    position: 'absolute', top: Spacing.lg, right: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  barcodeCloseText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  macroRow: { flexDirection: 'row', gap: Spacing.md },
  macroItem: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
});

// ------------------------------------------------------------------
// PendingPhotoCard — arka plan kaydı sırasında gösterilen blur kartı
// ------------------------------------------------------------------
function PendingPhotoCard({ pending }: { pending: PendingSave }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isComplete = pending.progress >= 100;

  // Giriş animasyonu
  useEffect(() => {
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Shimmer animasyonu
  useEffect(() => {
    if (!isComplete) {
      const loop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isComplete]);

  // Progress bar animasyonu
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pending.progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pending.progress]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[pendingStyles.container, { opacity: fadeInAnim }]}>
      {/* Büyük fotoğraf */}
      <Image
        source={{ uri: `data:image/jpeg;base64,${pending.imageBase64}` }}
        style={pendingStyles.image}
        resizeMode="cover"
        blurRadius={isComplete ? 0 : 12}
      />

      {/* Karanlık overlay */}
      {!isComplete && (
        <View style={pendingStyles.darkOverlay}>
          {/* Shimmer efekti */}
          <Animated.View
            style={[pendingStyles.shimmer, { transform: [{ translateX: shimmerTranslateX }] }]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          {/* Merkezdeki durum kutusu — glassmorphism */}
          <View style={pendingStyles.statusBox}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={pendingStyles.statusTitle}>Kaydediliyor</Text>
            <Text style={pendingStyles.statusText}>{pending.statusText}</Text>

            {/* Progress bar */}
            <View style={pendingStyles.progressTrack}>
              <Animated.View style={[pendingStyles.progressFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={['#6EE7B7', Colors.primary, '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            <Text style={pendingStyles.progressPercent}>{pending.progress}%</Text>
          </View>
        </View>
      )}

      {/* Tamamlandı badge */}
      {isComplete && (
        <View style={pendingStyles.completeBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={pendingStyles.completeText}>Kaydedildi</Text>
        </View>
      )}
    </Animated.View>
  );
}

const pendingStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 220,
    backgroundColor: Colors.borderLight,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.6,
  },
  statusBox: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 200,
  },
  statusTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statusText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  completeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  completeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
});
