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
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Path, Ellipse } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { Colors, Spacing, FontSize, BorderRadius, getMealTypes, MealType, MEAL_TYPES } from '../../lib/constants';
import { Food, FoodLogWithFood } from '../../types';
import { DetectedFoodItem, generateMealName, recognizeMealFromImage } from '../../lib/gemini';
import { compute as computeNutrition } from '../../lib/nutritionEngine';
import { lookupBarcode, BarcodeFoodResult } from '../../lib/openfoodfacts';
import { uploadFoodPhoto } from '../../lib/storage';
import { sendImmediateNotification } from '../../lib/notifications';
import { savePendingAnalysis, loadPendingAnalysis, clearPendingAnalysis } from '../../lib/pendingAnalysisStore';
import { MealPhotoDetailModal } from '../../components/food/MealPhotoDetailModal';
import { FoodLogFlow } from '../../components/food/FoodLogFlow';
import type { ComputedFoodItem } from '../../components/food/PhotoMealReviewModal';
import { setQuickActionCallbacks } from './_layout';

function pickMealByHour(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

const EDITED_MEALS_KEY = 'fitbite_edited_meals';
const KARE_COUNTS_KEY = 'fitbite_kare_counts';
const KARE_URLS_KEY = 'fitbite_kare_urls';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

interface PendingSave {
  imageBase64: string;
  items: ComputedFoodItem[];
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
  const { foodLogs, fetchDayLogs, addFoodLog, removeFoodLog, updateFoodLog, updateFoodName, addWaterLog, selectedDate } = useNutritionStore();

  const [yesterdayLogs, setYesterdayLogs] = useState<FoodLogWithFood[]>([]);
  const [mealNames, setMealNames] = useState<Record<string, string>>({});
  const [editedMeals, setEditedMeals] = useState<Set<string>>(new Set());
  const [karesCount, setKaresCount] = useState<Record<string, number>>({});
  const [kareUrls, setKareUrls] = useState<Record<string, string[]>>({});
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Analiz sırasında arka plana gidilip gidilmediğini takip eder
  const analysisInProgressRef = useRef(false);
  const wentToBackgroundDuringAnalysisRef = useRef(false);

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
  const [flowImages, setFlowImages] = useState<string[]>([]);
  const [flowInitialStep, setFlowInitialStep] = useState<'add' | 'describe' | 'results' | undefined>(undefined);
  const [flowInitialItems, setFlowInitialItems] = useState<DetectedFoodItem[] | undefined>(undefined);

  // Background analysis
  const [bgAnalysis, setBgAnalysis] = useState<{ base64: string; phase: string; progress: number } | null>(null);

  // Detail modal
  const [photoDetailGroup, setPhotoDetailGroup] = useState<FoodLogWithFood[]>([]);

  // Background save
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);

  // Background edit save
  const [pendingEditUrl, setPendingEditUrl] = useState<string | null>(null);

  // AppState tracking — arka plan analiz auto-save için
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      // Analiz devam ediyorken arka plana geçilirse bunu kalıcı olarak işaretle.
      // Kullanıcı geri dönse bile artık auto-save modundayız.
      if (analysisInProgressRef.current && (state === 'background' || state === 'inactive')) {
        wentToBackgroundDuringAnalysisRef.current = true;
      }
    });
    return () => sub.remove();
  }, []);

  // Load mealNames + editedMeals
  useEffect(() => {
    AsyncStorage.getItem('fitbite_meal_names').then((raw) => {
      if (raw) { try { setMealNames(JSON.parse(raw)); } catch {} }
    });
    AsyncStorage.getItem(EDITED_MEALS_KEY).then((raw) => {
      if (raw) { try { setEditedMeals(new Set(JSON.parse(raw))); } catch {} }
    });
    AsyncStorage.getItem(KARE_COUNTS_KEY).then((raw) => {
      if (raw) { try { setKaresCount(JSON.parse(raw)); } catch {} }
    });
    AsyncStorage.getItem(KARE_URLS_KEY).then((raw) => {
      if (raw) { try { setKareUrls(JSON.parse(raw)); } catch {} }
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

  // Uygulama kapatılıp yeniden açıldığında bekleyen analizi devam ettir
  useEffect(() => {
    if (!user) return;
    loadPendingAnalysis().then((pending) => {
      if (!pending) return;
      // Zaten analiz devam ediyorsa (in-memory) yeniden başlatma
      if (analysisInProgressRef.current) {
        clearPendingAnalysis().catch(() => {});
        return;
      }
      // Uygulama kapatılmış ve yeniden açılmış — analizi yeniden başlat ve auto-save et
      analysisInProgressRef.current = true;
      wentToBackgroundDuringAnalysisRef.current = true; // direkt auto-save modunda
      setBgAnalysis({ base64: pending.images[0] ?? '', phase: 'Fotoğraf inceleniyor', progress: 0 });
      runBgAnalysis(pending.images, pending.hint);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        setFlowImages([base64]);
        setFlowInitialStep('describe');
        setFlowInitialItems(undefined);
        setFlowVisible(true);
      },
      (base64s) => {
        router.push('/(tabs)/food-log');
        setFlowImages(base64s);
        setFlowInitialStep(base64s.length > 0 ? 'describe' : 'add');
        setFlowInitialItems(undefined);
        setFlowVisible(true);
      }
    );
    return () => setQuickActionCallbacks(() => {}, () => {});
  }, [router]);

  function openAddFlow() {
    setFlowImages([]);
    setFlowInitialStep('add');
    setFlowInitialItems(undefined);
    setFlowVisible(true);
  }

  function handleStartAnalysis(images: string[], hint: string) {
    const firstBase64 = images[0] ?? '';
    // Analiz başlıyor — ref'leri sıfırla
    analysisInProgressRef.current = true;
    wentToBackgroundDuringAnalysisRef.current = false;
    setBgAnalysis({ base64: firstBase64, phase: 'Fotoğraf inceleniyor', progress: 0 });
    // Uygulama kapatılsa da devam edebilsin diye analiz isteğini kalıcılaştır
    savePendingAnalysis(images, hint).catch(() => {});
    runBgAnalysis(images, hint);
  }

  async function runBgAnalysis(images: string[], hint: string) {
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
      const detected = await recognizeMealFromImage(images, hint || undefined);
      clearInterval(intervalId);
      analysisInProgressRef.current = false;

      // Auto-save koşulu: şu an arka planda VEYA analiz sırasında herhangi bir noktada arka plana gidildi.
      // "geri dönseler de" — bir kez arka plana gittilerse artık sonuç ekranı gösterilmez, direkt kaydedilir.
      const shouldAutoSave = appStateRef.current !== 'active' || wentToBackgroundDuringAnalysisRef.current;

      if (shouldAutoSave) {
        setBgAnalysis(null);
        clearPendingAnalysis().catch(() => {});
        if (user) {
          const mealType = pickMealByHour();
          const computedItems: ComputedFoodItem[] = detected.map((d) => {
            const eng = computeNutrition({ detection: d, userGrams: d.estimatedGrams });
            return {
              detection: { ...d, calories: eng.kcal, protein: eng.protein, carbs: eng.carbs, fat: eng.fat },
              engine: eng,
            };
          });
          const namePromise = generateMealName(detected.map((d) => d.name));
          // BUG FIX: Tüm images array'ini geç, sadece ilk resmi değil
          handleSavePhotoMeal(computedItems, mealType, images, namePromise, true);
        }
        return;
      }

      // Kullanıcı aktif → sonuç ekranını aç, manuel onay istesin
      clearPendingAnalysis().catch(() => {});
      setBgAnalysis((prev) => (prev ? { ...prev, progress: 100, phase: 'Analiz tamamlandı' } : null));
      setTimeout(() => {
        setBgAnalysis(null);
        setFlowImages(images);
        setFlowInitialItems(detected);
        setFlowInitialStep('results');
        setFlowVisible(true);
      }, 450);
    } catch (err) {
      clearInterval(intervalId);
      analysisInProgressRef.current = false;
      setBgAnalysis(null);
      clearPendingAnalysis().catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[food-log] recognizeMealFromImage failed:', err);
      Alert.alert('Hata', `Yemek tanınamadı.\n\n${msg}`);
    }
  }

  function handleSavePhotoMeal(items: ComputedFoodItem[], mealType: MealType, images: string[], namePromise?: Promise<string>, autoSaved?: boolean | number) {
    if (!user) return;
    const pending: PendingSave = {
      imageBase64: images[0] ?? '',
      items,
      mealType,
      progress: 0,
      statusText: 'Fotoğraf yükleniyor...',
    };
    setPendingSave(pending);
    pendingSaveRef.current = pending;
    runBackgroundSave(user.id, images, items, mealType, namePromise, autoSaved === true);
  }

  async function runBackgroundSave(userId: string, images: string[], items: ComputedFoodItem[], mealType: MealType, namePromise?: Promise<string>, isAutoSaved?: boolean) {
    const totalSteps = items.length + 1;
    let completedSteps = 0;
    function bump(text: string) {
      completedSteps++;
      const p = Math.round((completedSteps / totalSteps) * 100);
      setPendingSave((prev) => (prev ? { ...prev, progress: p, statusText: text } : null));
    }
    try {
      // Upload primary image + name in parallel
      const [imageUrl, generatedName] = await Promise.all([
        uploadFoodPhoto(userId, images[0] ?? ''),
        (namePromise ?? Promise.resolve(null)).catch(() => null),
      ]);

      setPendingSave((prev) => (prev ? { ...prev, imageUrl: imageUrl ?? undefined } : null));

      // Associate name before items appear in log so it shows immediately
      if (imageUrl && generatedName) {
        setMealNames((prev) => ({ ...prev, [imageUrl]: generatedName }));
      }

      // Upload extra photos and record all URLs
      if (imageUrl && images.length > 1) {
        const extraUploadResults = await Promise.all(
          images.slice(1).map((b64) => uploadFoodPhoto(userId, b64).catch(() => null))
        );
        const extraUrls = extraUploadResults.filter(Boolean) as string[];
        const allUrls = [imageUrl, ...extraUrls];
        const count = allUrls.length;
        setKaresCount((prev) => {
          const next = { ...prev, [imageUrl]: count };
          AsyncStorage.setItem(KARE_COUNTS_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
        setKareUrls((prev) => {
          const next = { ...prev, [imageUrl]: allUrls };
          AsyncStorage.setItem(KARE_URLS_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      }

      bump('Besinler kaydediliyor...');

      for (let i = 0; i < items.length; i++) {
        const { detection, engine } = items[i];
        const grams = detection.estimatedGrams;
        const per100 = grams > 0 ? 100 / grams : 1;
        const { data: newFood, error } = await supabase
          .from('foods')
          .insert({
            name: detection.name, name_tr: detection.name, category: 'AI Tanıma',
            calories_per_100g: Math.round(engine.kcal * per100),
            protein: Math.round(engine.protein * per100 * 10) / 10,
            carbs: Math.round(engine.carbs * per100 * 10) / 10,
            fat: Math.round(engine.fat * per100 * 10) / 10,
            fiber: 0, serving_size: 100, serving_unit: 'g', is_turkish: true, created_by: userId,
          })
          .select().single();
        if (error || !newFood) {
          bump(i < items.length - 1 ? `${items[i + 1].detection.name} kaydediliyor...` : 'Tamamlandı');
          continue;
        }
        await addFoodLog({
          user_id: userId, food_id: newFood.id, meal_type: mealType,
          serving_amount: grams,
          calories: Math.round(engine.kcal),
          protein: Math.round(engine.protein * 10) / 10,
          carbs: Math.round(engine.carbs * 10) / 10,
          fat: Math.round(engine.fat * 10) / 10,
          image_url: imageUrl,
          logged_at: new Date().toISOString(),
          // Bilimsel motor metadata'sı — audit/şeffaflık için
          cooking_method: detection.cookingMethod ?? null,
          texture: detection.texture ?? null,
          composition_entry_id: engine.match.entryId,
          engine_confidence: engine.confidence,
          engine_factors: engine.factors,
        });
        // Liquid items (texture=liquid) → also add to water log for hydration tracking
        if (detection.texture === 'liquid' && grams > 0) {
          await addWaterLog(userId, Math.round(grams), 'meal_photo');
        }

        bump(i < items.length - 1 ? `${items[i + 1].detection.name} kaydediliyor...` : 'Tamamlandı');
      }

      setPendingSave((prev) => (prev ? { ...prev, progress: 100, statusText: 'Tamamlandı' } : null));
      // Arka planda otomatik kaydedildiyse kullanıcıya bildirim gönder
      if (isAutoSaved) {
        sendImmediateNotification('Öğün Kaydedildi ✓', 'Yemek günlüğüne eklendi, istediğin zaman düzenleyebilirsin.').catch(() => {});
      }
      setTimeout(() => {
        setPendingSave(null);
        pendingSaveRef.current = null;
        fetchDayLogs(userId, selectedDate);
      }, 600);
    } catch {
      if (!isAutoSaved) Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
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
      const mealName = photoGroup[0]?.meal_name ?? mealNames[url];
      const allUrls = kareUrls[url] ?? [url];
      const kares = allUrls.length;
      const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const ingredients = photoGroup.map((l) => l.food?.name_tr ?? l.food?.name).filter(Boolean).join(' · ');
      const isEditPending = pendingEditUrl === url;

      // Circular staggered thumbnails (max 3 visible)
      const CIRCLE = 54;
      const DX = 22;
      const DY = 10;
      const displayUrls = allUrls.slice(0, 3);
      const circleContainerW = CIRCLE + DX * (displayUrls.length - 1);
      const circleContainerH = displayUrls.length > 1 ? CIRCLE + DY : CIRCLE;
      const extraCount = allUrls.length - displayUrls.length;

      return (
        <TouchableOpacity
          key={`photo-${url}`}
          style={styles.entryCard}
          activeOpacity={isEditPending ? 1 : 0.88}
          onPress={() => !readonly && !isEditPending && setPhotoDetailGroup(photoGroup)}
        >
          {/* Circular staggered thumbnails */}
          <View style={{ width: circleContainerW, height: circleContainerH, flexShrink: 0 }}>
            {displayUrls.map((imgUrl, i) => (
              <React.Fragment key={i}>
                <Image
                  source={{ uri: imgUrl }}
                  style={{
                    position: 'absolute',
                    left: i * DX,
                    top: i % 2 === 1 ? DY : 0,
                    width: CIRCLE,
                    height: CIRCLE,
                    borderRadius: CIRCLE / 2,
                    borderWidth: 2.5,
                    borderColor: '#F2EFE6',
                  }}
                  resizeMode="cover"
                  blurRadius={isEditPending ? 6 : 0}
                />
                {i === displayUrls.length - 1 && extraCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    right: 0, bottom: 0,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: Colors.ink,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: '#F2EFE6',
                  }}>
                    <Text style={{ fontFamily: MONO, fontSize: 8, color: '#fff', fontWeight: '700' }}>+{extraCount}</Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
          {/* Body */}
          <View style={styles.entryBody}>
            <View style={styles.entryTimeRow}>
              <Text style={styles.entryTime}>{time}</Text>
              {kares > 1 && <Text style={styles.entryKareBadge}>· {kares} KARE</Text>}
            </View>
            <Text style={styles.entryTitle} numberOfLines={1}>
              {mealName ?? (photoGroup[0]?.food?.name_tr ?? photoGroup[0]?.food?.name ?? 'Öğün')}
            </Text>
            {ingredients ? (
              <Text style={styles.entryIngredients} numberOfLines={1}>{ingredients}</Text>
            ) : null}
          </View>
          {/* Kcal */}
          <View style={styles.entryRight}>
            <Text style={styles.entryKcal}>{Math.round(totalCal)}</Text>
            <Text style={styles.entryKcalUnit}>KCAL</Text>
          </View>
          {isEditPending && <EditSavingOverlay />}
        </TouchableOpacity>
      );
    }

    const time = new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const foodName = log.food?.name_tr ?? log.food?.name ?? '';
    const abbr = foodName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 5);
    return (
      <View key={log.id} style={styles.entryCard}>
        {/* Colored circle */}
        <View style={[styles.colorCircle, { backgroundColor: entryColor(foodName) }]}>
          <Text style={styles.colorCircleText}>{abbr}</Text>
        </View>
        {/* Body */}
        <View style={styles.entryBody}>
          <Text style={styles.entryTime}>{time}</Text>
          <Text style={styles.entryTitle} numberOfLines={1}>{foodName}</Text>
          <Text style={styles.entryIngredients} numberOfLines={1}>
            {getMealLabel(log.meal_type)} · {log.serving_amount}g
          </Text>
        </View>
        {/* Kcal */}
        <View style={styles.entryRight}>
          <Text style={styles.entryKcal}>{Math.round(log.calories)}</Text>
          <Text style={styles.entryKcalUnit}>KCAL</Text>
        </View>
        {!readonly && (
          <TouchableOpacity onPress={() => removeFoodLog(log.id)} style={styles.entryDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={15} color={Colors.ink4} />
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
            <Text style={styles.heroTagline}>
              {foodLogs.some((l) => l.image_url && (karesCount[l.image_url] ?? 1) > 1)
                ? 'Bir öğün — birden fazla tabak.'
                : 'Her öğün, tek bir kare.'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.heroKcal, { color: totalCaloriesToday > 0 ? Colors.ink : Colors.ink3 }]}>
                {Math.round(totalCaloriesToday)} <Text style={styles.heroKcalUnit}>kcal</Text>
              </Text>
              <Text style={styles.heroSubOverline}>BUGÜN</Text>
            </View>
            <TouchableOpacity style={styles.headerAddBtn} onPress={openAddFlow} activeOpacity={0.82}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.headerAddBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today section */}
        <DaySection
          dateLabel={`Bugün · ${todayLabel.split(' ').slice(0, 2).join(' ')}`}
          mealCount={countMealGroups(foodLogs)}
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
          mealCount={countMealGroups(yesterdayLogs)}
        >
          {yesterdayLogs.length === 0 ? (
            <Text style={styles.emptyDayLine}>Dün hiçbir şey yazmadın.</Text>
          ) : (
            <View style={{ gap: 8, opacity: 0.75 }}>{renderEntries(yesterdayLogs, true)}</View>
          )}
        </DaySection>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Photo flow */}
      <FoodLogFlow
        visible={flowVisible}
        initialImages={flowImages}
        initialStep={flowInitialStep}
        initialItems={flowInitialItems}
        onClose={() => { setFlowVisible(false); setFlowInitialItems(undefined); }}
        onSave={(items, mealType, images, namePromise, imageCount) => {
          setFlowVisible(false);
          setFlowInitialItems(undefined);
          handleSavePhotoMeal(items, mealType, images, namePromise, imageCount);
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
        karesCount={photoDetailGroup[0]?.image_url ? (karesCount[photoDetailGroup[0].image_url] ?? (kareUrls[photoDetailGroup[0].image_url]?.length ?? 1)) : 1}
        allImageUrls={photoDetailGroup[0]?.image_url ? (kareUrls[photoDetailGroup[0].image_url] ?? [photoDetailGroup[0].image_url]) : undefined}
        onNameChange={(name) => {
          const url = photoDetailGroup[0]?.image_url;
          if (url) setMealNames((prev) => ({ ...prev, [url]: name }));
        }}
        isEdited={photoDetailGroup[0]?.image_url ? editedMeals.has(photoDetailGroup[0].image_url) : false}
        onRemoveLog={removeFoodLog}
        onUpdateLog={updateFoodLog}
        onUpdateFoodName={updateFoodName}
        onEditComplete={() => {
          const url = photoDetailGroup[0]?.image_url;
          if (url) {
            setEditedMeals((prev) => {
              const next = new Set(prev);
              next.add(url);
              AsyncStorage.setItem(EDITED_MEALS_KEY, JSON.stringify([...next])).catch(() => {});
              return next;
            });
          }
        }}
        onSavingStateChange={(isSaving) => {
          if (isSaving) {
            const url = photoDetailGroup[0]?.image_url;
            if (url) setPendingEditUrl(url);
          } else {
            setPendingEditUrl(null);
          }
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

// ──────────────────────────── HELPER FUNCTIONS ────────────────────────────
const ENTRY_COLORS = ['#C9945A', '#7A9C4A', '#3A6D8C', '#8B5E83', '#4A8BA4', '#A06B50'];
function entryColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return ENTRY_COLORS[Math.abs(h) % ENTRY_COLORS.length];
}

function countMealGroups(logs: FoodLogWithFood[]): number {
  const seen = new Set<string>();
  let count = 0;
  for (const l of logs) {
    if (l.image_url) { if (!seen.has(l.image_url)) { seen.add(l.image_url); count++; } }
    else count++;
  }
  return count;
}

// ──────────────────────────── DAY SECTION ────────────────────────────
function DaySection({
  dateLabel,
  mealCount,
  active,
  children,
}: {
  dateLabel: string;
  mealCount: number;
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
        {mealCount > 0 && (
          <Text style={styles.daySubtitle}>{mealCount} ÖĞÜN</Text>
        )}
      </View>
      <View style={{ paddingTop: 8 }}>{children}</View>
    </View>
  );
}

// ──────────────────────────── EMPTY DAY ────────────────────────────
function EmptyDay() {
  return (
    <View style={styles.emptyDay}>
      <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
        <Circle cx={28} cy={28} r={27} stroke={Colors.line} strokeWidth={0.6} />
        <G stroke={Colors.ink3} strokeLinecap="round" strokeLinejoin="round">
          {/* Fork — left, tilted -12° around (19, 28) */}
          <G transform="translate(19, 28) rotate(-12)">
            {/* 3 tines */}
            <Line x1={-4} y1={-13} x2={-4} y2={-6} strokeWidth={1.2} />
            <Line x1={0} y1={-13} x2={0} y2={-6} strokeWidth={1.2} />
            <Line x1={4} y1={-13} x2={4} y2={-6} strokeWidth={1.2} />
            {/* Tine base connector */}
            <Line x1={-4} y1={-6} x2={4} y2={-6} strokeWidth={1.2} />
            {/* Handle */}
            <Line x1={0} y1={-6} x2={0} y2={13} strokeWidth={1.4} />
          </G>
          {/* Spoon — right, tilted +12° around (37, 28) */}
          <G transform="translate(37, 28) rotate(12)">
            {/* Bowl */}
            <Ellipse cx={0} cy={-9} rx={4.5} ry={5.5} strokeWidth={1.3} />
            {/* Handle stem from bottom of bowl */}
            <Line x1={0} y1={-3.5} x2={0} y2={13} strokeWidth={1.4} />
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

// ──────────────────────────── EDIT SAVING OVERLAY ────────────────────────────
function EditSavingOverlay() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);

  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[editSavingStyles.overlay, { opacity: fadeIn }]}>
      <Animated.View style={{ transform: [{ rotate: rot }] }}>
        <Ionicons name="sync" size={18} color={Colors.terracotta} />
      </Animated.View>
      <Text style={editSavingStyles.text}>Değişiklikler kaydediliyor…</Text>
    </Animated.View>
  );
}

const editSavingStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
  },
  text: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 14,
    color: '#F2EFE6',
  },
});

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
const PHOTO_ENTRY_WIDTH = SCREEN_WIDTH - 44;
const PHOTO_ENTRY_HEIGHT = Math.round(PHOTO_ENTRY_WIDTH * 0.625); // 16:10 — kırpma yok, dengeli yükseklik

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingTop: 8, paddingBottom: 40 },

  heroRow: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start' },
  heroOverline: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 1.6 },
  heroTitle: { fontFamily: SERIF, fontSize: 36, lineHeight: 46, color: Colors.ink, marginTop: 4 },
  heroTitleAccent: { fontStyle: 'italic', color: Colors.terracotta },
  heroTagline: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: Colors.ink3, marginTop: 4 },
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

  // Entry card (photo & text — shared new design)
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: Colors.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  // Single photo thumbnail
  thumbWrap: { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0 },
  singleThumb: { width: 72, height: 72 },
  // Stacked thumbnails (multi-kare)
  stackedThumbWrap: { width: 86, height: 72, flexShrink: 0, position: 'relative' },
  stackedThumb1: { position: 'absolute', left: 0, top: 6, width: 60, height: 60, borderRadius: 12 },
  stackedThumb2: { position: 'absolute', right: 0, bottom: 6, width: 60, height: 60, borderRadius: 12, borderWidth: 2, borderColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  stackedThumb2Text: { fontFamily: MONO, fontSize: 12, color: '#fff', fontWeight: '700' },
  // Colored circle (no-photo)
  colorCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  colorCircleText: { fontFamily: MONO, fontSize: 9, color: '#fff', letterSpacing: 1, fontWeight: '700', textAlign: 'center' },
  // Entry body
  entryBody: { flex: 1, minWidth: 0 },
  entryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entryTime: { fontFamily: MONO, fontSize: 10.5, color: Colors.ink3, letterSpacing: 0.6 },
  entryKareBadge: { fontFamily: MONO, fontSize: 9, color: Colors.terracotta, letterSpacing: 1 },
  entryTitle: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: Colors.ink, lineHeight: 20, marginTop: 2 },
  entryIngredients: { fontSize: 11, color: Colors.ink3, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 4 },
  entryKcal: { fontFamily: SERIF, fontSize: 22, color: Colors.ink, lineHeight: 24 },
  entryKcalUnit: { fontFamily: MONO, fontSize: 8, color: Colors.ink4, letterSpacing: 1.2, marginTop: 1 },
  entryDeleteBtn: { padding: 4, marginLeft: -4 },

  // Empty day
  emptyDay: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontFamily: SERIF, fontSize: 22, color: Colors.ink },
  emptyTitleAccent: { fontStyle: 'italic', color: Colors.terracotta },
  emptySub: { fontSize: 13, color: Colors.ink3, maxWidth: 240, textAlign: 'center' },

  // Hint card
  hintCard: { marginHorizontal: 22, marginTop: 20, marginBottom: 8, padding: 14, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hintCardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hintCardTitle: { fontSize: 12.5, color: Colors.ink2, lineHeight: 18 },
  hintCardBold: { fontWeight: '700', color: Colors.ink },
  hintCardAccent: { fontFamily: MONO, fontSize: 11, color: Colors.terracotta, letterSpacing: 1 },
  hintCardSub: { fontSize: 12, color: Colors.ink3, marginTop: 2 },

  // Header add button (replaces floating FAB)
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.ink,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },

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
