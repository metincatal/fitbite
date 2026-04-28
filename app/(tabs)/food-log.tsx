import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, getMealTypes, MealType, MEAL_TYPES } from '../../lib/constants';
import { Food, FoodLogWithFood } from '../../types';
import { DetectedFoodItem, generateMealName, recognizeMealFromImage } from '../../lib/gemini';
import { lookupBarcode, BarcodeFoodResult } from '../../lib/openfoodfacts';
import { uploadFoodPhoto } from '../../lib/storage';
import { MealPhotoDetailModal } from '../../components/food/MealPhotoDetailModal';
import { FoodLogFlow } from '../../components/food/FoodLogFlow';
import { setQuickActionCallbacks } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

interface PendingSave {
  imageBase64: string;
  items: DetectedFoodItem[];
  mealType: MealType;
  progress: number;
  statusText: string;
  imageUrl?: string;
}

const MEAL_DOT: Record<string, string> = {
  breakfast: '#E85D3C',
  lunch: '#7A9C4A',
  dinner: '#3A6D8C',
  snack: '#D4A574',
};

export default function FoodLogScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { foodLogs, fetchDayLogs, addFoodLog, removeFoodLog, selectedDate } = useNutritionStore();

  const [yesterdayLogs, setYesterdayLogs] = useState<FoodLogWithFood[]>([]);
  const [mealNames, setMealNames] = useState<Record<string, string>>({});

  // Search modal (legacy fallback)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string>('breakfast');
  const [servingAmount, setServingAmount] = useState('100');

  // Barcode
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeFoodResult | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Photo flow (FoodLogFlow)
  const [flowVisible, setFlowVisible] = useState(false);
  const [flowBase64, setFlowBase64] = useState<string | null>(null);
  const [flowInitialStep, setFlowInitialStep] = useState<'add' | 'describe' | 'results' | undefined>(undefined);
  const [flowInitialItems, setFlowInitialItems] = useState<DetectedFoodItem[] | undefined>(undefined);

  // Background analysis
  const [bgAnalysis, setBgAnalysis] = useState<{ base64: string; phase: string; progress: number } | null>(null);

  // Detail modal
  const [photoDetailGroup, setPhotoDetailGroup] = useState<FoodLogWithFood[]>([]);

  // Background save
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);

  // Load mealNames
  useEffect(() => {
    AsyncStorage.getItem('fitbite_meal_names').then((raw) => {
      if (raw) {
        try { setMealNames(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

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
    const y = d.toISOString().split('T')[0];
    const { data } = await supabase
      .from('food_logs')
      .select('*, food:foods(*)')
      .eq('user_id', userId)
      .gte('logged_at', `${y}T00:00:00`)
      .lte('logged_at', `${y}T23:59:59`)
      .order('logged_at', { ascending: true });
    setYesterdayLogs((data as FoodLogWithFood[]) ?? []);
  }

  // Quick-action FAB callbacks (camera/gallery base64 → open flow at describe step)
  useEffect(() => {
    setQuickActionCallbacks(
      (base64) => {
        router.push('/(tabs)/food-log');
        setFlowBase64(base64);
        setFlowInitialStep('describe');
        setFlowInitialItems(undefined);
        setFlowVisible(true);
      },
      (base64) => {
        router.push('/(tabs)/food-log');
        setFlowBase64(base64);
        setFlowInitialStep('describe');
        setFlowInitialItems(undefined);
        setFlowVisible(true);
      }
    );
    return () => setQuickActionCallbacks(() => {}, () => {});
  }, [router]);

  function openAddFlow() {
    setFlowBase64(null);
    setFlowInitialStep('add');
    setFlowInitialItems(undefined);
    setFlowVisible(true);
  }

  function handleStartAnalysis(base64: string, hint: string) {
    setBgAnalysis({ base64, phase: 'Fotoğraf inceleniyor', progress: 0 });
    runBgAnalysis(base64, hint);
  }

  async function runBgAnalysis(base64: string, hint: string) {
    const phases = ['Fotoğraf inceleniyor', 'Yemekler ayrıştırılıyor', 'Makrolar çıkarılıyor'];
    const intervalId = setInterval(() => {
      setBgAnalysis((prev) => {
        if (!prev) return null;
        const newProgress = Math.min(prev.progress + 1.5 + Math.random() * 2, 90);
        const phaseIdx = Math.min(Math.floor(newProgress / 33), phases.length - 1);
        return { ...prev, progress: newProgress, phase: phases[phaseIdx] };
      });
    }, 120);
    try {
      const detected = await recognizeMealFromImage(base64, hint || undefined);
      clearInterval(intervalId);
      setBgAnalysis((prev) => (prev ? { ...prev, progress: 100, phase: 'Analiz tamamlandı' } : null));
      setTimeout(() => {
        setBgAnalysis(null);
        setFlowBase64(base64);
        setFlowInitialItems(detected);
        setFlowInitialStep('results');
        setFlowVisible(true);
      }, 450);
    } catch {
      clearInterval(intervalId);
      setBgAnalysis(null);
      Alert.alert('Hata', 'Yemek tanınamadı. Lütfen daha net bir fotoğraf çekin.');
    }
  }

  function handleSavePhotoMeal(items: DetectedFoodItem[], mealType: MealType, base64: string, namePromise?: Promise<string>) {
    if (!user) return;
    const pending: PendingSave = {
      imageBase64: base64,
      items,
      mealType,
      progress: 0,
      statusText: 'Fotoğraf yükleniyor...',
    };
    setPendingSave(pending);
    pendingSaveRef.current = pending;
    runBackgroundSave(user.id, base64, items, mealType, namePromise);
  }

  async function runBackgroundSave(userId: string, base64: string, items: DetectedFoodItem[], mealType: MealType, namePromise?: Promise<string>) {
    const totalSteps = items.length + 1;
    let completedSteps = 0;
    function bump(text: string) {
      completedSteps++;
      const p = Math.round((completedSteps / totalSteps) * 100);
      setPendingSave((prev) => (prev ? { ...prev, progress: p, statusText: text } : null));
    }
    try {
      // Upload image and wait for name in parallel
      const [imageUrl, generatedName] = await Promise.all([
        uploadFoodPhoto(userId, base64),
        (namePromise ?? Promise.resolve(null)).catch(() => null),
      ]);

      setPendingSave((prev) => (prev ? { ...prev, imageUrl: imageUrl ?? undefined } : null));

      // Associate name before items appear in log so it shows immediately
      if (imageUrl && generatedName) {
        setMealNames((prev) => ({ ...prev, [imageUrl]: generatedName }));
      }

      bump('Besinler kaydediliyor...');

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
          .select().single();
        if (error || !newFood) {
          bump(i < items.length - 1 ? `${items[i + 1].name} kaydediliyor...` : 'Tamamlandı');
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
        bump(i < items.length - 1 ? `${items[i + 1].name} kaydediliyor...` : 'Tamamlandı');
      }

      setPendingSave((prev) => (prev ? { ...prev, progress: 100, statusText: 'Tamamlandı' } : null));
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

  // ───────────────────── Search (legacy modal) ─────────────────────
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
      user_id: user.id, food_id: selectedFood.id, meal_type: selectedMeal as MealType, serving_amount: amount,
      calories: Math.round(selectedFood.calories_per_100g * ratio),
      protein: Math.round(selectedFood.protein * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbs * ratio * 10) / 10,
      fat: Math.round(selectedFood.fat * ratio * 10) / 10,
      logged_at: new Date().toISOString(),
    });
    setSelectedFood(null); setSearchQuery(''); setSearchResults([]); setShowSearch(false);
  }

  // ───────────────────── Barcode ─────────────────────
  async function openBarcodeScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) { Alert.alert('İzin Gerekli', 'Barkod okumak için kamera iznine ihtiyaç var.'); return; }
    }
    setScanned(false); setBarcodeResult(null); setScanningBarcode(true); setShowSearch(true);
  }

  async function handleBarcodeScanned({ data }: { type: string; data: string }) {
    if (scanned || lookingUpBarcode) return;
    setScanned(true); setLookingUpBarcode(true);
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
      .from('foods').insert({
        name: fullName, name_tr: barcodeResult.name, category: 'Paketli Ürün',
        calories_per_100g: barcodeResult.calories, protein: barcodeResult.protein,
        carbs: barcodeResult.carbs, fat: barcodeResult.fat, fiber: barcodeResult.fiber,
        serving_size: 100, serving_unit: 'g', is_turkish: false, created_by: user.id,
      }).select().single();
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

  // ───────────────────── Render helpers ─────────────────────
  const mealTypes = getMealTypes(profile?.meal_count ?? 3);
  const totalCaloriesToday = foodLogs.reduce((s, l) => s + l.calories, 0);
  const totalCaloriesYesterday = yesterdayLogs.reduce((s, l) => s + l.calories, 0);

  function formatDay(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toUpperCase();
  }
  function formatWeekday(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();
  }

  const todayLabel = formatDay(selectedDate);
  const todayWeekday = formatWeekday(selectedDate);
  const yesterdayDate = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const yesterdayLabel = formatDay(yesterdayDate);

  function getMealLabel(t: string) {
    return mealTypes.find((m) => m.key === t)?.label ?? MEAL_TYPES[t as MealType] ?? t;
  }

  function renderEntry(log: FoodLogWithFood, idx: number, group: FoodLogWithFood[], readonly: boolean, seenUrls: Set<string>) {
    if (log.image_url) {
      if (pendingSave && pendingSave.imageUrl && log.image_url === pendingSave.imageUrl) return null;
      if (seenUrls.has(log.image_url)) return null;
      seenUrls.add(log.image_url);
      const url = log.image_url;
      const photoGroup = group.filter((l) => l.image_url === url);
      const totalCal = photoGroup.reduce((s, l) => s + l.calories, 0);
      const mealName = mealNames[url];
      const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      return (
        <TouchableOpacity
          key={`photo-${url}`}
          style={styles.photoEntryCard}
          activeOpacity={0.88}
          onPress={() => !readonly && setPhotoDetailGroup(photoGroup)}
        >
          <View style={styles.photoEntryImageWrap}>
            <Image source={{ uri: url }} style={styles.photoEntryImage} resizeMode="cover" />
            {mealName && (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.photoEntryGradient}
              >
                <Text style={styles.photoEntryName} numberOfLines={2}>{mealName}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.photoEntryMeta}>
            <Text style={styles.photoEntryMetaTime}>{time} · {getMealLabel(log.meal_type)}</Text>
            <Text style={styles.photoEntryKcal}>
              {Math.round(totalCal)}<Text style={styles.photoEntryKcalUnit}> kcal</Text>
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return (
      <View key={log.id} style={styles.entry}>
        <View style={[styles.entryNoPhoto, { backgroundColor: MEAL_DOT[log.meal_type] ?? Colors.ink }]}>
          <Text style={styles.entryNoPhotoTime}>{time.split(':')[0]}</Text>
        </View>
        <View style={styles.entryBody}>
          <Text style={styles.entryTitle} numberOfLines={2}>{log.food?.name_tr ?? log.food?.name}</Text>
          <Text style={styles.entryMeta} numberOfLines={1}>
            {time} · {getMealLabel(log.meal_type)} · {log.serving_amount}g
          </Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={styles.entryKcal}>{Math.round(log.calories)}</Text>
          <Text style={styles.entryKcalUnit}>kcal</Text>
        </View>
        {!readonly && (
          <TouchableOpacity onPress={() => removeFoodLog(log.id)} style={styles.entryDelete}>
            <Ionicons name="close" size={16} color={Colors.ink4} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderEntries(logs: FoodLogWithFood[], readonly = false) {
    const seen = new Set<string>();
    const out: React.ReactNode[] = [];
    logs.forEach((log, i) => {
      const r = renderEntry(log, i, logs, readonly, seen);
      if (r) out.push(r);
    });
    return out;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero header */}
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroOverline}>{todayLabel} · {todayWeekday}</Text>
            <Text style={styles.heroTitle}>
              Yemek <Text style={styles.heroTitleAccent}>Günlüğü</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.heroKcal, { color: totalCaloriesToday > 0 ? Colors.ink : Colors.ink3 }]}>
              {Math.round(totalCaloriesToday)} <Text style={styles.heroKcalUnit}>kcal</Text>
            </Text>
            <Text style={styles.heroSubOverline}>BUGÜN</Text>
          </View>
        </View>

        {/* Today section */}
        <DaySection
          dateLabel={`Bugün · ${todayLabel.split(' ').slice(0, 2).join(' ')}`}
          subtitle={totalCaloriesToday > 0 ? `${Math.round(totalCaloriesToday)} kcal` : 'Henüz boş'}
          active
        >
          {foodLogs.length === 0 && !pendingSave && !bgAnalysis ? (
            <EmptyDay />
          ) : (
            <View style={{ gap: 8 }}>
              {renderEntries(foodLogs, false)}
              {bgAnalysis && (
                <AnalyzingBanner
                  base64={bgAnalysis.base64}
                  phase={bgAnalysis.phase}
                  progress={bgAnalysis.progress}
                />
              )}
              {pendingSave && <PendingPhotoCard pending={pendingSave} />}
            </View>
          )}
        </DaySection>

        {/* Yesterday section */}
        <DaySection
          dateLabel={`Dün · ${yesterdayLabel.split(' ').slice(0, 2).join(' ')}`}
          subtitle={yesterdayLogs.length > 0 ? `${Math.round(totalCaloriesYesterday)} kcal` : 'Kayıt yok'}
        >
          {yesterdayLogs.length === 0 ? (
            <Text style={styles.emptyDayLine}>Dün hiçbir şey yazmadın.</Text>
          ) : (
            <View style={{ gap: 8, opacity: 0.75 }}>{renderEntries(yesterdayLogs, true)}</View>
          )}
        </DaySection>

        {/* Hint card (yalnızca bugün boşken) */}
        {foodLogs.length === 0 && !pendingSave && !bgAnalysis && (
          <View style={styles.hintCard}>
            <View style={styles.hintCardArrow}>
              <Text style={styles.hintCardArrowText}>↘</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hintCardTitle}>Sağ alttaki ＋'a bas.</Text>
              <Text style={styles.hintCardSub}>Fotoğraf çek, AI tabağını okusun.</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB — diary'de sağ altta */}
      <TouchableOpacity style={styles.fab} onPress={openAddFlow} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color={Colors.background} />
      </TouchableOpacity>

      {/* Photo flow */}
      <FoodLogFlow
        visible={flowVisible}
        initialBase64={flowBase64}
        initialStep={flowInitialStep}
        initialItems={flowInitialItems}
        onClose={() => { setFlowVisible(false); setFlowInitialItems(undefined); }}
        onSave={(items, mealType, base64, namePromise) => {
          setFlowVisible(false);
          setFlowInitialItems(undefined);
          handleSavePhotoMeal(items, mealType, base64, namePromise);
        }}
        onStartAnalysis={handleStartAnalysis}
        onOpenSearch={() => {
          setFlowVisible(false);
          setTimeout(() => setShowSearch(true), 200);
        }}
        onOpenBarcode={() => {
          setFlowVisible(false);
          setTimeout(() => openBarcodeScanner(), 200);
        }}
      />

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

      {/* Legacy search/barcode modal — kept as fallback for non-photo entries */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.legacyModal}>
          <View style={styles.legacyHeader}>
            <TouchableOpacity onPress={() => {
              setShowSearch(false); setSelectedFood(null); setSearchQuery('');
              setBarcodeResult(null); setScanned(false); setScanningBarcode(false); setSearchResults([]);
            }}>
              <Ionicons name="close" size={22} color={Colors.ink} />
            </TouchableOpacity>
            <Text style={styles.legacyTitle}>Ara veya Barkod</Text>
            <View style={{ width: 22 }} />
          </View>

          {scanningBarcode && (
            <View style={StyleSheet.absoluteFillObject}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
              />
              <View style={styles.barcodeFrame}>
                <View style={styles.barcodeBox} />
                <Text style={styles.barcodeHint}>
                  {lookingUpBarcode ? 'Ürün aranıyor...' : 'Barkodu çerçeveye hizalayın'}
                </Text>
                {lookingUpBarcode && <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />}
              </View>
              <TouchableOpacity style={styles.barcodeClose} onPress={() => { setScanningBarcode(false); setScanned(false); }}>
                <Text style={styles.barcodeCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}

          {!scanningBarcode && (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22 }}>
              <View style={styles.legacySearchBox}>
                <Ionicons name="search-outline" size={16} color={Colors.ink3} />
                <TextInput
                  style={styles.legacySearchInput}
                  placeholder="Yemek adı yazın…"
                  value={searchQuery}
                  onChangeText={(t) => { setSearchQuery(t); searchFoods(t); }}
                  placeholderTextColor={Colors.ink4}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color={Colors.ink4} />
                  </TouchableOpacity>
                )}
              </View>

              {barcodeResult && (
                <View style={styles.barcodeCard}>
                  <Text style={styles.barcodeBrand}>{barcodeResult.brand ?? ''}</Text>
                  <Text style={styles.barcodeName}>{barcodeResult.name}</Text>
                  <Text style={styles.barcodeCal}>{barcodeResult.calories} kcal / 100g</Text>
                  <View style={styles.servingRow}>
                    <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                    <TextInput
                      style={styles.servingInput} value={servingAmount}
                      onChangeText={setServingAmount} keyboardType="numeric" selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.calculatedCal}>
                    = {Math.round(barcodeResult.calories * (parseFloat(servingAmount) || 0) / 100)} kcal
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => { setBarcodeResult(null); setScanned(false); }} style={styles.btnGhost}>
                      <Text style={styles.btnGhostText}>Yeniden Tara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddBarcodeFood} style={styles.btnPrimary}>
                      <Ionicons name="checkmark" size={14} color={Colors.background} />
                      <Text style={styles.btnPrimaryText}>Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selectedFood && !barcodeResult && (
                <View style={styles.barcodeCard}>
                  <Text style={styles.barcodeName}>{selectedFood.name_tr}</Text>
                  <Text style={styles.barcodeCal}>{selectedFood.calories_per_100g} kcal / 100g</Text>
                  <View style={styles.servingRow}>
                    <Text style={styles.servingLabel}>Porsiyon (g):</Text>
                    <TextInput
                      style={styles.servingInput} value={servingAmount}
                      onChangeText={setServingAmount} keyboardType="numeric" selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.calculatedCal}>
                    = {Math.round(selectedFood.calories_per_100g * (parseFloat(servingAmount) || 0) / 100)} kcal
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setSelectedFood(null)} style={styles.btnGhost}>
                      <Text style={styles.btnGhostText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddFood} style={styles.btnPrimary}>
                      <Ionicons name="checkmark" size={14} color={Colors.background} />
                      <Text style={styles.btnPrimaryText}>Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!selectedFood && !barcodeResult && (
                <>
                  {searching && <ActivityIndicator color={Colors.ink} style={{ marginTop: 24 }} />}
                  {searchResults.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      {searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.searchResult}
                          onPress={() => { setSelectedFood(item); setServingAmount('100'); }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.searchResultName}>{item.name_tr}</Text>
                            <Text style={styles.searchResultCat}>{item.category}</Text>
                          </View>
                          <Text style={styles.searchResultKcal}>{item.calories_per_100g} kcal</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <Text style={styles.noResults}>"{searchQuery}" bulunamadı</Text>
                  )}

                  <TouchableOpacity onPress={openBarcodeScanner} style={styles.barcodeRow}>
                    <View style={styles.barcodeIcon}>
                      <Ionicons name="barcode" size={18} color={Colors.background} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.barcodeRowTitle}>Barkod Tara</Text>
                      <Text style={styles.barcodeRowSub}>Paketli ürünler için</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ──────────────────────────── DAY SECTION ────────────────────────────
function DaySection({
  dateLabel,
  subtitle,
  active,
  children,
}: {
  dateLabel: string;
  subtitle: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <View style={[styles.dayDot, { backgroundColor: active ? Colors.terracotta : Colors.ink4 }]} />
          <Text style={styles.dayLabel}>{dateLabel}</Text>
        </View>
        <Text style={styles.daySubtitle}>{subtitle}</Text>
      </View>
      <View style={{ paddingTop: 4 }}>{children}</View>
    </View>
  );
}

// ──────────────────────────── EMPTY DAY ────────────────────────────
function EmptyDay() {
  return (
    <View style={styles.emptyDay}>
      <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
        <Circle cx={28} cy={28} r={27} stroke={Colors.line} strokeWidth={0.6} />
        <G stroke={Colors.ink3} strokeWidth={1.4} strokeLinecap="round" transform="translate(28, 28)">
          <G transform="rotate(-22)">
            <Line x1={-10} y1={-13} x2={-10} y2={13} />
            <Line x1={-13} y1={-13} x2={-13} y2={-7} />
            <Line x1={-7} y1={-13} x2={-7} y2={-7} />
          </G>
          <G transform="rotate(22)">
            <Line x1={10} y1={-13} x2={10} y2={13} />
            <Path d="M 8 -13 Q 13 -10 13 -3 L 10 -3" fill={Colors.ink3} stroke="none" opacity={0.85} />
          </G>
        </G>
      </Svg>
      <Text style={styles.emptyTitle}>
        Tabağın <Text style={styles.emptyTitleAccent}>boş</Text>.
      </Text>
      <Text style={styles.emptySub}>Bir fotoğraf çek, FitBot saniyede tanısın. Yazarak da ekleyebilirsin.</Text>
    </View>
  );
}

// ──────────────────────────── PENDING PHOTO CARD ────────────────────────────
function PendingPhotoCard({ pending }: { pending: PendingSave }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isComplete = pending.progress >= 100;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);
  useEffect(() => {
    if (!isComplete) {
      const loop = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }));
      loop.start();
      return () => loop.stop();
    }
  }, [isComplete]);
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: pending.progress, duration: 300, useNativeDriver: false }).start();
  }, [pending.progress]);

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <Animated.View style={[styles.pendingCard, { opacity: fadeIn }]}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${pending.imageBase64}` }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={isComplete ? 0 : 10}
      />
      {!isComplete && (
        <View style={styles.pendingOverlay}>
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Kaydediliyor</Text>
            <Text style={styles.pendingStatus}>{pending.statusText}</Text>
            <View style={styles.pendingTrack}>
              <Animated.View style={[styles.pendingFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.pendingPct}>%{pending.progress}</Text>
          </View>
        </View>
      )}
      {isComplete && (
        <View style={styles.completeBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.completeText}>Kaydedildi</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ──────────────────────────── ANALYZING BANNER ────────────────────────────
function AnalyzingBanner({ base64, phase, progress }: { base64: string; phase: string; progress: number }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 250, useNativeDriver: false }).start();
  }, [progress]);

  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <Animated.View style={[analyzingStyles.card, { opacity: fadeIn }]}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${base64}` }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={14}
      />
      <View style={analyzingStyles.overlay}>
        <View style={analyzingStyles.row}>
          <Animated.View style={{ transform: [{ rotate: rot }] }}>
            <Ionicons name="sync" size={16} color={Colors.terracotta} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={analyzingStyles.overline}>FİTBOT ANALİZ EDİYOR</Text>
            <Text style={analyzingStyles.phase}>{phase}…</Text>
          </View>
          <Text style={analyzingStyles.pct}>%{Math.round(progress)}</Text>
        </View>
        <View style={analyzingStyles.track}>
          <Animated.View style={[analyzingStyles.fill, { width: progressWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const analyzingStyles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', height: 110, backgroundColor: Colors.line2, marginTop: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)', padding: 16, justifyContent: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  overline: { fontFamily: MONO, fontSize: 9, color: 'rgba(242,239,230,0.6)', letterSpacing: 1.8 },
  phase: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: '#F2EFE6', marginTop: 2 },
  pct: { fontFamily: MONO, fontSize: 13, color: 'rgba(242,239,230,0.85)', letterSpacing: 0.6 },
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.terracotta },
});

// ──────────────────────────── STYLES ────────────────────────────
const PHOTO_ENTRY_SIZE = SCREEN_WIDTH - 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingTop: 8, paddingBottom: 40 },

  heroRow: { paddingHorizontal: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-start' },
  heroOverline: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 1.6 },
  heroTitle: { fontFamily: SERIF, fontSize: 36, lineHeight: 38, color: Colors.ink, marginTop: 4 },
  heroTitleAccent: { fontStyle: 'italic', color: Colors.terracotta },
  heroKcal: { fontFamily: SERIF, fontSize: 26, lineHeight: 28 },
  heroKcalUnit: { fontFamily: MONO, fontSize: 12, color: Colors.ink3, letterSpacing: 1 },
  heroSubOverline: { fontFamily: MONO, fontSize: 9, color: Colors.ink4, letterSpacing: 1.6, marginTop: 2 },

  daySection: { paddingHorizontal: 22, paddingTop: 14 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDot: { width: 7, height: 7, borderRadius: 99 },
  dayLabel: { fontFamily: SERIF, fontSize: 13, color: Colors.ink },
  daySubtitle: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 1.2 },
  emptyDayLine: { paddingVertical: 14, textAlign: 'center', color: Colors.ink4, fontSize: 12 },

  // Photo meal entry (wide card)
  photoEntryCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.line2, marginBottom: 2 },
  photoEntryImageWrap: { width: PHOTO_ENTRY_SIZE, height: PHOTO_ENTRY_SIZE, position: 'relative' },
  photoEntryImage: { width: PHOTO_ENTRY_SIZE, height: PHOTO_ENTRY_SIZE },
  photoEntryGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 48 },
  photoEntryName: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: '#F2EFE6', lineHeight: 22 },
  photoEntryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  photoEntryMetaTime: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.8 },
  photoEntryKcal: { fontFamily: SERIF, fontSize: 16, color: Colors.ink },
  photoEntryKcalUnit: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.6 },

  // Entry (non-photo)
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line2 },
  entryThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.line2 },
  entryNoPhoto: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryNoPhotoTime: { fontFamily: SERIF, fontSize: 16, color: Colors.background },
  entryBody: { flex: 1, minWidth: 0 },
  entryTitle: { fontFamily: SERIF, fontSize: 15, color: Colors.ink, lineHeight: 18 },
  entryDot: { color: Colors.terracotta },
  entryMeta: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.6, marginTop: 3 },
  entryRight: { alignItems: 'flex-end', marginLeft: 4 },
  entryKcal: { fontFamily: SERIF, fontSize: 17, color: Colors.ink, lineHeight: 19 },
  entryKcalUnit: { fontFamily: MONO, fontSize: 9, color: Colors.ink3, letterSpacing: 0.6 },
  entryDelete: { padding: 6 },

  // Empty day
  emptyDay: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.ink },
  emptyTitleAccent: { fontStyle: 'italic', color: Colors.terracotta },
  emptySub: { fontSize: 13, color: Colors.ink3, maxWidth: 240, textAlign: 'center' },

  // Hint card
  hintCard: { marginHorizontal: 22, marginTop: 24, padding: 14, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12 },
  hintCardArrow: { width: 36, height: 36, borderRadius: 99, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  hintCardArrowText: { color: Colors.background, fontSize: 18 },
  hintCardTitle: { fontSize: 12.5, color: Colors.ink, fontWeight: '700' },
  hintCardSub: { fontSize: 12, color: Colors.ink3, marginTop: 2 },

  // FAB
  fab: { position: 'absolute', bottom: 90, right: 22, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.ink, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 12 },

  // Pending photo card
  pendingCard: { borderRadius: 16, overflow: 'hidden', height: 200, backgroundColor: Colors.line2, marginTop: 4 },
  pendingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: SCREEN_WIDTH * 0.6 },
  pendingBox: { alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, paddingHorizontal: 24, minWidth: 200 },
  pendingTitle: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: '#F2EFE6' },
  pendingStatus: { fontSize: 11, color: 'rgba(242,239,230,0.78)', textAlign: 'center' },
  pendingTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 6 },
  pendingFill: { height: '100%', backgroundColor: Colors.terracotta },
  pendingPct: { fontFamily: MONO, fontSize: 11, color: 'rgba(242,239,230,0.7)', letterSpacing: 0.6 },
  completeBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  completeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Legacy modal
  legacyModal: { flex: 1, backgroundColor: Colors.background },
  legacyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  legacyTitle: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: Colors.ink },
  legacySearchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  legacySearchInput: { flex: 1, fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: Colors.ink, padding: 0 },

  barcodeCard: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, gap: 4 },
  barcodeBrand: { fontSize: 12, color: Colors.ink3 },
  barcodeName: { fontFamily: SERIF, fontSize: 18, color: Colors.ink },
  barcodeCal: { fontFamily: MONO, fontSize: 12, color: Colors.ink3, letterSpacing: 0.6, marginTop: 4 },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  servingLabel: { fontSize: 13, color: Colors.ink2 },
  servingInput: { borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, width: 80, textAlign: 'center', color: Colors.ink },
  calculatedCal: { fontFamily: SERIF, fontSize: 16, color: Colors.terracotta, marginTop: 4 },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { fontFamily: SERIF, fontSize: 13, color: Colors.ink2 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.ink },
  btnPrimaryText: { fontFamily: SERIF, fontSize: 13, color: Colors.background },

  searchResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line2 },
  searchResultName: { fontFamily: SERIF, fontSize: 14, color: Colors.ink },
  searchResultCat: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.6, marginTop: 2 },
  searchResultKcal: { fontFamily: MONO, fontSize: 11, color: Colors.ink2, letterSpacing: 0.6 },
  noResults: { textAlign: 'center', marginTop: 24, color: Colors.ink3, fontSize: 13 },

  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  barcodeIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  barcodeRowTitle: { fontFamily: SERIF, fontSize: 15, color: Colors.ink },
  barcodeRowSub: { fontSize: 11, color: Colors.ink3, marginTop: 2 },
  chevron: { fontFamily: SERIF, fontSize: 22, color: Colors.ink4 },

  // Barcode camera
  barcodeFrame: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  barcodeBox: { width: 260, height: 140, borderWidth: 3, borderColor: Colors.terracotta, borderRadius: 16, backgroundColor: 'transparent' },
  barcodeHint: { marginTop: 18, fontSize: 14, color: '#fff', fontWeight: '600' },
  barcodeClose: { position: 'absolute', top: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  barcodeCloseText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
