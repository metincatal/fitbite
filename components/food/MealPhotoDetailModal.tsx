import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { FoodLogWithFood } from '../../types';
import { estimateNutritionFromText, generateGramVisualization, getCachedGramHint } from '../../lib/gemini';
import { estimateForManualInput } from '../../lib/nutritionEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * 0.85);

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

interface EditValues {
  food_name: string;
  serving_amount: number;
  pct: number;
  notEaten: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  logs: FoodLogWithFood[];
  onRemoveAll: () => void;
  onRemoveLog?: (id: string) => Promise<void>;
  mealName?: string;
  onNameChange?: (name: string) => void;
  isEdited?: boolean;
  onUpdateLog?: (
    id: string,
    updates: Partial<{ calories: number; protein: number; carbs: number; fat: number; serving_amount: number }>
  ) => Promise<void>;
  onUpdateFoodName?: (foodId: string, name: string) => Promise<void>;
  onEditComplete?: () => void;
  onSavingStateChange?: (isSaving: boolean) => void;
}

export function MealPhotoDetailModal({
  visible,
  onClose,
  logs,
  onRemoveAll,
  onRemoveLog,
  mealName,
  onNameChange,
  isEdited = false,
  onUpdateLog,
  onUpdateFoodName,
  onEditComplete,
  onSavingStateChange,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, EditValues>>({});
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Gramaj somutlaştırma önbelleği: "foodName_grams" → hint string
  const hintCache = useRef<Record<string, string>>({});

  // Sticky edit action buttons — edit modunda kartlar görüldükten sonra
  // kullanıcı yukarı kaydırırsa butonlar ekranın altına sabitlenir
  const [editActionNaturalY, setEditActionNaturalY] = useState(0);
  const [editActionHeight, setEditActionHeight] = useState(0);
  const [hasSeenEditActions, setHasSeenEditActions] = useState(false);
  const [showStickyActions, setShowStickyActions] = useState(false);
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setExpandedIndex(0);
      setEditingName(false);
      setEditMode(false);
      setNameText(mealName ?? '');
      if (Platform.OS === 'ios') StatusBar.setBarStyle('light-content', true);
    } else {
      if (Platform.OS === 'ios') StatusBar.setBarStyle('dark-content', true);
    }
  }, [visible]);

  useEffect(() => {
    if (!editingName) setNameText(mealName ?? '');
  }, [mealName]);

  useEffect(() => {
    if (!editMode) {
      setHasSeenEditActions(false);
      setShowStickyActions(false);
      scrollYRef.current = 0;
    }
  }, [editMode]);

  function enterEditMode() {
    const initial: Record<string, EditValues> = {};
    const origNames: Record<string, string> = {};
    logs.forEach((l) => {
      const name = l.food?.name_tr ?? l.food?.name ?? '';
      initial[l.id] = { food_name: name, serving_amount: Math.round(l.serving_amount), pct: 100, notEaten: false };
      origNames[l.id] = name;
    });
    setEditValues(initial);
    setOriginalNames(origNames);
    setEditMode(true);
  }

  function handleEditScroll(e: { nativeEvent: { contentOffset: { y: number } } }) {
    if (!editMode) return;
    const offset = e.nativeEvent.contentOffset.y;
    scrollYRef.current = offset;
    const topY = editActionNaturalY - offset;
    const bottomY = topY + editActionHeight;
    const fullyVisible = topY >= 0 && bottomY <= SCREEN_HEIGHT;
    const partlyVisible = topY < SCREEN_HEIGHT && bottomY > 0;
    if (!hasSeenEditActions) {
      if (fullyVisible) setHasSeenEditActions(true);
    } else {
      setShowStickyActions(!partlyVisible);
    }
  }

  function cancelEdit() {
    setEditMode(false);
    setEditValues({});
    setOriginalNames({});
  }

  async function commitEdit() {
    if (!onUpdateLog) return;
    setSavingEdit(true);
    // Capture current edit state before closing
    const savedEditValues = { ...editValues };
    const savedOriginalNames = { ...originalNames };
    const savedLogs = [...logs];
    // Close modal immediately so user can navigate away
    onClose();
    onSavingStateChange?.(true);
    try {
      await Promise.all(
        savedLogs.map(async (l) => {
          const vals = savedEditValues[l.id];
          if (!vals) return;

          // "Hiç yemedim" → ilgili kaydı sil
          if (vals.notEaten) {
            if (onRemoveLog) await onRemoveLog(l.id);
            return;
          }

          const finalGrams = Math.max(1, Math.round(vals.serving_amount * vals.pct / 100));
          const nameChanged = vals.food_name.trim() !== savedOriginalNames[l.id];
          const foodName = vals.food_name.trim() || savedOriginalNames[l.id];

          let calories = Math.round(l.calories * vals.pct / 100);
          let protein = Math.round(l.protein * vals.pct / 100 * 10) / 10;
          let carbs = Math.round(l.carbs * vals.pct / 100 * 10) / 10;
          let fat = Math.round(l.fat * vals.pct / 100 * 10) / 10;

          try {
            const engRes = estimateForManualInput(foodName, finalGrams);
            if (engRes) {
              calories = Math.round(engRes.kcal);
              protein = Math.round(engRes.protein * 10) / 10;
              carbs = Math.round(engRes.carbs * 10) / 10;
              fat = Math.round(engRes.fat * 10) / 10;
            } else {
              const r = await estimateNutritionFromText({ foodName, grams: finalGrams });
              calories = Math.round(r.calories);
              protein = Math.round(r.protein * 10) / 10;
              carbs = Math.round(r.carbs * 10) / 10;
              fat = Math.round(r.fat * 10) / 10;
            }
          } catch {
            // AI başarısız → pct ile ölçekli mevcut değerler
          }

          await onUpdateLog(l.id, { calories, protein, carbs, fat, serving_amount: finalGrams });

          if (nameChanged && onUpdateFoodName && l.food?.id) {
            await onUpdateFoodName(l.food.id, foodName);
          }
        })
      );
      setEditMode(false);
      setEditValues({});
      setOriginalNames({});
      if (onEditComplete) onEditComplete();
    } catch {
      Alert.alert('Hata', 'Kayıt sırasında bir sorun oluştu.');
    } finally {
      setSavingEdit(false);
      onSavingStateChange?.(false);
    }
  }

  function patchEditValue(id: string, patch: Partial<EditValues>) {
    setEditValues((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function commitNameEdit() {
    setEditingName(false);
    const trimmed = nameText.trim();
    if (trimmed && onNameChange) onNameChange(trimmed);
  }

  if (logs.length === 0) return null;

  const imageUrl = logs[0]?.image_url;

  const displayLogs = editMode
    ? logs.map((l) => {
        const v = editValues[l.id];
        if (!v || v.notEaten) return { ...l, calories: 0, protein: 0, carbs: 0, fat: 0, serving_amount: 0 };
        const f = v.pct / 100;
        return {
          ...l,
          calories: Math.round(l.calories * f),
          protein: Math.round(l.protein * f * 10) / 10,
          carbs: Math.round(l.carbs * f * 10) / 10,
          fat: Math.round(l.fat * f * 10) / 10,
          serving_amount: Math.round(v.serving_amount * f),
        };
      })
    : logs;

  const totalCalories = displayLogs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = displayLogs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = displayLogs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = displayLogs.reduce((s, l) => s + l.fat, 0);

  const mealLabel = logs[0]?.meal_type
    ? ({ breakfast: 'Kahvaltı', lunch: 'Öğle Yemeği', dinner: 'Akşam Yemeği', snack: 'Atıştırmalık' } as Record<string, string>)[logs[0].meal_type] ?? ''
    : '';

  const loggedTime = logs[0]?.logged_at
    ? new Date(logs[0].logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const canEdit = !isEdited && !!onUpdateLog && logs.length > 0;

  const anyNameChanged = editMode && Object.entries(editValues).some(
    ([id, v]) => !v.notEaten && v.food_name.trim() !== (originalNames[id] ?? '')
  );
  const notEatenCount = editMode ? Object.values(editValues).filter((v) => v.notEaten).length : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={editMode ? cancelEdit : onClose}
    >
      <View style={styles.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            bounces
            keyboardShouldPersistTaps="handled"
            onScroll={handleEditScroll}
            scrollEventThrottle={16}
          >
            {/* ── Hero Photo ── */}
            <View style={styles.heroContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroImage, { backgroundColor: Colors.line2 }]} />
              )}

              <TouchableOpacity style={styles.backBtn} onPress={editMode ? cancelEdit : onClose}>
                <Ionicons name={editMode ? 'close' : 'arrow-back'} size={22} color="#fff" />
              </TouchableOpacity>

              {editMode && (
                <View style={styles.editModeHeroOverlay}>
                  <View style={styles.editModeBadge}>
                    <Ionicons name="create" size={12} color="#fff" />
                    <Text style={styles.editModeBadgeText}>DÜZENLEME MODU</Text>
                  </View>
                </View>
              )}

              {!editMode && (
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
              )}

              {!editMode && (
                <View style={styles.heroNameWrap}>
                  {editingName ? (
                    <TextInput
                      ref={nameInputRef}
                      style={styles.heroNameInput}
                      value={nameText}
                      onChangeText={setNameText}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={commitNameEdit}
                      onBlur={commitNameEdit}
                      placeholder="Bir isim ver..."
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setNameText(mealName ?? ''); setEditingName(true); }}
                      style={styles.heroNameBtn}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="pencil-outline" size={13} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.heroNameText}>{mealName ?? '+ İsim ekle'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* ── Summary Strip ── */}
            <View style={[styles.summaryStrip, editMode && styles.summaryStripEdit]}>
              <View>
                <Text style={styles.summaryCount}>
                  {editMode
                    ? notEatenCount > 0
                      ? `${logs.length - notEatenCount} / ${logs.length} yiyecek kaydedilecek`
                      : `${logs.length} yiyecek · Düzenlemede`
                    : `${logs.length} yiyecek`}
                </Text>
                <Text style={[styles.summaryCalories, editMode && { color: Colors.terracotta }]}>
                  {Math.round(totalCalories)} kcal
                </Text>
              </View>
              <View style={styles.summaryMacros}>
                <MacroPill label="P" value={Math.round(totalProtein)} color={Colors.protein} />
                <MacroPill label="K" value={Math.round(totalCarbs)} color={Colors.carbs} />
                <MacroPill label="Y" value={Math.round(totalFat)} color={Colors.fat} />
              </View>
            </View>

            {/* ── Edit Mode Hint ── */}
            {editMode && (
              <View style={styles.editHintBanner}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.ink3} />
                <Text style={styles.editHintText}>
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>Besin adını</Text> veya{' '}
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>gramajı</Text> değiştirirsen
                  makrolar kayıtta AI ile yeniden hesaplanır. Yemediğin besini{' '}
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>günlükten çıkarabilirsin</Text>.
                </Text>
              </View>
            )}

            {/* ── Section Header ── */}
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  {editMode ? 'Besinleri Düzenle' : 'Tespit Edilen Besinler'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {editMode
                    ? 'İsim, gramaj veya porsiyon düzelt · Yemediğin besini çıkar'
                    : 'AI tahmin · Dokunarak detay gör'}
                </Text>
              </View>
              {canEdit && !editMode && (
                <TouchableOpacity style={styles.editBtn} onPress={enterEditMode} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={14} color={Colors.ink} />
                  <Text style={styles.editBtnText}>Düzenle</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Food List ── */}
            <View style={styles.foodList}>
              {logs.map((log, index) => {
                const foodName = log.food?.name_tr ?? log.food?.name ?? 'Bilinmiyor';

                if (editMode) {
                  const vals = editValues[log.id];
                  const origName = originalNames[log.id] ?? foodName;
                  return (
                    <EditableCard
                      key={log.id}
                      index={index}
                      originalName={origName}
                      values={vals}
                      hintCache={hintCache}
                      onChange={(patch) => patchEditValue(log.id, patch)}
                    />
                  );
                }

                const isExpanded = expandedIndex === index;
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.foodCard, isExpanded && styles.foodCardExpanded]}
                    onPress={() => setExpandedIndex(isExpanded ? null : index)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.foodCardHeader}>
                      <View style={styles.foodCardLeft}>
                        <View style={styles.foodIndexBadge}>
                          <Text style={styles.foodIndex}>{index + 1}</Text>
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
                          color={Colors.ink4}
                        />
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.macroGrid}>
                        <MacroCard label="Protein" value={log.protein} color={Colors.protein} icon="fitness-outline" />
                        <MacroCard label="Karbonhidrat" value={log.carbs} color={Colors.carbs} icon="leaf-outline" />
                        <MacroCard label="Yağ" value={log.fat} color={Colors.fat} icon="water-outline" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Edit Action Buttons ── */}
            {editMode && (
              <View
                pointerEvents={showStickyActions ? 'none' : 'auto'}
                onLayout={(e) => {
                  setEditActionNaturalY(e.nativeEvent.layout.y);
                  setEditActionHeight(e.nativeEvent.layout.height);
                }}
                style={showStickyActions ? { opacity: 0 } : undefined}
              >
                {EditActionContent({ anyNameChanged, savingEdit, cancelEdit, commitEdit })}
              </View>
            )}

            {/* ── Delete All ── */}
            {!editMode && (
              <TouchableOpacity style={styles.deleteAllBtn} onPress={onRemoveAll}>
                <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                <Text style={styles.deleteAllText}>Bu öğünü günlükten kaldır</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Sticky edit actions — sadece kullanıcı butonları görüp yukarı kaydırınca */}
          {editMode && showStickyActions && (
            <View style={styles.stickyActionsBar}>
              {EditActionContent({ anyNameChanged, savingEdit, cancelEdit, commitEdit })}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Edit action içeriği — scroll içi (şeffaf) ve sticky bar için ortak render
function EditActionContent({
  anyNameChanged,
  savingEdit,
  cancelEdit,
  commitEdit,
}: {
  anyNameChanged: boolean;
  savingEdit: boolean;
  cancelEdit: () => void;
  commitEdit: () => void;
}) {
  return (
    <>
      <View style={[styles.editNote, anyNameChanged && styles.editNoteReanalyze]}>
        <Ionicons
          name={anyNameChanged ? 'sparkles' : 'sparkles-outline'}
          size={14}
          color={anyNameChanged ? Colors.terracotta : Colors.ink3}
        />
        <Text style={[styles.editNoteText, anyNameChanged && { color: Colors.ink }]}>
          {anyNameChanged
            ? 'Besin adı değiştirildi — kayıtta yeni AI analizi çalışacak'
            : 'Kayıtta makrolar AI ile otomatik hesaplanır'}
        </Text>
      </View>
      <View style={styles.editActions}>
        <TouchableOpacity style={styles.cancelEditBtn} onPress={cancelEdit} disabled={savingEdit}>
          <Text style={styles.cancelEditBtnText}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveEditBtn, savingEdit && { opacity: 0.65 }]}
          onPress={commitEdit}
          disabled={savingEdit}
          activeOpacity={0.85}
        >
          {savingEdit ? (
            <>
              <ActivityIndicator size="small" color={Colors.background} />
              <Text style={styles.saveEditBtnText}>Hesaplanıyor…</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={Colors.background} />
              <Text style={styles.saveEditBtnText}>Değişiklikleri Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// ──────────────────────────── EDITABLE CARD ────────────────────────────
const PCT_PRESETS = [25, 50, 75, 100];
const GRAM_PRESETS = [50, 100, 150, 200, 300];

function EditableCard({
  index,
  originalName,
  values,
  hintCache,
  onChange,
}: {
  index: number;
  originalName: string;
  values: EditValues;
  hintCache: React.MutableRefObject<Record<string, string>>;
  onChange: (patch: Partial<EditValues>) => void;
}) {
  // Önce module cache'den senkron oku (analiz ekranında üretildiyse anında dolar)
  const [gramHint, setGramHint] = useState<string | null>(() => {
    const name = values?.food_name || originalName;
    const grams = values?.serving_amount ?? 0;
    const cached = getCachedGramHint(name, grams);
    if (cached) {
      hintCache.current[`${name}_${grams}`] = cached;
    }
    return cached ?? null;
  });
  const [hintLoading, setHintLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchHint = useCallback(async (name: string, grams: number) => {
    const localKey = `${name}_${grams}`;
    if (hintCache.current[localKey]) {
      setGramHint(hintCache.current[localKey]);
      return;
    }
    // Module cache'de var mı senkron kontrol et — loading göstermeye gerek yok
    const moduleHit = getCachedGramHint(name, grams);
    if (moduleHit) {
      hintCache.current[localKey] = moduleHit;
      setGramHint(moduleHit);
      return;
    }
    setHintLoading(true);
    try {
      const hint = await generateGramVisualization(name, grams);
      hintCache.current[localKey] = hint;
      setGramHint(hint);
    } catch {
      setGramHint(null);
    } finally {
      setHintLoading(false);
    }
  }, [hintCache]);

  // İlk render'da hint yükle (cache miss ise async)
  useEffect(() => {
    if (!values?.notEaten && !gramHint) {
      fetchHint(values.food_name || originalName, values.serving_amount);
    }
  }, []);

  // Gramaj veya isim değişince hint'i güncelle (debounced 600ms)
  useEffect(() => {
    if (!values || values.notEaten) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchHint(values.food_name || originalName, values.serving_amount);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [values?.food_name, values?.serving_amount, values?.notEaten]);

  if (!values) return null;

  const nameChanged = values.food_name.trim() !== originalName;
  const finalGrams = Math.max(1, Math.round(values.serving_amount * values.pct / 100));

  // ── "Hiç yemedim" durumu ──
  if (values.notEaten) {
    return (
      <View style={editStyles.cardNotEaten}>
        <View style={editStyles.cardHeader}>
          <View style={editStyles.numBadgeNotEaten}>
            <Ionicons name="close" size={13} color={Colors.ink3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={editStyles.cardNameNotEaten} numberOfLines={1}>{values.food_name || originalName}</Text>
            <Text style={editStyles.notEatenLabel}>Günlüğe eklenmeyecek</Text>
          </View>
          <TouchableOpacity
            style={editStyles.restoreBtn}
            onPress={() => onChange({ notEaten: false })}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={Colors.ink2} />
            <Text style={editStyles.restoreBtnText}>Geri al</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[editStyles.card, nameChanged && editStyles.cardHighlighted]}>
      {/* ── Besin adı ── */}
      <View style={editStyles.cardHeader}>
        <View style={editStyles.numBadge}>
          <Text style={editStyles.numText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={editStyles.fieldLabel}>BESİN ADI</Text>
          {/* Input + Yemedim butonu yan yana, dikey ortalanmış */}
          <View style={editStyles.nameRow}>
            <View style={[editStyles.nameInputWrap, nameChanged && editStyles.nameInputWrapChanged, { flex: 1 }]}>
              <TextInput
                style={editStyles.nameInput}
                value={values.food_name}
                onChangeText={(t) => onChange({ food_name: t })}
                placeholder="Besin adı…"
                placeholderTextColor={Colors.ink4}
                returnKeyType="done"
              />
              {nameChanged && <View style={editStyles.nameChangedDot} />}
            </View>
            <TouchableOpacity
              style={editStyles.notEatenToggle}
              onPress={() => onChange({ notEaten: true })}
              activeOpacity={0.75}
            >
              <Ionicons name="close-circle" size={15} color={Colors.terracotta} />
              <Text style={editStyles.notEatenToggleText}>Yemedim</Text>
            </TouchableOpacity>
          </View>
          {nameChanged && (
            <View style={editStyles.reanalyzeBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.terracotta} />
              <Text style={editStyles.reanalyzeText}>Yeni analiz yapılacak</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Gramaj ── */}
      <View style={editStyles.section}>
        <Text style={editStyles.fieldLabel}>GRAMAJ</Text>
        <View style={editStyles.stepperRow}>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ serving_amount: Math.max(5, values.serving_amount - 10) })}
          >
            <Text style={editStyles.stepBtnText}>−10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ serving_amount: Math.max(5, values.serving_amount - 5) })}
          >
            <Text style={editStyles.stepBtnText}>−5</Text>
          </TouchableOpacity>

          <View style={editStyles.gramBlock}>
            <Text style={editStyles.gramNum}>{values.serving_amount}<Text style={editStyles.gramUnit}>g</Text></Text>
            {/* Gramaj somutlaştırma */}
            <View style={editStyles.hintRow}>
              {hintLoading ? (
                <ActivityIndicator size="small" color={Colors.ink4} style={{ transform: [{ scale: 0.6 }] }} />
              ) : gramHint ? (
                <>
                  <Text style={editStyles.hintTilde}>≈</Text>
                  <Text style={editStyles.hintText}>{gramHint}</Text>
                </>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ serving_amount: values.serving_amount + 5 })}
          >
            <Text style={editStyles.stepBtnText}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ serving_amount: values.serving_amount + 10 })}
          >
            <Text style={editStyles.stepBtnText}>+10</Text>
          </TouchableOpacity>
        </View>
        <View style={editStyles.presetRow}>
          {GRAM_PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[editStyles.preset, values.serving_amount === p && editStyles.presetActive]}
              onPress={() => onChange({ serving_amount: p })}
            >
              <Text style={[editStyles.presetText, values.serving_amount === p && editStyles.presetTextActive]}>
                {p}g
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Porsiyon ── */}
      <View style={editStyles.section}>
        <View style={editStyles.pctHeaderRow}>
          <Text style={editStyles.fieldLabel}>NE KADARINI YEDİN?</Text>
          <Text style={editStyles.pctValueLabel}>%{values.pct}</Text>
        </View>
        <View style={editStyles.presetRow}>
          {PCT_PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[editStyles.preset, values.pct === p && editStyles.presetActive]}
              onPress={() => onChange({ pct: p })}
            >
              <Text style={[editStyles.presetText, values.pct === p && editStyles.presetTextActive]}>
                {p === 100 ? 'Hepsi' : `%${p}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={editStyles.stepperRow}>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ pct: Math.max(5, values.pct - 10) })}
          >
            <Text style={editStyles.stepBtnText}>−10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ pct: Math.max(5, values.pct - 5) })}
          >
            <Text style={editStyles.stepBtnText}>−5</Text>
          </TouchableOpacity>
          <View style={editStyles.pctTrack}>
            <View style={[editStyles.pctFill, { width: `${Math.min(100, values.pct)}%` }]} />
          </View>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ pct: Math.min(200, values.pct + 5) })}
          >
            <Text style={editStyles.stepBtnText}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={editStyles.stepBtn}
            onPress={() => onChange({ pct: Math.min(200, values.pct + 10) })}
          >
            <Text style={editStyles.stepBtnText}>+10</Text>
          </TouchableOpacity>
        </View>

        <View style={editStyles.previewRow}>
          <Ionicons name="checkmark-circle-outline" size={13} color={Colors.ink4} />
          <Text style={editStyles.previewText}>
            Kaydedilecek:{' '}
            <Text style={{ color: Colors.ink, fontFamily: SERIF }}>{finalGrams}g</Text>
            {values.pct !== 100 && (
              <Text style={{ color: Colors.ink3 }}> ({values.serving_amount}g × %{values.pct})</Text>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────── HELPER COMPONENTS ────────────────────────────
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
  card: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FontSize.lg, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
});

// ──────────────────────────── EDITABLE CARD STYLES ────────────────────────────
const editStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.line,
    padding: 16,
    gap: 18,
  },
  cardHighlighted: {
    borderColor: `${Colors.terracotta}50`,
    backgroundColor: `${Colors.terracotta}06`,
  },

  // "Hiç yemedim" kart durumu
  cardNotEaten: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.line2,
    borderStyle: 'dashed',
    padding: 14,
    opacity: 0.7,
  },
  numBadgeNotEaten: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardNameNotEaten: {
    fontFamily: SERIF,
    fontSize: 15,
    color: Colors.ink3,
    textDecorationLine: 'line-through',
  },
  notEatenLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink4,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    marginLeft: 8,
  },
  restoreBtnText: {
    fontFamily: SERIF,
    fontSize: 11,
    color: Colors.ink2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 20,
  },
  numText: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.background,
    fontWeight: '700',
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  nameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 12,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameInputWrapChanged: {
    borderColor: `${Colors.terracotta}70`,
    backgroundColor: `${Colors.terracotta}08`,
  },
  nameInput: {
    flex: 1,
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  nameChangedDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: Colors.terracotta,
    marginLeft: 8,
  },
  reanalyzeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  reanalyzeText: {
    fontFamily: MONO,
    fontSize: 9.5,
    color: Colors.terracotta,
    letterSpacing: 0.4,
  },

  // Input + Yemedim butonu yatay satır
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // "Yemedim" toggle — input ile aynı hizada
  notEatenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FEF0EE',
    borderWidth: 1,
    borderColor: '#F4B3A8',
    flexShrink: 0,
  },
  notEatenToggleText: {
    fontFamily: SERIF,
    fontSize: 11,
    color: Colors.terracotta,
    fontWeight: '600',
  },

  section: { gap: 10 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  stepBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink2,
    letterSpacing: 0.4,
  },

  // Gramaj blok (sayı + hint)
  gramBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  gramNum: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 28,
  },
  gramUnit: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.ink3,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 16,
  },
  hintTilde: {
    fontFamily: SERIF,
    fontSize: 11,
    color: Colors.ink4,
  },
  hintText: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 11,
    color: Colors.ink3,
    textAlign: 'center',
  },

  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  preset: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  presetActive: {
    backgroundColor: Colors.ink,
    borderColor: 'transparent',
  },
  presetText: {
    fontFamily: SERIF,
    fontSize: 11,
    color: Colors.ink2,
  },
  presetTextActive: {
    color: Colors.background,
  },
  pctHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pctValueLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.terracotta,
    letterSpacing: 0.6,
  },
  pctTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 99,
    overflow: 'hidden',
  },
  pctFill: {
    height: '100%',
    backgroundColor: Colors.ink,
    borderRadius: 99,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewText: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 0.3,
  },
});

// ──────────────────────────── MAIN STYLES ────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  heroContainer: { width: SCREEN_WIDTH, height: PHOTO_HEIGHT, position: 'relative' },
  heroImage: { width: SCREEN_WIDTH, height: PHOTO_HEIGHT },
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
  editModeHeroOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.terracotta}DD`,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  editModeBadgeText: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1.8,
    fontWeight: '700',
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
  heroTime: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  heroNameWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    maxWidth: '70%',
  },
  heroNameText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    fontStyle: 'italic',
    flexShrink: 1,
  },
  heroNameInput: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
    fontStyle: 'italic',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    minWidth: 180,
    textAlign: 'center',
  },

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
  summaryStripEdit: {
    backgroundColor: `${Colors.ink}06`,
    borderBottomColor: Colors.line,
  },
  summaryCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500', marginBottom: 2 },
  summaryCalories: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.ink },
  summaryMacros: { flexDirection: 'row', gap: 6 },

  editHintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  editHintText: {
    flex: 1,
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 12.5,
    color: Colors.ink3,
    lineHeight: 18,
  },

  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sectionSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, fontWeight: '500' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    marginTop: 2,
    flexShrink: 0,
  },
  editBtnText: { fontFamily: SERIF, fontSize: 12, color: Colors.ink, fontStyle: 'italic' },

  foodList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  foodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  foodCardExpanded: { borderColor: Colors.line },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  foodCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  foodIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  foodIndex: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.ink2 },
  foodCardInfo: { flex: 1 },
  foodCardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  foodCardGrams: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  foodCardRight: { alignItems: 'flex-end', gap: 2, marginLeft: Spacing.sm },
  foodCardCalories: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  macroGrid: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingTop: 0 },

  editNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  editNoteReanalyze: {
    backgroundColor: `${Colors.terracotta}12`,
    borderColor: `${Colors.terracotta}35`,
  },
  editNoteText: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 12,
    color: Colors.ink3,
    flex: 1,
    lineHeight: 17,
  },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  cancelEditBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: { fontFamily: SERIF, fontSize: 14, color: Colors.ink2 },
  saveEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.ink,
  },
  saveEditBtnText: { fontFamily: SERIF, fontSize: 14, color: Colors.background },

  stickyActionsBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
  },

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
