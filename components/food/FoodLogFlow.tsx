import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, FontSize, MealType } from '../../lib/constants';
import {
  DetectedFoodItem,
  recognizeMealFromImage,
  generateAnalysisQuestions,
  refineAnalysisWithAnswers,
  estimateNutritionFromText,
  generateMealName,
} from '../../lib/gemini';

const { width: SW } = Dimensions.get('window');

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

type Step = 'add' | 'describe' | 'analyzing' | 'results' | 'improve' | 'saving';

interface ItemPlus extends DetectedFoodItem {
  pct: number;
  baseGrams: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
}

interface FoodLogFlowProps {
  visible: boolean;
  initialBase64: string | null;
  initialStep?: Step;
  initialItems?: DetectedFoodItem[];
  onClose: () => void;
  onSave: (items: DetectedFoodItem[], mealType: MealType, base64: string, namePromise?: Promise<string>) => void;
  onStartAnalysis?: (base64: string, hint: string) => void;
  onOpenSearch: () => void;
  onOpenBarcode: () => void;
}

function toItemPlus(d: DetectedFoodItem): ItemPlus {
  return {
    ...d,
    pct: 100,
    baseGrams: d.estimatedGrams,
    baseCalories: d.calories,
    baseProtein: d.protein,
    baseCarbs: d.carbs,
    baseFat: d.fat,
  };
}

function pickMealByHour(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

export function FoodLogFlow({
  visible,
  initialBase64,
  initialStep,
  initialItems,
  onClose,
  onSave,
  onStartAnalysis,
  onOpenSearch,
  onOpenBarcode,
}: FoodLogFlowProps) {
  const [step, setStep] = useState<Step>(initialStep ?? 'add');
  const [base64, setBase64] = useState<string | null>(initialBase64);
  const [hint, setHint] = useState('');
  const [items, setItems] = useState<ItemPlus[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [meal, setMeal] = useState<MealType>(pickMealByHour());

  useEffect(() => {
    if (visible) {
      setBase64(initialBase64);
      setStep(initialStep ?? 'add');
      setHint('');
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems.map(toItemPlus));
      } else {
        setItems([]);
      }
      setAnalysisError(null);
      setQuestions([]);
      setMeal(pickMealByHour());
    }
  }, [visible, initialBase64, initialStep, initialItems]);

  async function handlePickPhoto(source: 'camera' | 'gallery') {
    const reqFn =
      source === 'camera'
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await reqFn();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', source === 'camera' ? 'Kamera izni gerekli.' : 'Galeri izni gerekli.');
      return;
    }
    const launchFn = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launchFn({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0].base64) return;
    setBase64(result.assets[0].base64);
    setStep('describe');
  }

  async function runAnalysis(useHint: string) {
    if (!base64) return;
    if (onStartAnalysis) {
      onStartAnalysis(base64, useHint);
      onClose();
      return;
    }
    setStep('analyzing');
    setAnalysisError(null);
    try {
      const detected = await recognizeMealFromImage(base64, useHint || undefined);
      setItems(detected.map(toItemPlus));
      setStep('results');
    } catch (e) {
      setAnalysisError('Yemek tanınamadı. Lütfen daha net bir fotoğraf çekin.');
      setStep('describe');
    }
  }

  async function reanalyzeWithAnswers(answers: string[]) {
    if (!base64) return;
    setStep('analyzing');
    try {
      const baseItems = items.map<DetectedFoodItem>((it) => ({
        name: it.name,
        estimatedGrams: it.baseGrams,
        calories: it.baseCalories,
        protein: it.baseProtein,
        carbs: it.baseCarbs,
        fat: it.baseFat,
        confidence: it.confidence,
      }));
      const qa = questions.map((q, i) => ({ question: q, answer: answers[i] ?? '' }));
      const refined = await refineAnalysisWithAnswers(base64, baseItems, qa);
      setItems(refined.map(toItemPlus));
      setStep('results');
    } catch {
      Alert.alert('Hata', 'Yeniden analiz başarısız.');
      setStep('results');
    }
  }

  async function openImproveStep() {
    setStep('improve');
    if (questions.length === 0 && items.length > 0) {
      try {
        const baseItems = items.map<DetectedFoodItem>((it) => ({
          name: it.name,
          estimatedGrams: it.baseGrams,
          calories: it.baseCalories,
          protein: it.baseProtein,
          carbs: it.baseCarbs,
          fat: it.baseFat,
          confidence: it.confidence,
        }));
        const qs = await generateAnalysisQuestions(baseItems);
        setQuestions(qs);
      } catch {
        setQuestions([
          'Pişirme yöntemi nedir (fırın, kızartma, haşlama)?',
          'Görünmeyen ek malzeme veya sos var mı?',
          'Porsiyon büyüklüğü hakkında bir notun var mı?',
        ]);
      }
    }
  }

  function handleSaveFromResults() {
    if (!base64 || items.length === 0) return;
    const finalItems: DetectedFoodItem[] = items.map((it) => {
      const f = it.pct / 100;
      return {
        name: it.name,
        estimatedGrams: Math.round(it.baseGrams * f),
        calories: Math.round(it.baseCalories * f),
        protein: Math.round(it.baseProtein * f * 10) / 10,
        carbs: Math.round(it.baseCarbs * f * 10) / 10,
        fat: Math.round(it.baseFat * f * 10) / 10,
        confidence: it.confidence,
      };
    });
    const namePromise = generateMealName(finalItems.map((it) => it.name));
    setStep('saving');
    setTimeout(() => {
      onSave(finalItems, meal, base64, namePromise);
      onClose();
    }, 280);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={s.root}>
        {step === 'add' && (
          <StepAdd
            onClose={onClose}
            onCamera={() => handlePickPhoto('camera')}
            onGallery={() => handlePickPhoto('gallery')}
            onBarcode={onOpenBarcode}
            onSearch={onOpenSearch}
          />
        )}
        {step === 'describe' && (
          <StepDescribe
            base64={base64}
            text={hint}
            onText={setHint}
            error={analysisError}
            onClose={onClose}
            onSkip={() => runAnalysis('')}
            onAnalyze={() => runAnalysis(hint)}
          />
        )}
        {step === 'analyzing' && <StepAnalyzing base64={base64} />}
        {step === 'results' && (
          <StepResults
            base64={base64}
            items={items}
            setItems={setItems}
            meal={meal}
            setMeal={setMeal}
            onClose={onClose}
            onSave={handleSaveFromResults}
            onImprove={openImproveStep}
          />
        )}
        {step === 'improve' && (
          <StepImprove
            base64={base64}
            questions={questions}
            onCancel={() => setStep('results')}
            onReanalyze={reanalyzeWithAnswers}
          />
        )}
        {step === 'saving' && <StepSaving base64={base64} />}
      </View>
    </Modal>
  );
}

// ──────────────────────────── STEP HEADER ────────────────────────────
function StepHeader({
  title,
  onClose,
  rightLabel,
  onRight,
  dark,
}: {
  title: string;
  onClose: () => void;
  rightLabel?: string;
  onRight?: () => void;
  dark?: boolean;
}) {
  const fg = dark ? '#F2EFE6' : Colors.ink;
  return (
    <SafeAreaView edges={['top']} style={[s.headerSafe, dark && { backgroundColor: 'transparent' }]}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={onClose} style={s.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={fg} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: fg }]}>{title}</Text>
        <View style={[s.headerRight]}>
          {rightLabel && onRight ? (
            <TouchableOpacity onPress={onRight}>
              <Text style={[s.headerRightLabel, { color: fg }]}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────── STEP 1: ADD ────────────────────────────
function StepAdd({
  onClose,
  onCamera,
  onGallery,
  onBarcode,
  onSearch,
}: {
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onBarcode: () => void;
  onSearch: () => void;
}) {
  const [query, setQuery] = useState('');
  return (
    <View style={s.fill}>
      <StepHeader title="Yemek Ekle" onClose={onClose} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={s.padX}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={Colors.ink3} />
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                if (t.length >= 2) onSearch();
              }}
              placeholder="Yemek adı yazın…"
              placeholderTextColor={Colors.ink4}
              style={s.searchInput}
            />
          </View>

          <View style={{ marginTop: 32 }}>
            <Text style={s.overline}>FİTBOT İLE TARA</Text>
            <Text style={s.serifTitle}>
              Tabağın <Text style={s.italicAccent}>fotoğrafını</Text> çek.
            </Text>
            <Text style={s.bodyMuted}>FitBot anında tanır, kalori ve makroları çıkarır.</Text>
          </View>

          <View style={s.bigTileRow}>
            <BigTile
              primary
              label="Fotoğraf Çek"
              hint="Kamera ile anında"
              icon="camera"
              onPress={onCamera}
            />
            <BigTile label="Galeriden Seç" hint="Mevcut bir fotoğraf" icon="images" onPress={onGallery} />
          </View>

          <TouchableOpacity onPress={onBarcode} style={s.barcodeRow} activeOpacity={0.85}>
            <View style={s.barcodeIcon}>
              <Ionicons name="barcode" size={20} color={Colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.serifSm}>Barkod Tara</Text>
              <Text style={s.bodyXs}>Paketli ürünler için</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function BigTile({
  icon,
  label,
  hint,
  primary,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const bg = primary ? Colors.ink : Colors.surface;
  const fg = primary ? Colors.background : Colors.ink;
  const iconBg = primary ? Colors.terracotta : Colors.surfaceSecondary;
  const iconFg = primary ? '#fff' : Colors.ink;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        s.bigTile,
        { backgroundColor: bg, borderColor: primary ? 'transparent' : Colors.line },
      ]}
    >
      <View style={[s.bigTileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={26} color={iconFg} />
      </View>
      <View>
        <Text style={[s.bigTileLabel, { color: fg }]}>{label}</Text>
        <Text style={[s.bigTileHint, { color: primary ? '#F2EFE6cc' : Colors.ink3 }]}>{hint}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────── STEP 2: DESCRIBE ────────────────────────────
function StepDescribe({
  base64,
  text,
  onText,
  error,
  onClose,
  onSkip,
  onAnalyze,
}: {
  base64: string | null;
  text: string;
  onText: (t: string) => void;
  error: string | null;
  onClose: () => void;
  onSkip: () => void;
  onAnalyze: () => void;
}) {
  const HINTS = ['+ baharatlı', '+ sade pişmiş', '+ az yağlı', '+ tam porsiyon', '+ yarım porsiyon'];
  return (
    <View style={s.fill}>
      <StepHeader title="Fotoğrafı Analiz Et" onClose={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {base64 && (
            <View style={s.photoStripWrap}>
              <Image source={{ uri: `data:image/jpeg;base64,${base64}` }} style={s.photoStrip} resizeMode="cover" />
              <View style={s.photoStripFade} />
            </View>
          )}
          <View style={s.padX}>
            {error && (
              <View style={s.errorPill}>
                <Ionicons name="alert-circle" size={14} color={Colors.terracotta} />
                <Text style={s.errorPillText}>{error}</Text>
              </View>
            )}
            <Text style={s.overline}>OPSİYONEL</Text>
            <Text style={s.serifTitle}>
              Bu yemeği <Text style={s.italicAccent}>kendi sözlerinle</Text> anlat.
            </Text>
            <Text style={s.bodyMuted}>FitBot daha doğru tanısın diye birkaç ipucu ver. Yazmazsan da olur.</Text>

            <TextInput
              value={text}
              onChangeText={onText}
              placeholder="örn. kazandibi, 2 porsiyon…"
              placeholderTextColor={Colors.ink4}
              multiline
              style={s.textArea}
            />

            <View style={s.chipWrap}>
              {HINTS.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => onText(text ? `${text}, ${h.slice(2)}` : h.slice(2))}
                  style={s.hintChip}
                >
                  <Text style={s.hintChipText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={s.bottomBar}>
          <TouchableOpacity onPress={onSkip} style={s.btnGhost}>
            <Text style={s.btnGhostText}>Atla</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAnalyze} style={s.btnPrimary}>
            <Ionicons name="sparkles" size={14} color={Colors.background} />
            <Text style={s.btnPrimaryText}>Analiz Et</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ──────────────────────────── STEP 3: ANALYZING ────────────────────────────
const PHASES = ['Fotoğraf inceleniyor', 'Yemekler ayrıştırılıyor', 'Porsiyonlar hesaplanıyor', 'Makrolar çıkarılıyor'];

function StepAnalyzing({ base64 }: { base64: string | null }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.linear })
    ).start();
    Animated.loop(
      Animated.timing(beam, { toValue: 1, duration: 2200, useNativeDriver: false, easing: Easing.inOut(Easing.ease) })
    ).start();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return 95;
        const next = p + 1.5 + Math.random() * 2;
        return Math.min(95, next);
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPhase(Math.min(PHASES.length - 1, Math.floor(progress / 25)));
  }, [progress]);

  const beamTop = beam.interpolate({ inputRange: [0, 1], outputRange: ['18%', '78%'] });
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.analyzeRoot}>
      {base64 && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${base64}` }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.32 }]}
          blurRadius={6}
          resizeMode="cover"
        />
      )}
      <Animated.View style={[s.scanBeam, { top: beamTop }]} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }} />
        <View style={s.analyzeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Animated.View style={{ transform: [{ rotate: rot }] }}>
              <Ionicons name="sync" size={20} color={Colors.terracotta} />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={s.analyzeOverline}>FİTBOT ÇALIŞIYOR</Text>
              <Text style={s.analyzePhase}>{PHASES[phase]}…</Text>
            </View>
            <Text style={s.analyzePct}>%{Math.round(progress)}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressBar, { width: `${progress}%` }]} />
          </View>
          <View style={s.phaseTicks}>
            {PHASES.map((_, i) => (
              <Text
                key={i}
                style={[s.phaseTick, { color: i <= phase ? Colors.terracotta : 'rgba(242,239,230,0.3)' }]}
              >
                0{i + 1}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ──────────────────────────── STEP 4: RESULTS ────────────────────────────
const MEAL_OPTIONS: { k: MealType; label: string; when: string; icon: string }[] = [
  { k: 'breakfast', label: 'Kahvaltı', when: '05:00–11:00', icon: '☀' },
  { k: 'lunch', label: 'Öğle', when: '11:00–15:00', icon: '◔' },
  { k: 'snack', label: 'Ara Öğün', when: '15:00–18:00', icon: '☕' },
  { k: 'dinner', label: 'Akşam', when: '18:00–05:00', icon: '☾' },
];

function StepResults({
  base64,
  items,
  setItems,
  meal,
  setMeal,
  onClose,
  onSave,
  onImprove,
}: {
  base64: string | null;
  items: ItemPlus[];
  setItems: React.Dispatch<React.SetStateAction<ItemPlus[]>>;
  meal: MealType;
  setMeal: (m: MealType) => void;
  onClose: () => void;
  onSave: () => void;
  onImprove: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(0);
  const [editingId, setEditingId] = useState<number | null>(null);

  const total = items.reduce((s2, it) => s2 + Math.round(it.baseCalories * it.pct / 100), 0);
  const macros = items.reduce(
    (m, it) => {
      const f = it.pct / 100;
      return { P: m.P + it.baseProtein * f, K: m.K + it.baseCarbs * f, Y: m.Y + it.baseFat * f };
    },
    { P: 0, K: 0, Y: 0 }
  );

  const update = (idx: number, patch: Partial<ItemPlus>) =>
    setItems((s2) => s2.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => setItems((s2) => s2.filter((_, i) => i !== idx));

  const recommendedMeal = pickMealByHour();

  return (
    <View style={s.fill}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {base64 && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${base64}` }}
            style={{ width: SW, height: SW }}
            resizeMode="cover"
          />
        )}

        <View style={s.summaryRow}>
          <View>
            <Text style={s.overline}>{items.length} YİYECEK · TESPİT</Text>
            <Text style={s.heroNum}>
              {total} <Text style={s.heroUnit}>kcal</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <MacroChip label="P" value={`${macros.P.toFixed(0)}g`} color={Colors.protein} />
            <MacroChip label="K" value={`${macros.K.toFixed(0)}g`} color={Colors.carbs} />
            <MacroChip label="Y" value={`${macros.Y.toFixed(0)}g`} color={Colors.fat} />
          </View>
        </View>

        <View style={s.assumeBox}>
          <View style={s.assumeIcon}>
            <Ionicons name="people-outline" size={14} color={Colors.ink} />
          </View>
          <Text style={s.assumeText}>
            FitBot tabağın tamamını <Text style={{ fontWeight: '700' }}>senin yediğini</Text> varsayıyor. Aşağıdan kendi
            payını ayarla.
          </Text>
        </View>

        <View style={[s.padX, { gap: 10 }]}>
          {items.map((it, i) =>
            editingId === i ? (
              <ItemEditCard
                key={i}
                item={it}
                onSave={(patch) => {
                  update(i, patch);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ItemCard
                key={i}
                item={it}
                num={i + 1}
                open={openId === i}
                onToggle={() => setOpenId((o) => (o === i ? null : i))}
                onChangePct={(p) => update(i, { pct: p })}
                onEdit={() => setEditingId(i)}
                onRemove={() => remove(i)}
              />
            )
          )}
        </View>

        <View style={[s.padX, { marginTop: 24 }]}>
          <Text style={s.overline}>HANGİ ÖĞÜNE EKLENSİN?</Text>
          <Text style={s.bodyXs}>
            Önerilen: <Text style={{ color: Colors.ink, fontWeight: '700' }}>
              {MEAL_OPTIONS.find((o) => o.k === recommendedMeal)?.label}
            </Text> — şu anki vaktin öğünü
          </Text>
          <View style={s.mealGrid}>
            {MEAL_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.k}
                onPress={() => setMeal(o.k)}
                activeOpacity={0.85}
                style={[
                  s.mealTile,
                  meal === o.k ? { backgroundColor: Colors.ink, borderColor: 'transparent' } : null,
                ]}
              >
                <Text style={[s.mealIcon, { color: meal === o.k ? Colors.background : Colors.ink }]}>{o.icon}</Text>
                <View>
                  <Text
                    style={[
                      s.mealLabel,
                      { color: meal === o.k ? Colors.background : Colors.ink },
                    ]}
                  >
                    {o.label}
                  </Text>
                  <Text
                    style={[
                      s.mealWhen,
                      { color: meal === o.k ? '#F2EFE6aa' : Colors.ink3 },
                    ]}
                  >
                    {o.when}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={s.floatingResultsHeader}>
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={s.floatingHeaderGradient}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={onClose} style={s.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#F2EFE6" />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: '#F2EFE6' }]}>Analiz Sonuçları</Text>
            <View style={s.headerRight}>
              <TouchableOpacity onPress={onImprove}>
                <Text style={[s.headerRightLabel, { color: '#F2EFE6' }]}>↻ YENİDEN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={s.resultsBottom}>
        <TouchableOpacity onPress={onImprove} style={s.btnGhostSm}>
          <Ionicons name="sparkles-outline" size={12} color={Colors.ink2} />
          <Text style={s.btnGhostSmText}>AI Yenile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} style={s.btnPrimaryFlex}>
          <Ionicons name="checkmark" size={16} color={Colors.background} />
          <Text style={s.btnPrimaryText}>Günlüğe Ekle</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.macroChip, { backgroundColor: `${color}33`, borderColor: `${color}40` }]}>
      <Text style={s.macroChipLabel}>{label}</Text>
      <Text style={s.macroChipValue}>{value}</Text>
    </View>
  );
}

function ItemCard({
  item,
  num,
  open,
  onToggle,
  onChangePct,
  onEdit,
  onRemove,
}: {
  item: ItemPlus;
  num: number;
  open: boolean;
  onToggle: () => void;
  onChangePct: (p: number) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const adjKcal = Math.round((item.baseCalories * item.pct) / 100);
  const adjP = ((item.baseProtein * item.pct) / 100).toFixed(1);
  const adjK = ((item.baseCarbs * item.pct) / 100).toFixed(1);
  const adjY = ((item.baseFat * item.pct) / 100).toFixed(1);
  const presets = [25, 50, 75, 100];

  return (
    <View style={s.itemCard}>
      <TouchableOpacity onPress={onToggle} style={s.itemHead} activeOpacity={0.85}>
        <View style={s.itemNumDot}>
          <Text style={s.itemNumDotText}>{num}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={s.itemMeta}>
            ~{Math.round((item.baseGrams * item.pct) / 100)}g · %{item.pct}
          </Text>
        </View>
        <Text style={s.itemKcal}>{adjKcal} kcal</Text>
        <Text style={[s.itemChevron, { transform: [{ rotate: open ? '180deg' : '0deg' }] }]}>⌄</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.itemBody}>
          <View style={s.rowBetween}>
            <Text style={s.overlineSm}>NE KADARINI YEDİN?</Text>
            <Text style={s.itemPctLabel}>%{item.pct}</Text>
          </View>
          <View style={s.presetRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => onChangePct(p)}
                style={[
                  s.presetChip,
                  item.pct === p && { backgroundColor: Colors.ink, borderColor: 'transparent' },
                ]}
              >
                <Text style={[s.presetChipText, item.pct === p && { color: Colors.background }]}>
                  {p === 100 ? 'Hepsi' : `%${p}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.stepperRow}>
            <TouchableOpacity onPress={() => onChangePct(Math.max(5, item.pct - 10))} style={s.stepBtn}>
              <Text style={s.stepBtnText}>−10</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onChangePct(Math.max(5, item.pct - 5))} style={s.stepBtn}>
              <Text style={s.stepBtnText}>−5</Text>
            </TouchableOpacity>
            <View style={s.stepTrack}>
              <View style={[s.stepFill, { width: `${Math.min(100, item.pct)}%` }]} />
            </View>
            <TouchableOpacity onPress={() => onChangePct(Math.min(200, item.pct + 5))} style={s.stepBtn}>
              <Text style={s.stepBtnText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onChangePct(Math.min(200, item.pct + 10))} style={s.stepBtn}>
              <Text style={s.stepBtnText}>+10</Text>
            </TouchableOpacity>
          </View>

          <View style={s.macroTileRow}>
            <MacroTile label="PROTEIN" value={`${adjP}g`} color={Colors.protein} />
            <MacroTile label="KARB" value={`${adjK}g`} color={Colors.carbs} />
            <MacroTile label="YAĞ" value={`${adjY}g`} color={Colors.fat} />
          </View>

          <View style={s.itemActions}>
            <TouchableOpacity onPress={onEdit} style={[s.actionPill, { backgroundColor: `${Colors.fat}22` }]}>
              <Ionicons name="create-outline" size={12} color={Colors.ink} />
              <Text style={s.actionPillText}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRemove} style={[s.actionPill, { backgroundColor: `${Colors.error}22` }]}>
              <Ionicons name="trash-outline" size={12} color={Colors.ink} />
              <Text style={s.actionPillText}>Kaldır</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.macroTile, { backgroundColor: `${color}22` }]}>
      <Text style={s.macroTileValue}>{value}</Text>
      <Text style={s.macroTileLabel}>{label}</Text>
    </View>
  );
}

function ItemEditCard({
  item,
  onSave,
  onCancel,
}: {
  item: ItemPlus;
  onSave: (patch: Partial<ItemPlus>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [grams, setGrams] = useState<number>(item.baseGrams);
  const [kcal, setKcal] = useState<number>(item.baseCalories);
  const [P, setP] = useState<number>(item.baseProtein);
  const [K, setK] = useState<number>(item.baseCarbs);
  const [Y, setY] = useState<number>(item.baseFat);
  const [estimating, setEstimating] = useState(false);
  const presets = [50, 100, 150, 200, 300];

  async function aiEstimate() {
    if (!name.trim() || grams <= 0) return;
    setEstimating(true);
    try {
      const r = await estimateNutritionFromText({ foodName: name.trim(), grams });
      setKcal(Math.round(r.calories));
      setP(Math.round(r.protein * 10) / 10);
      setK(Math.round(r.carbs * 10) / 10);
      setY(Math.round(r.fat * 10) / 10);
    } catch {
      Alert.alert('Hata', 'Tahmin alınamadı.');
    } finally {
      setEstimating(false);
    }
  }

  return (
    <View style={s.editCard}>
      <Field label="İsim">
        <TextInput value={name} onChangeText={setName} style={s.input} placeholderTextColor={Colors.ink4} />
      </Field>
      <Field label="Miktar (gram)">
        <View style={s.gramRow}>
          <TouchableOpacity onPress={() => setGrams((g) => Math.max(5, g - 10))} style={s.iconBtn}>
            <Text style={s.iconBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.gramNum}>
            {grams}
            <Text style={s.gramUnit}> g</Text>
          </Text>
          <TouchableOpacity onPress={() => setGrams((g) => g + 10)} style={s.iconBtn}>
            <Text style={s.iconBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
        <View style={s.gramPresetRow}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setGrams(p)}
              style={[
                s.gramPreset,
                grams === p && { backgroundColor: Colors.ink, borderColor: 'transparent' },
              ]}
            >
              <Text style={[s.gramPresetText, grams === p && { color: Colors.background }]}>{p}g</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>
      <TouchableOpacity onPress={aiEstimate} disabled={estimating} style={s.aiEstimateBtn}>
        {estimating ? (
          <ActivityIndicator size="small" color={Colors.ink} />
        ) : (
          <Ionicons name="sparkles" size={12} color={Colors.ink} />
        )}
        <Text style={s.aiEstimateText}>AI ile Makroları Hesapla</Text>
      </TouchableOpacity>
      <Field label="Kalori">
        <TextInput
          value={String(kcal)}
          onChangeText={(t) => setKcal(parseFloat(t) || 0)}
          keyboardType="numeric"
          style={s.input}
        />
      </Field>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="P (g)" tight>
            <TextInput
              value={String(P)}
              onChangeText={(t) => setP(parseFloat(t) || 0)}
              keyboardType="numeric"
              style={s.input}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="K (g)" tight>
            <TextInput
              value={String(K)}
              onChangeText={(t) => setK(parseFloat(t) || 0)}
              keyboardType="numeric"
              style={s.input}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Y (g)" tight>
            <TextInput
              value={String(Y)}
              onChangeText={(t) => setY(parseFloat(t) || 0)}
              keyboardType="numeric"
              style={s.input}
            />
          </Field>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={onCancel} style={[s.btnGhost, { flex: 1 }]}>
          <Text style={s.btnGhostText}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            onSave({
              name,
              baseGrams: grams,
              baseCalories: kcal,
              baseProtein: P,
              baseCarbs: K,
              baseFat: Y,
              estimatedGrams: grams,
              calories: kcal,
              protein: P,
              carbs: K,
              fat: Y,
              pct: 100,
            })
          }
          style={[s.btnPrimary, { flex: 2 }]}
        >
          <Text style={s.btnPrimaryText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, children, tight }: { label: string; children: React.ReactNode; tight?: boolean }) {
  return (
    <View style={{ marginBottom: tight ? 0 : 4 }}>
      <Text style={[s.overlineSm, { marginBottom: tight ? 4 : 6 }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// ──────────────────────────── STEP 5: IMPROVE ────────────────────────────
function StepImprove({
  base64,
  questions,
  onCancel,
  onReanalyze,
}: {
  base64: string | null;
  questions: string[];
  onCancel: () => void;
  onReanalyze: (answers: string[]) => void;
}) {
  const [answers, setAnswers] = useState<string[]>([]);
  useEffect(() => {
    setAnswers(questions.map(() => ''));
  }, [questions]);

  return (
    <View style={s.fill}>
      <StepHeader title="Analizi İyileştir" onClose={onCancel} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
          {base64 && (
            <View style={s.photoStripWrap}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${base64}` }}
                style={s.photoStrip}
                resizeMode="cover"
              />
              <View style={s.photoStripFade} />
            </View>
          )}
          <View style={s.padX}>
            <Text style={s.overline}>FİTBOT MERAK EDİYOR</Text>
            <Text style={s.serifTitle}>
              Daha iyi analiz için <Text style={s.italicAccent}>birkaç soru</Text>.
            </Text>
            <Text style={s.bodyMuted}>Cevaplarına göre yeni bir analiz yapacağım.</Text>

            {questions.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.ink} />
                <Text style={[s.bodyMuted, { marginTop: 12 }]}>Sorular hazırlanıyor…</Text>
              </View>
            ) : (
              <View style={{ marginTop: 16, gap: 12 }}>
                {questions.map((q, i) => (
                  <View key={i} style={s.questionCard}>
                    <Text style={s.questionText}>{q}</Text>
                    <TextInput
                      value={answers[i] ?? ''}
                      onChangeText={(t) =>
                        setAnswers((s2) => {
                          const c = [...s2];
                          c[i] = t;
                          return c;
                        })
                      }
                      placeholder="Cevabınız…"
                      placeholderTextColor={Colors.ink4}
                      multiline
                      style={s.questionInput}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={s.bottomBar}>
          <TouchableOpacity onPress={onCancel} style={s.btnGhost}>
            <Text style={s.btnGhostText}>Vazgeç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReanalyze(answers)}
            style={s.btnPrimary}
            disabled={questions.length === 0}
          >
            <Text style={s.btnPrimaryText}>Yeniden Analiz Et</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ──────────────────────────── STEP 6: SAVING ────────────────────────────
function StepSaving({ base64 }: { base64: string | null }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => Math.min(100, p + 8));
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={[s.fill, { backgroundColor: 'rgba(23,32,26,0.5)' }]}>
      {base64 && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${base64}` }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.4 }]}
          blurRadius={10}
        />
      )}
      <View style={s.savingCardWrap}>
        <View style={s.savingCard}>
          <Text style={s.savingTitle}>Kaydediliyor</Text>
          <Text style={s.savingSub}>Besinler günlüğe yazılıyor…</Text>
          <Text style={s.savingPct}>%{progress}</Text>
          <View style={s.savingTrack}>
            <View style={[s.savingFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────── STYLES ────────────────────────────
const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  root: { flex: 1, backgroundColor: Colors.background },
  padX: { paddingHorizontal: 22 },

  headerSafe: { backgroundColor: Colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, justifyContent: 'space-between' },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 17 },
  headerRight: { minWidth: 32, alignItems: 'flex-end' },
  headerRightLabel: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: Colors.ink, padding: 0 },

  overline: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 1.8 },
  overlineSm: { fontFamily: MONO, fontSize: 9, color: Colors.ink3, letterSpacing: 1.4 },
  serifTitle: { fontFamily: SERIF, fontSize: 26, lineHeight: 30, color: Colors.ink, marginTop: 4 },
  italicAccent: { fontStyle: 'italic', color: Colors.terracotta },
  bodyMuted: { fontSize: 12.5, color: Colors.ink3, marginTop: 6, lineHeight: 18 },
  bodyXs: { fontSize: 11.5, color: Colors.ink3, marginTop: 4 },

  bigTileRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  bigTile: { flex: 1, padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 12, minHeight: 130 },
  bigTileIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bigTileLabel: { fontFamily: SERIF, fontSize: 18 },
  bigTileHint: { fontSize: 11, marginTop: 4 },

  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  barcodeIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  serifSm: { fontFamily: SERIF, fontSize: 16, color: Colors.ink },
  chevron: { fontFamily: SERIF, fontSize: 22, color: Colors.ink4 },

  photoStripWrap: { height: 200, backgroundColor: '#2a1f16', position: 'relative', overflow: 'hidden' },
  photoStrip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  photoStripFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, backgroundColor: Colors.background, opacity: 0.95 },

  textArea: { marginTop: 16, minHeight: 96, padding: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', color: Colors.ink, textAlignVertical: 'top' },
  chipWrap: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hintChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  hintChipText: { fontSize: 12, color: Colors.ink2 },

  errorPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${Colors.terracotta}22`, marginBottom: 12 },
  errorPillText: { fontSize: 12, color: Colors.terracotta, fontWeight: '600' },

  bottomBar: { flexDirection: 'row', gap: 10, padding: 18, paddingBottom: 30, backgroundColor: Colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line, alignItems: 'center' },
  btnGhost: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { fontFamily: SERIF, fontSize: 14, color: Colors.ink2 },
  btnPrimary: { flex: 1, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnPrimaryText: { fontFamily: SERIF, fontSize: 14, color: Colors.background },

  // Analyzing
  analyzeRoot: { flex: 1, backgroundColor: Colors.background },
  scanBeam: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: Colors.terracotta, shadowColor: Colors.terracotta, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  analyzeCard: { marginHorizontal: 22, marginBottom: 38, padding: 18, borderRadius: 22, backgroundColor: 'rgba(23,32,26,0.92)' },
  analyzeOverline: { fontFamily: MONO, fontSize: 9.5, color: '#F2EFE688', letterSpacing: 1.8 },
  analyzePhase: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: '#F2EFE6', marginTop: 2 },
  analyzePct: { fontFamily: MONO, fontSize: 14, color: '#F2EFE6', letterSpacing: 0.6 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.terracotta },
  phaseTicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  phaseTick: { fontFamily: MONO, fontSize: 8, letterSpacing: 1.2 },

  // Results
  floatingResultsHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  floatingHeaderGradient: { paddingBottom: 20 },

  summaryRow: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroNum: { fontFamily: SERIF, fontSize: 38, lineHeight: 40, color: Colors.ink, marginTop: 4 },
  heroUnit: { fontFamily: MONO, fontSize: 14, color: Colors.ink3, letterSpacing: 1 },
  macroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  macroChipLabel: { fontFamily: MONO, fontSize: 11, color: Colors.ink, opacity: 0.55 },
  macroChipValue: { fontFamily: MONO, fontSize: 11, color: Colors.ink, fontWeight: '600' },

  assumeBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: 22, marginTop: 14, marginBottom: 8, padding: 12, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  assumeIcon: { width: 26, height: 26, borderRadius: 99, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  assumeText: { flex: 1, fontSize: 12.5, color: Colors.ink2, lineHeight: 18 },

  itemCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, overflow: 'hidden' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  itemNumDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  itemNumDotText: { fontFamily: MONO, fontSize: 10, color: Colors.background },
  itemName: { fontFamily: SERIF, fontSize: 16, color: Colors.ink, lineHeight: 19 },
  itemMeta: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.6, marginTop: 2 },
  itemKcal: { fontFamily: MONO, fontSize: 13, color: Colors.ink, letterSpacing: 0.4 },
  itemChevron: { color: Colors.ink3, fontSize: 14 },
  itemBody: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPctLabel: { fontFamily: MONO, fontSize: 11, color: Colors.terracotta, letterSpacing: 0.6 },
  presetRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  presetChip: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  presetChipText: { fontFamily: SERIF, fontSize: 12, color: Colors.ink2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  stepBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  stepBtnText: { fontFamily: MONO, fontSize: 10, color: Colors.ink2, letterSpacing: 0.4 },
  stepTrack: { flex: 1, height: 4, backgroundColor: Colors.surfaceSecondary, borderRadius: 99, overflow: 'hidden' },
  stepFill: { height: '100%', backgroundColor: Colors.ink, borderRadius: 99 },

  macroTileRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  macroTile: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center' },
  macroTileValue: { fontFamily: SERIF, fontSize: 18, color: Colors.ink, lineHeight: 20 },
  macroTileLabel: { fontFamily: MONO, fontSize: 8.5, color: Colors.ink2, letterSpacing: 1.4, marginTop: 4 },

  itemActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  actionPillText: { fontFamily: SERIF, fontSize: 11.5, color: Colors.ink },

  mealGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTile: { width: (SW - 22 * 2 - 8) / 2, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIcon: { fontSize: 18 },
  mealLabel: { fontFamily: SERIF, fontSize: 14 },
  mealWhen: { fontFamily: MONO, fontSize: 9, letterSpacing: 1, marginTop: 3 },

  resultsBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 28, backgroundColor: Colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line },
  btnGhostSm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  btnGhostSmText: { fontFamily: SERIF, fontSize: 12, color: Colors.ink2 },
  btnPrimaryFlex: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.ink },

  // Edit
  editCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, padding: 16, gap: 14 },
  input: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, backgroundColor: Colors.background, fontFamily: SERIF, fontSize: 14, color: Colors.ink },
  gramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  iconBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 18, color: Colors.ink, fontFamily: SERIF },
  gramNum: { fontFamily: SERIF, fontSize: 30, lineHeight: 32, color: Colors.ink },
  gramUnit: { fontFamily: MONO, fontSize: 11, color: Colors.ink3, letterSpacing: 0.6 },
  gramPresetRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  gramPreset: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  gramPresetText: { fontFamily: MONO, fontSize: 11, color: Colors.ink2 },
  aiEstimateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999, backgroundColor: `${Colors.primary}22`, borderWidth: StyleSheet.hairlineWidth, borderColor: `${Colors.primary}33` },
  aiEstimateText: { fontFamily: SERIF, fontSize: 12.5, color: Colors.ink },

  // Improve
  questionCard: { padding: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  questionText: { fontFamily: SERIF, fontSize: 14, color: Colors.ink, lineHeight: 19 },
  questionInput: { marginTop: 10, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, backgroundColor: Colors.background, fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: Colors.ink, minHeight: 44, textAlignVertical: 'top' },

  // Saving
  savingCardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  savingCard: { width: 240, padding: 22, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  savingTitle: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: '#F2EFE6' },
  savingSub: { fontSize: 12, color: '#F2EFE6cc', marginTop: 6 },
  savingPct: { fontFamily: MONO, fontSize: 24, color: '#F2EFE6', marginTop: 22, letterSpacing: 1 },
  savingTrack: { width: '100%', marginTop: 14, height: 3, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99, overflow: 'hidden' },
  savingFill: { height: '100%', backgroundColor: '#F2EFE6' },
});
