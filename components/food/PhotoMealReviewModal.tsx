import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, MealType } from '../../lib/constants';
import {
  DetectedFoodItem,
  generateAnalysisQuestions,
  refineAnalysisWithAnswers,
  estimateNutritionFromText,
} from '../../lib/gemini';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.6);

// Şu anki saate göre önerilen öğünü belirle
function getSuggestedMeal(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

const MEAL_OPTIONS: { key: MealType; label: string; icon: string; hours: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: 'sunny-outline', hours: '05:00–11:00' },
  { key: 'lunch', label: 'Öğle', icon: 'partly-sunny-outline', hours: '11:00–15:00' },
  { key: 'snack', label: 'Ara Öğün', icon: 'cafe-outline', hours: '15:00–18:00' },
  { key: 'dinner', label: 'Akşam', icon: 'moon-outline', hours: '18:00–05:00' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  items: DetectedFoodItem[];
  imageBase64: string | null;
  onSave: (items: DetectedFoodItem[], mealType: MealType) => Promise<void>;
}

type ViewMode = 'review' | 'reanalysis';

// Her item için porsiyon yüzdesi (0-100)
type Portions = Record<number, number>;

export function PhotoMealReviewModal({ visible, onClose, items: initialItems, imageBase64, onSave }: Props) {
  const [items, setItems] = useState<DetectedFoodItem[]>([]);
  const [portions, setPortions] = useState<Portions>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  type EditDraft = { name: string; estimatedGrams: string; calories: string; protein: string; carbs: string; fat: string };
  const [editDraft, setEditDraft] = useState<EditDraft>({ name: '', estimatedGrams: '', calories: '', protein: '', carbs: '', fat: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: '', estimatedGrams: '100', calories: '0', protein: '0', carbs: '0', fat: '0' });
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [estimatingEditMacros, setEstimatingEditMacros] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [reanalysisQuestions, setReanalysisQuestions] = useState<string[]>([]);
  const [reanalysisAnswers, setReanalysisAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getSuggestedMeal());

  React.useEffect(() => {
    if (visible) {
      setItems(initialItems);
      // Başlangıçta tüm porsiyonlar %100
      const initPortions: Portions = {};
      initialItems.forEach((_, i) => { initPortions[i] = 100; });
      setPortions(initPortions);
      setExpandedIndex(null);
      setEditingIndex(null);
      setShowAddForm(false);
      setViewMode('review');
      setSelectedMeal(getSuggestedMeal());
    }
  }, [visible, initialItems]);

  function getPortion(index: number) {
    return portions[index] ?? 100;
  }

  function setPortionValue(index: number, value: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setPortions((prev) => ({ ...prev, [index]: clamped }));
  }

  // Porsiyona göre ölçeklendirilen değerleri hesapla
  function getScaledItem(item: DetectedFoodItem, index: number): DetectedFoodItem {
    const pct = getPortion(index) / 100;
    return {
      ...item,
      estimatedGrams: Math.round(item.estimatedGrams * pct),
      calories: Math.round(item.calories * pct),
      protein: Math.round(item.protein * pct * 10) / 10,
      carbs: Math.round(item.carbs * pct * 10) / 10,
      fat: Math.round(item.fat * pct * 10) / 10,
    };
  }

  const scaledTotals = items.reduce(
    (acc, item, i) => {
      const pct = getPortion(i) / 100;
      return {
        calories: acc.calories + item.calories * pct,
        protein: acc.protein + item.protein * pct,
        carbs: acc.carbs + item.carbs * pct,
        fat: acc.fat + item.fat * pct,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function startEdit(index: number) {
    const item = items[index];
    setEditDraft({
      name: item.name,
      estimatedGrams: String(item.estimatedGrams),
      calories: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
    });
    setEditingIndex(index);
    setExpandedIndex(index);
  }

  async function estimateEditMacros() {
    const name = editDraft.name.trim();
    const grams = parseFloat(editDraft.estimatedGrams);
    if (!name) { Alert.alert('Eksik Bilgi', 'Önce yiyecek adını girin.'); return; }
    if (!grams || grams <= 0) { Alert.alert('Eksik Bilgi', 'Geçerli bir gram değeri girin.'); return; }
    setEstimatingEditMacros(true);
    try {
      const result = await estimateNutritionFromText({ foodName: name, grams });
      setEditDraft((d) => ({
        ...d,
        calories: String(Math.round(result.calories)),
        protein: String(Math.round(result.protein * 10) / 10),
        carbs: String(Math.round(result.carbs * 10) / 10),
        fat: String(Math.round(result.fat * 10) / 10),
      }));
    } catch {
      Alert.alert('Hata', 'Besin değerleri hesaplanamadı. Lütfen manuel girin.');
    } finally {
      setEstimatingEditMacros(false);
    }
  }

  function commitEdit() {
    if (editingIndex === null) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === editingIndex
          ? {
              ...item,
              name: editDraft.name || item.name,
              estimatedGrams: parseFloat(editDraft.estimatedGrams) || item.estimatedGrams,
              calories: parseFloat(editDraft.calories) || item.calories,
              protein: parseFloat(editDraft.protein) || item.protein,
              carbs: parseFloat(editDraft.carbs) || item.carbs,
              fat: parseFloat(editDraft.fat) || item.fat,
            }
          : item
      )
    );
    setEditingIndex(null);
  }

  function removeItem(index: number) {
    Alert.alert('Sil', 'Bu yiyeceği listeden çıkarmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((_, i) => i !== index));
          setPortions((prev) => {
            const next: Portions = {};
            Object.entries(prev).forEach(([k, v]) => {
              const ki = parseInt(k);
              if (ki < index) next[ki] = v;
              else if (ki > index) next[ki - 1] = v;
            });
            return next;
          });
          if (expandedIndex === index) setExpandedIndex(null);
          if (editingIndex === index) setEditingIndex(null);
        },
      },
    ]);
  }

  function commitAddItem() {
    const grams = parseFloat(addDraft.estimatedGrams) || 100;
    const newItem: DetectedFoodItem = {
      name: addDraft.name || 'Yeni Besin',
      estimatedGrams: grams,
      calories: parseFloat(addDraft.calories) || 0,
      protein: parseFloat(addDraft.protein) || 0,
      carbs: parseFloat(addDraft.carbs) || 0,
      fat: parseFloat(addDraft.fat) || 0,
      confidence: 1,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      setPortions((p) => ({ ...p, [next.length - 1]: 100 }));
      return next;
    });
    setAddDraft({ name: '', estimatedGrams: '100', calories: '0', protein: '0', carbs: '0', fat: '0' });
    setShowAddForm(false);
  }

  async function handleEstimateNutrition() {
    const name = addDraft.name.trim();
    const grams = parseFloat(addDraft.estimatedGrams);
    if (!name) { Alert.alert('Eksik Bilgi', 'Önce yiyecek adını girin.'); return; }
    if (!grams || grams <= 0) { Alert.alert('Eksik Bilgi', 'Geçerli bir gram değeri girin.'); return; }
    setEstimatingNutrition(true);
    try {
      const result = await estimateNutritionFromText({ foodName: name, grams });
      setAddDraft((d) => ({
        ...d,
        calories: String(Math.round(result.calories)),
        protein: String(Math.round(result.protein * 10) / 10),
        carbs: String(Math.round(result.carbs * 10) / 10),
        fat: String(Math.round(result.fat * 10) / 10),
      }));
    } catch {
      Alert.alert('Hata', 'Besin değerleri hesaplanamadı. Lütfen manuel girin.');
    } finally {
      setEstimatingNutrition(false);
    }
  }

  async function startReanalysis() {
    setLoadingQuestions(true);
    setViewMode('reanalysis');
    try {
      const questions = await generateAnalysisQuestions(items);
      setReanalysisQuestions(questions);
      setReanalysisAnswers(questions.map(() => ''));
    } catch {
      Alert.alert('Hata', 'Sorular yüklenemedi.');
      setViewMode('review');
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function submitReanalysis() {
    if (!imageBase64) return;
    setReanalyzing(true);
    try {
      const qa = reanalysisQuestions.map((q, i) => ({ question: q, answer: reanalysisAnswers[i] ?? '' }));
      const newItems = await refineAnalysisWithAnswers(imageBase64, items, qa);
      const initPortions: Portions = {};
      newItems.forEach((_, i) => { initPortions[i] = 100; });
      setPortions(initPortions);
      setItems(newItems);
      setViewMode('review');
      setExpandedIndex(null);
    } catch {
      Alert.alert('Hata', 'Analiz yenilenemedi. Lütfen tekrar deneyin.');
    } finally {
      setReanalyzing(false);
    }
  }

  function handleMealSelect(meal: MealType) {
    const suggested = getSuggestedMeal();
    if (meal !== suggested) {
      const suggLabel = MEAL_OPTIONS.find((m) => m.key === suggested)?.label ?? suggested;
      const selLabel = MEAL_OPTIONS.find((m) => m.key === meal)?.label ?? meal;
      Alert.alert(
        'Farklı Öğün Seçiyorsun',
        `Şu an ${suggLabel} saatindesin ama ${selLabel} öğününü seçiyorsun. Düzenli kayıt için öğün vakti geldiğinde fotoğraf çekmen önerilir.\n\nYine de ${selLabel} olarak kaydetmek istiyor musun?`,
        [
          { text: 'Hayır, değiştir', style: 'cancel' },
          { text: `Evet, ${selLabel}`, onPress: () => setSelectedMeal(meal) },
        ]
      );
    } else {
      setSelectedMeal(meal);
    }
  }

  async function handleSave() {
    if (items.length === 0) { Alert.alert('Uyarı', 'Kaydedilecek yiyecek yok.'); return; }
    setSaving(true);
    try {
      const scaledItems = items.map((item, i) => getScaledItem(item, i)).filter((item) => item.calories > 0 || item.estimatedGrams > 0);
      await onSave(scaledItems, selectedMeal);
    } finally {
      setSaving(false);
    }
  }

  const suggestedMeal = getSuggestedMeal();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Sabit Header — kaydırmadan etkilenmiyor */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {viewMode === 'reanalysis' ? 'Analizi İyileştir' : 'Analiz Sonuçları'}
          </Text>
          {viewMode === 'review' ? (
            <TouchableOpacity onPress={startReanalysis} style={styles.headerBtn} disabled={loadingQuestions}>
              <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Fotoğraf */}
            {imageBase64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                style={styles.photo}
                resizeMode="cover"
              />
            )}

            {/* Re-analysis */}
            {viewMode === 'reanalysis' && (
              <View style={styles.reanalysisSection}>
                {loadingQuestions ? (
                  <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loaderText}>Sorular hazırlanıyor...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.reanalysisTitle}>Daha iyi analiz için birkaç soru</Text>
                    <Text style={styles.reanalysisSubtitle}>Cevaplarınıza göre AI yeni bir analiz yapacak.</Text>
                    {reanalysisQuestions.map((q, i) => (
                      <View key={i} style={styles.questionCard}>
                        <Text style={styles.questionText}>{q}</Text>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Cevabınız..."
                          placeholderTextColor={Colors.textMuted}
                          value={reanalysisAnswers[i]}
                          onChangeText={(v) => setReanalysisAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
                          multiline
                        />
                      </View>
                    ))}
                    <View style={styles.reanalysisActions}>
                      <TouchableOpacity style={styles.cancelReanalysisBtn} onPress={() => setViewMode('review')}>
                        <Text style={styles.cancelReanalysisText}>Vazgeç</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitReanalysisBtn, reanalyzing && { opacity: 0.6 }]}
                        onPress={submitReanalysis} disabled={reanalyzing}
                      >
                        {reanalyzing ? (
                          <ActivityIndicator size="small" color={Colors.textLight} />
                        ) : (
                          <Text style={styles.submitReanalysisText}>Yeniden Analiz Et</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Review view */}
            {viewMode === 'review' && (
              <>
                {/* Özet bar */}
                <View style={styles.summaryBar}>
                  <View>
                    <Text style={styles.summaryCount}>{items.length} yiyecek tespit edildi</Text>
                    <Text style={styles.summaryCalories}>{Math.round(scaledTotals.calories)} kcal</Text>
                  </View>
                  <View style={styles.summaryMacros}>
                    <MacroPill label="P" value={Math.round(scaledTotals.protein)} color={Colors.protein} />
                    <MacroPill label="K" value={Math.round(scaledTotals.carbs)} color={Colors.carbs} />
                    <MacroPill label="Y" value={Math.round(scaledTotals.fat)} color={Colors.fat} />
                  </View>
                </View>

                {/* Porsiyon Açıklaması */}
                <View style={styles.portionHintCard}>
                  <Ionicons name="people-outline" size={18} color={Colors.primary} />
                  <Text style={styles.portionHintText}>
                    AI tüm porsiyonu senin yediğini varsayıyor. Kendi payını aşağıdan ayarla.
                  </Text>
                </View>

                {/* Yiyecek Listesi */}
                <View style={styles.itemsList}>
                  {items.map((item, index) => {
                    const pct = getPortion(index);
                    const scaled = getScaledItem(item, index);
                    return (
                      <View key={index} style={styles.itemCard}>
                        {editingIndex === index ? (
                          <View style={styles.editForm}>
                            <Text style={styles.editLabel}>İsim</Text>
                            <TextInput
                              style={styles.editInput} value={editDraft.name}
                              onChangeText={(v) => setEditDraft((d) => ({ ...d, name: v }))} placeholder="Yiyecek adı"
                            />

                            <Text style={[styles.editLabel, { marginTop: Spacing.xs }]}>
                              Gram — {editDraft.estimatedGrams}g
                            </Text>
                            <SliderControl
                              min={10} max={600}
                              value={parseFloat(editDraft.estimatedGrams) || 100}
                              onChange={(v) => setEditDraft((d) => ({ ...d, estimatedGrams: String(v) }))}
                              unit="g"
                            />

                            {/* AI Makro Hesapla */}
                            <TouchableOpacity
                              style={[styles.aiEstimateEditBtn, estimatingEditMacros && { opacity: 0.6 }]}
                              onPress={estimateEditMacros}
                              disabled={estimatingEditMacros}
                            >
                              {estimatingEditMacros ? (
                                <><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.aiEstimateEditText}>Hesaplanıyor...</Text></>
                              ) : (
                                <><Ionicons name="sparkles-outline" size={15} color={Colors.primary} /><Text style={styles.aiEstimateEditText}>AI ile Makroları Hesapla</Text></>
                              )}
                            </TouchableOpacity>

                            <View style={styles.editRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editLabel}>Kalori</Text>
                                <TextInput style={styles.editInput} value={editDraft.calories}
                                  onChangeText={(v) => setEditDraft((d) => ({ ...d, calories: v }))} keyboardType="numeric" />
                              </View>
                            </View>
                            <View style={styles.editRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editLabel}>Protein (g)</Text>
                                <TextInput style={styles.editInput} value={editDraft.protein}
                                  onChangeText={(v) => setEditDraft((d) => ({ ...d, protein: v }))} keyboardType="numeric" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editLabel}>Karb (g)</Text>
                                <TextInput style={styles.editInput} value={editDraft.carbs}
                                  onChangeText={(v) => setEditDraft((d) => ({ ...d, carbs: v }))} keyboardType="numeric" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editLabel}>Yağ (g)</Text>
                                <TextInput style={styles.editInput} value={editDraft.fat}
                                  onChangeText={(v) => setEditDraft((d) => ({ ...d, fat: v }))} keyboardType="numeric" />
                              </View>
                            </View>
                            <View style={styles.editActions}>
                              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingIndex(null)}>
                                <Text style={styles.editCancelText}>İptal</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.editSaveBtn} onPress={commitEdit}>
                                <Text style={styles.editSaveText}>Kaydet</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.itemHeader}
                              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.itemHeaderLeft}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemGram}>~{item.estimatedGrams}g toplam</Text>
                              </View>
                              <View style={styles.itemHeaderRight}>
                                <Text style={styles.itemCalories}>{Math.round(scaled.calories)} kcal</Text>
                                <Ionicons
                                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                                  size={16} color={Colors.textMuted}
                                />
                              </View>
                            </TouchableOpacity>

                            {/* Porsiyon Slider */}
                            <View style={styles.portionRow}>
                              <SliderControl
                                min={0} max={100}
                                value={pct}
                                onChange={(v) => setPortionValue(index, v)}
                                unit="%"
                                label="Ne kadarını yedin?"
                              />
                            </View>

                            {expandedIndex === index && (
                              <View style={styles.expandedSection}>
                                <View style={styles.macroGrid}>
                                  <MacroBox label="Protein" value={scaled.protein} color={Colors.protein} />
                                  <MacroBox label="Karb" value={scaled.carbs} color={Colors.carbs} />
                                  <MacroBox label="Yağ" value={scaled.fat} color={Colors.fat} />
                                </View>
                                <View style={styles.itemActions}>
                                  <TouchableOpacity style={styles.editItemBtn} onPress={() => startEdit(index)}>
                                    <Ionicons name="create-outline" size={14} color={Colors.primary} />
                                    <Text style={styles.editItemText}>Düzenle</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.deleteItemBtn} onPress={() => removeItem(index)}>
                                    <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                                    <Text style={styles.deleteItemText}>Kaldır</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}

                  {/* Manuel Ekle */}
                  {!showAddForm && (
                    <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddForm(true)}>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.addItemText}>Yiyecek Ekle</Text>
                    </TouchableOpacity>
                  )}

                  {showAddForm && (
                    <View style={styles.addFormCard}>
                      <View style={styles.addFormHeader}>
                        <Text style={styles.addFormTitle}>Yeni Yiyecek Ekle</Text>
                        <TouchableOpacity onPress={() => setShowAddForm(false)}>
                          <Ionicons name="close" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.addFormField}>
                        <Text style={styles.addFormLabel}>Yiyecek Adı</Text>
                        <TextInput
                          style={styles.addFormInput} value={addDraft.name}
                          onChangeText={(v) => setAddDraft((d) => ({ ...d, name: v }))}
                          placeholder="örn. Haşlanmış yumurta..." placeholderTextColor={Colors.textMuted} autoFocus
                        />
                      </View>
                      <View style={styles.addFormField}>
                        <Text style={styles.addFormLabel}>Miktar (gram)</Text>
                        <TextInput
                          style={styles.addFormInput} value={addDraft.estimatedGrams}
                          onChangeText={(v) => setAddDraft((d) => ({ ...d, estimatedGrams: v }))}
                          keyboardType="numeric" placeholder="100" placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.aiEstimateBtn, estimatingNutrition && { opacity: 0.7 }]}
                        onPress={handleEstimateNutrition} disabled={estimatingNutrition}
                      >
                        {estimatingNutrition ? (
                          <><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.aiEstimateBtnText}>Hesaplanıyor...</Text></>
                        ) : (
                          <><Ionicons name="sparkles-outline" size={16} color={Colors.primary} /><Text style={styles.aiEstimateBtnText}>AI ile Değerleri Hesapla</Text></>
                        )}
                      </TouchableOpacity>
                      <View style={styles.addFormMacroGrid}>
                        {[
                          { key: 'calories', label: 'Kalori', color: '#E67E22', unit: 'kcal' },
                          { key: 'protein', label: 'Protein', color: Colors.protein, unit: 'g' },
                          { key: 'carbs', label: 'Karb', color: Colors.carbs, unit: 'g' },
                          { key: 'fat', label: 'Yağ', color: Colors.fat, unit: 'g' },
                        ].map(({ key, label, color, unit }) => (
                          <View key={key} style={styles.addFormMacroItem}>
                            <Text style={[styles.addFormMacroLabel, { color }]}>{label}</Text>
                            <TextInput
                              style={styles.addFormMacroInput}
                              value={(addDraft as any)[key]}
                              onChangeText={(v) => setAddDraft((d) => ({ ...d, [key]: v }))}
                              keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted}
                            />
                            <Text style={styles.addFormMacroUnit}>{unit}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.editCancelBtn} onPress={() => setShowAddForm(false)}>
                          <Text style={styles.editCancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={commitAddItem}>
                          <Text style={styles.editSaveText}>Listeye Ekle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Öğün Seçimi */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealSectionTitle}>Hangi öğüne eklensin?</Text>
                  <Text style={styles.mealSectionHint}>
                    Önerilen: <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                      {MEAL_OPTIONS.find((m) => m.key === suggestedMeal)?.label}
                    </Text> — şu anki vaktin öğünü budur
                  </Text>
                  <View style={styles.mealGrid}>
                    {MEAL_OPTIONS.map((m) => {
                      const isSuggested = m.key === suggestedMeal;
                      const isSelected = selectedMeal === m.key;
                      return (
                        <TouchableOpacity
                          key={m.key}
                          style={[
                            styles.mealChip,
                            isSelected && styles.mealChipActive,
                            isSuggested && !isSelected && styles.mealChipSuggested,
                          ]}
                          onPress={() => handleMealSelect(m.key)}
                        >
                          <Ionicons
                            name={m.icon as any}
                            size={18}
                            color={isSelected ? Colors.textLight : isSuggested ? Colors.primary : Colors.textSecondary}
                          />
                          <View>
                            <Text style={[styles.mealChipText, isSelected && styles.mealChipTextActive]}>
                              {m.label}
                            </Text>
                            <Text style={[styles.mealChipTime, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                              {m.hours}
                            </Text>
                          </View>
                          {isSuggested && !isSelected && (
                            <View style={styles.suggestedDot} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ height: Spacing.xxl }} />
              </>
            )}
          </ScrollView>

          {/* Footer */}
          {viewMode === 'review' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.reanalysisFooterBtn} onPress={startReanalysis}>
                <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                <Text style={styles.reanalysisFooterText}>AI Analizi Yenile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (saving || items.length === 0) && { opacity: 0.6 }]}
                onPress={handleSave} disabled={saving || items.length === 0}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.textLight} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.textLight} />
                    <Text style={styles.saveBtnText}>Günlüğe Ekle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function SliderControl({
  min, max, value, onChange, unit, label,
}: {
  min: number; max: number; value: number; onChange: (v: number) => void;
  unit?: string; label?: string;
}) {
  const containerRef = useRef<View>(null);
  const containerPageXRef = useRef(0);  // absolute screen X of container left edge
  const trackWidthRef = useRef(200);    // container width
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [bubbleValue, setBubbleValue] = useState(value);
  const currentValueRef = useRef(value);
  const isGestureRef = useRef(false);
  const lastTextUpdateRef = useRef(0);  // throttle bubble text to 30fps

  // Animated ratio [0,1] — drives fill & thumb visually, NO React re-render
  const animRatio = useRef(new Animated.Value(toRatio(value, min, max))).current;

  // Sync from parent only when user is not dragging
  useEffect(() => {
    if (!isGestureRef.current) {
      const r = toRatio(value, min, max);
      animRatio.setValue(r);
      setBubbleValue(value);
      currentValueRef.current = value;
    }
  }, [value, min, max]);

  // Measure container absolute position so we can use pageX for accurate tracking
  function measureContainer() {
    containerRef.current?.measure((_x, _y, width, _h, pageX) => {
      containerPageXRef.current = pageX;
      trackWidthRef.current = Math.max(1, width);
    });
  }

  function updateFromPageX(pageX: number) {
    // Compute offset from container left edge (fully clamped: allows reaching 0 and max)
    const offsetX = pageX - containerPageXRef.current;
    const ratio = Math.max(0, Math.min(1, offsetX / trackWidthRef.current));
    const v = Math.round(min + ratio * (max - min));
    // Update visual immediately via Animated (no React re-render)
    animRatio.setValue(ratio);
    currentValueRef.current = v;
    // Throttle bubble text to ~30fps to avoid flicker
    const now = Date.now();
    if (now - lastTextUpdateRef.current >= 33) {
      lastTextUpdateRef.current = now;
      setBubbleValue(v);  // re-renders only this component, not parent
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isGestureRef.current = true;
        lastTextUpdateRef.current = 0;
        measureContainer();  // refresh position before gesture begins
        updateFromPageX(evt.nativeEvent.pageX);
        setBubbleValue(currentValueRef.current);  // show immediately on tap
      },
      onPanResponderMove: (evt) => {
        updateFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: () => {
        isGestureRef.current = false;
        setBubbleValue(currentValueRef.current);  // final value in bubble
        onChangeRef.current(currentValueRef.current);  // parent state update — once
      },
      onPanResponderTerminate: () => {
        isGestureRef.current = false;
        onChangeRef.current(currentValueRef.current);
      },
    })
  ).current;

  const fillPct = animRatio.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={sliderStyles.wrapper}>
      {label && <Text style={sliderStyles.label}>{label}</Text>}
      <View
        ref={containerRef}
        style={sliderStyles.hitArea}
        onLayout={measureContainer}
        {...panResponder.panHandlers}
      >
        {/* Rail */}
        <View style={sliderStyles.rail} />
        {/* Fill */}
        <Animated.View style={[sliderStyles.fill, { width: fillPct }]} />
        {/* Thumb + floating bubble — positioned via interpolated left% */}
        <Animated.View style={[sliderStyles.thumbWrap, { left: fillPct }]}>
          <View style={sliderStyles.bubble}>
            <Text style={sliderStyles.bubbleText}>{bubbleValue}{unit ?? ''}</Text>
          </View>
          <View style={sliderStyles.thumb} />
        </Animated.View>
      </View>
    </View>
  );
}

function toRatio(v: number, min: number, max: number) {
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: `${color}20` }]}>
      <Text style={[pillStyles.label, { color }]}>{label}</Text>
      <Text style={[pillStyles.value, { color }]}>{value}g</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  label: { fontSize: 11, fontWeight: '700' },
  value: { fontSize: 11, fontWeight: '600' },
});

function MacroBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[boxStyles.box, { backgroundColor: `${color}12` }]}>
      <Text style={[boxStyles.value, { color }]}>{Math.round(value * 10) / 10}g</Text>
      <Text style={boxStyles.label}>{label}</Text>
    </View>
  );
}
const boxStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: BorderRadius.md },
  value: { fontSize: FontSize.md, fontWeight: '800' },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Sabit header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background, zIndex: 100,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },

  photo: { width: SCREEN_WIDTH, height: PHOTO_HEIGHT, backgroundColor: Colors.borderLight },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  summaryCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  summaryCalories: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  summaryMacros: { flexDirection: 'row', gap: Spacing.xs },

  // Porsiyon hint
  portionHintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}25`,
  },
  portionHintText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  itemsList: { padding: Spacing.md, gap: Spacing.sm },

  itemCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight,
  },
  itemHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md,
  },
  itemHeaderLeft: { flex: 1, marginRight: Spacing.sm },
  itemName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  itemGram: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  itemHeaderRight: { alignItems: 'flex-end', gap: 4 },
  itemCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },

  // Porsiyon satırı
  portionRow: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },

  // AI Makro Hesapla (düzenleme formunda)
  aiEstimateEditBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.primaryLight, backgroundColor: Colors.primaryPale,
    marginVertical: Spacing.xs,
  },
  aiEstimateEditText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  expandedSection: { borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: Spacing.md, gap: Spacing.sm },
  macroGrid: { flexDirection: 'row', gap: Spacing.sm },
  itemActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end', marginTop: 4 },
  editItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, backgroundColor: Colors.primaryPale,
  },
  editItemText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  deleteItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, backgroundColor: '#FEE2E2',
  },
  deleteItemText: { fontSize: FontSize.sm, color: '#E74C3C', fontWeight: '600' },

  editForm: { padding: Spacing.md, gap: Spacing.xs },
  editLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  editInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    fontSize: FontSize.sm, color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  editRow: { flexDirection: 'row', gap: Spacing.sm },
  editActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  editCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  editCancelText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  editSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary,
  },
  editSaveText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '700' },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.primaryLight, borderStyle: 'dashed',
    backgroundColor: Colors.primaryPale, marginTop: Spacing.xs,
  },
  addItemText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  addFormCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.borderLight,
    padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.xs,
  },
  addFormHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addFormTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  addFormField: { gap: 4 },
  addFormLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  addFormInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    fontSize: FontSize.md, color: Colors.textPrimary,
  },
  aiEstimateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.primaryLight, backgroundColor: Colors.primaryPale,
  },
  aiEstimateBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  addFormMacroGrid: { flexDirection: 'row', gap: Spacing.sm },
  addFormMacroItem: { flex: 1, alignItems: 'center', gap: 4 },
  addFormMacroLabel: { fontSize: 10, fontWeight: '700' },
  addFormMacroInput: {
    width: '100%', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm,
    paddingVertical: 6, textAlign: 'center', fontSize: FontSize.sm, color: Colors.textPrimary,
  },
  addFormMacroUnit: { fontSize: 10, color: Colors.textMuted },

  // Öğün seçimi
  mealSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  mealSectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  mealSectionHint: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, position: 'relative',
  },
  mealChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealChipSuggested: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  mealChipText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  mealChipTextActive: { color: Colors.textLight },
  mealChipTime: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  suggestedDot: {
    position: 'absolute', top: 6, right: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary,
  },

  footer: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.background,
  },
  reanalysisFooterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.primaryLight, backgroundColor: Colors.primaryPale,
  },
  reanalysisFooterText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary,
  },
  saveBtnText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '700' },

  // Reanalysis
  reanalysisSection: { padding: Spacing.md, gap: Spacing.md },
  centerLoader: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  loaderText: { fontSize: FontSize.md, color: Colors.textSecondary },
  reanalysisTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  reanalysisSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
  questionCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight,
  },
  questionText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  answerInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.md, color: Colors.textPrimary, minHeight: 60,
  },
  reanalysisActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelReanalysisBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border,
  },
  cancelReanalysisText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  submitReanalysisBtn: {
    flex: 2, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.primary,
  },
  submitReanalysisText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '700' },
});

// SliderControl'e özel stiller (ayrı StyleSheet — `styles` ile karışmasın)
const sliderStyles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.sm },
  // Touch alanı: geniş tıklanabilir bölge (48px yükseklik)
  hitArea: {
    height: 48, width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  rail: {
    position: 'absolute', left: 0, right: 0,
    height: 6, borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  fill: {
    position: 'absolute', left: 0,
    height: 6, borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  // Thumb + bubble wrapper — centered on fill's right edge via negative marginLeft
  thumbWrap: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -14,  // half of thumb(20) + some bubble width to center
  },
  bubble: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
    minWidth: 34,
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: 11, fontWeight: '800', color: '#fff',
  },
  thumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3,
    elevation: 3,
  },
});
