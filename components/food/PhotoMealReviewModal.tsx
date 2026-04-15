import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, MEAL_TYPES, MealType } from '../../lib/constants';
import {
  DetectedFoodItem,
  generateAnalysisQuestions,
  refineAnalysisWithAnswers,
  estimateNutritionFromText,
} from '../../lib/gemini';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.56); // 16:9-ish

const MEAL_OPTIONS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Öğle', icon: 'partly-sunny-outline' },
  { key: 'dinner', label: 'Akşam', icon: 'moon-outline' },
  { key: 'snack', label: 'Atıştırmalık', icon: 'cafe-outline' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  items: DetectedFoodItem[];
  imageBase64: string | null;
  onSave: (items: DetectedFoodItem[], mealType: MealType) => Promise<void>;
}

type ViewMode = 'review' | 'reanalysis' | 'mealPicker';

export function PhotoMealReviewModal({ visible, onClose, items: initialItems, imageBase64, onSave }: Props) {
  const [items, setItems] = useState<DetectedFoodItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  type EditDraft = { name: string; estimatedGrams: string; calories: string; protein: string; carbs: string; fat: string };
  const [editDraft, setEditDraft] = useState<EditDraft>({
    name: '', estimatedGrams: '', calories: '', protein: '', carbs: '', fat: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: '', estimatedGrams: '100', calories: '0', protein: '0', carbs: '0', fat: '0' });
  const [estimatingNutrition, setEstimatingNutrition] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [reanalysisQuestions, setReanalysisQuestions] = useState<string[]>([]);
  const [reanalysisAnswers, setReanalysisAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');

  // initialItems değişince state'i güncelle
  React.useEffect(() => {
    if (visible) {
      setItems(initialItems);
      setExpandedIndex(null);
      setEditingIndex(null);
      setShowAddForm(false);
      setViewMode('review');
    }
  }, [visible, initialItems]);

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
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
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((_, i) => i !== index));
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
    setItems((prev) => [...prev, newItem]);
    setAddDraft({ name: '', estimatedGrams: '100', calories: '0', protein: '0', carbs: '0', fat: '0' });
    setShowAddForm(false);
  }

  async function handleEstimateNutrition() {
    const name = addDraft.name.trim();
    const grams = parseFloat(addDraft.estimatedGrams);
    if (!name) {
      Alert.alert('Eksik Bilgi', 'Önce yiyecek adını girin.');
      return;
    }
    if (!grams || grams <= 0) {
      Alert.alert('Eksik Bilgi', 'Geçerli bir gram değeri girin.');
      return;
    }
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
      setItems(newItems);
      setViewMode('review');
      setExpandedIndex(null);
    } catch {
      Alert.alert('Hata', 'Analiz yenilenemedi. Lütfen tekrar deneyin.');
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleSave() {
    if (items.length === 0) {
      Alert.alert('Uyarı', 'Kaydedilecek yiyecek yok.');
      return;
    }
    setSaving(true);
    try {
      await onSave(items, selectedMeal);
    } finally {
      setSaving(false);
    }
  }

  const confidenceColor = (c: number) => (c >= 0.75 ? Colors.primary : c >= 0.5 ? Colors.accent : '#E74C3C');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ── Header ── */}
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

            {/* ── Fotoğraf ── */}
            {imageBase64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                style={styles.photo}
                resizeMode="cover"
              />
            )}

            {/* ── Re-analysis view ── */}
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
                    <Text style={styles.reanalysisSubtitle}>
                      Cevaplarınıza göre AI yeni bir analiz yapacak.
                    </Text>
                    {reanalysisQuestions.map((q, i) => (
                      <View key={i} style={styles.questionCard}>
                        <Text style={styles.questionText}>{q}</Text>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Cevabınız..."
                          placeholderTextColor={Colors.textMuted}
                          value={reanalysisAnswers[i]}
                          onChangeText={(v) =>
                            setReanalysisAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))
                          }
                          multiline
                        />
                      </View>
                    ))}
                    <View style={styles.reanalysisActions}>
                      <TouchableOpacity
                        style={styles.cancelReanalysisBtn}
                        onPress={() => setViewMode('review')}
                      >
                        <Text style={styles.cancelReanalysisText}>Vazgeç</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitReanalysisBtn, reanalyzing && { opacity: 0.6 }]}
                        onPress={submitReanalysis}
                        disabled={reanalyzing}
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

            {/* ── Review view ── */}
            {viewMode === 'review' && (
              <>
                {/* Toplam Özet */}
                <View style={styles.summaryBar}>
                  <View style={styles.summaryLeft}>
                    <Text style={styles.summaryCount}>{items.length} yiyecek</Text>
                    <Text style={styles.summaryCalories}>{Math.round(totals.calories)} kcal</Text>
                  </View>
                  <View style={styles.summaryMacros}>
                    <MacroPill label="P" value={Math.round(totals.protein)} color={Colors.protein} />
                    <MacroPill label="K" value={Math.round(totals.carbs)} color={Colors.carbs} />
                    <MacroPill label="Y" value={Math.round(totals.fat)} color={Colors.fat} />
                  </View>
                </View>

                {/* Yiyecek Listesi */}
                <View style={styles.itemsList}>
                  {items.map((item, index) => (
                    <View key={index} style={styles.itemCard}>
                      {editingIndex === index ? (
                        /* ── Edit mode ── */
                        <View style={styles.editForm}>
                          <Text style={styles.editLabel}>İsim</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editDraft.name}
                            onChangeText={(v) => setEditDraft((d) => ({ ...d, name: v }))}
                            placeholder="Yiyecek adı"
                          />
                          <View style={styles.editRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.editLabel}>Gram</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editDraft.estimatedGrams}
                                onChangeText={(v) => setEditDraft((d) => ({ ...d, estimatedGrams: v }))}
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.editLabel}>Kalori</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editDraft.calories}
                                onChangeText={(v) => setEditDraft((d) => ({ ...d, calories: v }))}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                          <View style={styles.editRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.editLabel}>Protein (g)</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editDraft.protein}
                                onChangeText={(v) => setEditDraft((d) => ({ ...d, protein: v }))}
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.editLabel}>Karb (g)</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editDraft.carbs}
                                onChangeText={(v) => setEditDraft((d) => ({ ...d, carbs: v }))}
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.editLabel}>Yağ (g)</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editDraft.fat}
                                onChangeText={(v) => setEditDraft((d) => ({ ...d, fat: v }))}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={styles.editCancelBtn}
                              onPress={() => setEditingIndex(null)}
                            >
                              <Text style={styles.editCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editSaveBtn} onPress={commitEdit}>
                              <Text style={styles.editSaveText}>Kaydet</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* ── Normal mode ── */
                        <>
                          <TouchableOpacity
                            style={styles.itemHeader}
                            onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.itemHeaderLeft}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <View style={styles.itemMeta}>
                                <View style={styles.gramBadge}>
                                  <Text style={styles.gramBadgeText}>~{item.estimatedGrams}g</Text>
                                </View>
                                <View style={[styles.confBadge, { backgroundColor: confidenceColor(item.confidence) }]}>
                                  <Text style={styles.confBadgeText}>
                                    %{Math.round(item.confidence * 100)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.itemHeaderRight}>
                              <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                              <Ionicons
                                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={Colors.textMuted}
                              />
                            </View>
                          </TouchableOpacity>

                          {expandedIndex === index && (
                            <View style={styles.expandedSection}>
                              <View style={styles.macroGrid}>
                                <MacroBox label="Protein" value={item.protein} color={Colors.protein} />
                                <MacroBox label="Karb" value={item.carbs} color={Colors.carbs} />
                                <MacroBox label="Yağ" value={item.fat} color={Colors.fat} />
                              </View>
                              <View style={styles.itemActions}>
                                <TouchableOpacity
                                  style={styles.editItemBtn}
                                  onPress={() => startEdit(index)}
                                >
                                  <Ionicons name="create-outline" size={14} color={Colors.primary} />
                                  <Text style={styles.editItemText}>Düzenle</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.deleteItemBtn}
                                  onPress={() => removeItem(index)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                                  <Text style={styles.deleteItemText}>Kaldır</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  ))}

                  {/* Manuel Ekle Butonu */}
                  {!showAddForm && (
                    <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddForm(true)}>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.addItemText}>Yiyecek Ekle</Text>
                    </TouchableOpacity>
                  )}

                  {/* Manuel Ekle Formu */}
                  {showAddForm && (
                    <View style={styles.addFormCard}>
                      {/* Form Başlığı */}
                      <View style={styles.addFormHeader}>
                        <View style={styles.addFormHeaderLeft}>
                          <View style={styles.addFormIconWrap}>
                            <Ionicons name="add" size={18} color={Colors.primary} />
                          </View>
                          <Text style={styles.addFormTitle}>Yeni Yiyecek Ekle</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowAddForm(false)} style={styles.addFormCloseBtn}>
                          <Ionicons name="close" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {/* İsim */}
                      <View style={styles.addFormField}>
                        <Text style={styles.addFormLabel}>Yiyecek Adı</Text>
                        <TextInput
                          style={styles.addFormInput}
                          value={addDraft.name}
                          onChangeText={(v) => setAddDraft((d) => ({ ...d, name: v }))}
                          placeholder="örn. Haşlanmış yumurta, elma..."
                          placeholderTextColor={Colors.textMuted}
                          autoFocus
                        />
                      </View>

                      {/* Gram */}
                      <View style={styles.addFormField}>
                        <Text style={styles.addFormLabel}>Miktar (gram)</Text>
                        <TextInput
                          style={styles.addFormInput}
                          value={addDraft.estimatedGrams}
                          onChangeText={(v) => setAddDraft((d) => ({ ...d, estimatedGrams: v }))}
                          keyboardType="numeric"
                          placeholder="100"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>

                      {/* AI Hesapla Butonu */}
                      <TouchableOpacity
                        style={[styles.aiEstimateBtn, estimatingNutrition && { opacity: 0.7 }]}
                        onPress={handleEstimateNutrition}
                        disabled={estimatingNutrition}
                      >
                        {estimatingNutrition ? (
                          <>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.aiEstimateBtnText}>Hesaplanıyor...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                            <Text style={styles.aiEstimateBtnText}>AI ile Değerleri Hesapla</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Makro Değerleri */}
                      <View style={styles.addFormDivider} />
                      <Text style={styles.addFormSectionLabel}>Besin Değerleri</Text>
                      <View style={styles.addFormMacroGrid}>
                        <View style={styles.addFormMacroItem}>
                          <Text style={[styles.addFormMacroLabel, { color: '#E67E22' }]}>Kalori</Text>
                          <TextInput
                            style={[styles.addFormMacroInput, { borderColor: '#E67E2230' }]}
                            value={addDraft.calories}
                            onChangeText={(v) => setAddDraft((d) => ({ ...d, calories: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.addFormMacroUnit}>kcal</Text>
                        </View>
                        <View style={styles.addFormMacroItem}>
                          <Text style={[styles.addFormMacroLabel, { color: Colors.protein }]}>Protein</Text>
                          <TextInput
                            style={[styles.addFormMacroInput, { borderColor: `${Colors.protein}30` }]}
                            value={addDraft.protein}
                            onChangeText={(v) => setAddDraft((d) => ({ ...d, protein: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.addFormMacroUnit}>g</Text>
                        </View>
                        <View style={styles.addFormMacroItem}>
                          <Text style={[styles.addFormMacroLabel, { color: Colors.carbs }]}>Karb</Text>
                          <TextInput
                            style={[styles.addFormMacroInput, { borderColor: `${Colors.carbs}30` }]}
                            value={addDraft.carbs}
                            onChangeText={(v) => setAddDraft((d) => ({ ...d, carbs: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.addFormMacroUnit}>g</Text>
                        </View>
                        <View style={styles.addFormMacroItem}>
                          <Text style={[styles.addFormMacroLabel, { color: Colors.fat }]}>Yağ</Text>
                          <TextInput
                            style={[styles.addFormMacroInput, { borderColor: `${Colors.fat}30` }]}
                            value={addDraft.fat}
                            onChangeText={(v) => setAddDraft((d) => ({ ...d, fat: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.addFormMacroUnit}>g</Text>
                        </View>
                      </View>

                      {/* Butonlar */}
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.editCancelBtn}
                          onPress={() => setShowAddForm(false)}
                        >
                          <Text style={styles.editCancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={commitAddItem}>
                          <Ionicons name="add-circle-outline" size={16} color={Colors.textLight} />
                          <Text style={styles.editSaveText}>Listeye Ekle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Öğün Seçimi */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealSectionTitle}>Hangi öğüne eklensin?</Text>
                  <View style={styles.mealGrid}>
                    {MEAL_OPTIONS.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        style={[styles.mealChip, selectedMeal === m.key && styles.mealChipActive]}
                        onPress={() => setSelectedMeal(m.key)}
                      >
                        <Ionicons
                          name={m.icon as any}
                          size={18}
                          color={selectedMeal === m.key ? Colors.textLight : Colors.textSecondary}
                        />
                        <Text style={[styles.mealChipText, selectedMeal === m.key && styles.mealChipTextActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ height: Spacing.xl }} />
              </>
            )}
          </ScrollView>

          {/* ── Footer ── */}
          {viewMode === 'review' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.reanalysisFooterBtn} onPress={startReanalysis}>
                <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
                <Text style={styles.reanalysisFooterText}>AI Analizi Yenile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (saving || items.length === 0) && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving || items.length === 0}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },

  photo: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: Colors.borderLight,
  },

  summaryBar: {
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
  summaryCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  summaryCalories: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  summaryMacros: { flexDirection: 'row', gap: Spacing.xs },

  itemsList: { padding: Spacing.md, gap: Spacing.sm },

  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  itemHeaderLeft: { flex: 1, marginRight: Spacing.sm },
  itemName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: Spacing.xs },
  gramBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  gramBadgeText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  confBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  confBadgeText: { fontSize: 11, color: Colors.textLight, fontWeight: '700' },
  itemHeaderRight: { alignItems: 'flex-end', gap: 4 },
  itemCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },

  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  macroGrid: { flexDirection: 'row', gap: Spacing.sm },
  itemActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end', marginTop: 4 },
  editItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
  },
  editItemText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  deleteItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEE2E2',
  },
  deleteItemText: { fontSize: FontSize.sm, color: '#E74C3C', fontWeight: '600' },

  editForm: { padding: Spacing.md, gap: Spacing.xs },
  editLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  editInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
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
    gap: 6, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary,
  },
  editSaveText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '700' },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryPale,
    marginTop: Spacing.xs,
  },
  addItemText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  // New add form styles
  addFormCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}30`,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addFormHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addFormIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  addFormTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  addFormCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  addFormField: { gap: 4 },
  addFormLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  addFormInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  aiEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}40`,
    marginVertical: 2,
  },
  aiEstimateBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  addFormDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 2 },
  addFormSectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  addFormMacroGrid: { flexDirection: 'row', gap: Spacing.sm },
  addFormMacroItem: { flex: 1, alignItems: 'center', gap: 3 },
  addFormMacroLabel: { fontSize: 11, fontWeight: '700' },
  addFormMacroInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    textAlign: 'center',
  },
  addFormMacroUnit: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  mealSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  mealSectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  mealGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mealChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  mealChipTextActive: { color: Colors.textLight },

  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  reanalysisFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryPale,
  },
  reanalysisFooterText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  saveBtnText: { fontSize: FontSize.md, color: Colors.textLight, fontWeight: '700' },

  // Re-analysis
  reanalysisSection: { padding: Spacing.lg, gap: Spacing.md },
  centerLoader: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  loaderText: { fontSize: FontSize.md, color: Colors.textSecondary },
  reanalysisTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  reanalysisSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: -Spacing.xs },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  questionText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  answerInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  reanalysisActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelReanalysisBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  cancelReanalysisText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  submitReanalysisBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary,
  },
  submitReanalysisText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '700' },
});
