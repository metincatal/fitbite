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
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { FoodLogWithFood } from '../../types';
import { estimateNutritionFromText, generateGramVisualization, getCachedGramHint } from '../../lib/gemini';
import { estimateForManualInput } from '../../lib/nutritionEngine';

const { width: SW } = Dimensions.get('window');
const PHOTO_SIZE = SW - 44;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

const ENTRY_COLORS = ['#C9945A', '#7A9C4A', '#3A6D8C', '#8B5E83', '#4A8BA4', '#A06B50'];
function entryColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return ENTRY_COLORS[Math.abs(h) % ENTRY_COLORS.length];
}

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
  karesCount?: number;
  allImageUrls?: string[];
  onAddKare?: () => void;
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
  karesCount = 1,
  allImageUrls,
  onAddKare: _onAddKare,
  onNameChange,
  isEdited = false,
  onUpdateLog,
  onUpdateFoodName,
  onEditComplete,
  onSavingStateChange,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, EditValues>>({});
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const hintCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setEditingName(false);
      setEditMode(false);
      setNameText(mealName ?? '');
      setExpandedRows(new Set());
      setActiveImgIdx(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!editingName) setNameText(mealName ?? '');
  }, [mealName]);

  useEffect(() => {
    if (!editMode) setEditValues({});
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

  function cancelEdit() {
    setEditMode(false);
    setEditValues({});
    setOriginalNames({});
  }

  async function commitEdit() {
    if (!onUpdateLog) return;
    setSavingEdit(true);
    const savedEditValues = { ...editValues };
    const savedOriginalNames = { ...originalNames };
    const savedLogs = [...logs];
    onClose();
    onSavingStateChange?.(true);
    try {
      await Promise.all(
        savedLogs.map(async (l) => {
          const vals = savedEditValues[l.id];
          if (!vals) return;
          if (vals.notEaten) { if (onRemoveLog) await onRemoveLog(l.id); return; }
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
              calories = Math.round(engRes.kcal); protein = Math.round(engRes.protein * 10) / 10;
              carbs = Math.round(engRes.carbs * 10) / 10; fat = Math.round(engRes.fat * 10) / 10;
            } else {
              const r = await estimateNutritionFromText({ foodName, grams: finalGrams });
              calories = Math.round(r.calories); protein = Math.round(r.protein * 10) / 10;
              carbs = Math.round(r.carbs * 10) / 10; fat = Math.round(r.fat * 10) / 10;
            }
          } catch {}
          await onUpdateLog(l.id, { calories, protein, carbs, fat, serving_amount: finalGrams });
          if (nameChanged && onUpdateFoodName && l.food?.id)
            await onUpdateFoodName(l.food.id, foodName);
        })
      );
      setEditMode(false); setEditValues({}); setOriginalNames({});
      onEditComplete?.();
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

  const imageUrl = allImageUrls?.[activeImgIdx] ?? logs[0]?.image_url;
  const displayLogs = editMode
    ? logs.map((l) => {
        const v = editValues[l.id];
        if (!v || v.notEaten) return { ...l, calories: 0, protein: 0, carbs: 0, fat: 0, serving_amount: 0 };
        const f = v.pct / 100;
        return { ...l, calories: Math.round(l.calories * f), protein: Math.round(l.protein * f * 10) / 10, carbs: Math.round(l.carbs * f * 10) / 10, fat: Math.round(l.fat * f * 10) / 10, serving_amount: Math.round(v.serving_amount * f) };
      })
    : logs;

  const totalCalories = displayLogs.reduce((s, l) => s + l.calories, 0);
  const loggedTime = logs[0]?.logged_at
    ? new Date(logs[0].logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const canEdit = !isEdited && !!onUpdateLog && logs.length > 0;
  const effectiveKaresCount = allImageUrls?.length ?? karesCount;
  const anyNameChanged = editMode && Object.entries(editValues).some(
    ([id, v]) => !v.notEaten && v.food_name.trim() !== (originalNames[id] ?? '')
  );
  const notEatenCount = editMode ? Object.values(editValues).filter((v) => v.notEaten).length : 0;
  const foodNames = logs.map((l) => l.food?.name_tr ?? l.food?.name ?? '').filter(Boolean);
  const displayMealName = editingName ? nameText : (mealName ?? foodNames[0] ?? 'Öğün');
  const placeholderText = (mealName ?? foodNames[0] ?? 'ÖĞÜN').slice(0, 5).toUpperCase();
  const karePad = (n: number) => String(n).padStart(2, '0');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={editMode ? cancelEdit : onClose}
    >
      <View style={s.root}>
        {/* ── Header Bar ── */}
        <SafeAreaView edges={['top']} style={s.headerSafe}>
          <View style={s.headerBar}>
            <TouchableOpacity
              onPress={editMode ? cancelEdit : onClose}
              style={s.headerCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={Colors.ink} />
            </TouchableOpacity>

            <Text style={s.headerCenter}>
              {loggedTime}{' '}
              <Text style={s.headerCenterKcal}>
                · {Math.round(totalCalories)} KCAL
              </Text>
            </Text>

            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Photo ── */}
            <View style={s.photoSection}>
              <View style={s.photoWrapper}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={s.photoImg} resizeMode="cover" />
                ) : (
                  <View style={[s.photoImg, { backgroundColor: entryColor(placeholderText) }]}>
                    <Text style={s.photoPlaceholder}>{placeholderText}</Text>
                  </View>
                )}
                <View style={s.karePill}>
                  <Text style={s.karePillText}>KARE {karePad(activeImgIdx + 1)} / {karePad(effectiveKaresCount)}</Text>
                </View>
              </View>
            </View>

            {/* ── Thumbnail strip (when multiple kares) ── */}
            {effectiveKaresCount > 1 && allImageUrls && allImageUrls.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.thumbStripContent}
                style={s.thumbStrip}
              >
                {allImageUrls.map((imgUrl, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setActiveImgIdx(i)}
                    activeOpacity={0.8}
                    style={i === activeImgIdx ? s.thumbActive : s.thumbInactive}
                  >
                    <Image source={{ uri: imgUrl }} style={s.thumbImg} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* ── Meal Name + Ingredients ── */}
            {!editMode && (
              <View style={s.mealNameSection}>
                {editingName ? (
                  <TextInput
                    ref={nameInputRef}
                    style={s.mealNameInput}
                    value={nameText}
                    onChangeText={setNameText}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={commitNameEdit}
                    onBlur={commitNameEdit}
                  />
                ) : (
                  <TouchableOpacity onPress={() => { setNameText(mealName ?? ''); setEditingName(true); }} activeOpacity={0.8}>
                    <Text style={s.mealNameTitle}>{displayMealName}</Text>
                  </TouchableOpacity>
                )}
                {foodNames.length > 0 && (
                  <Text style={s.mealNameSub} numberOfLines={2}>
                    {foodNames.join(' · ')}
                  </Text>
                )}
              </View>
            )}

            {/* ── Section Header ── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>
                {effectiveKaresCount > 1 ? `KARE 1 · ` : ''}TESPİT EDİLEN
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {canEdit && !editMode && (
                  <TouchableOpacity style={s.editBtn} onPress={enterEditMode} activeOpacity={0.8}>
                    <Ionicons name="create-outline" size={13} color={Colors.ink} />
                    <Text style={s.editBtnText}>Düzenle</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Edit hint ── */}
            {editMode && (
              <View style={s.editHintBanner}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.ink3} />
                <Text style={s.editHintText}>
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>Besin adını</Text> veya{' '}
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>gramajı</Text> değiştirirsen
                  makrolar AI ile yeniden hesaplanır. Yemediğini{' '}
                  <Text style={{ color: Colors.ink, fontWeight: '700' }}>çıkarabilirsin</Text>.
                </Text>
              </View>
            )}

            {/* ── Food List ── */}
            <View style={s.foodList}>
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
                const isExpanded = expandedRows.has(log.id);
                return (
                  <TouchableOpacity key={log.id} onPress={() => toggleRow(log.id)} activeOpacity={0.75}>
                    <View style={s.foodRow}>
                      <View style={s.foodRowNum}>
                        <Text style={s.foodRowNumText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.foodRowName}>{foodName}</Text>
                        <Text style={s.foodRowGrams}>~{log.serving_amount}g</Text>
                      </View>
                      <View style={s.foodRowRight}>
                        <Text style={s.foodRowKcal}>{Math.round(log.calories)} kcal</Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.ink4} style={{ marginTop: 2 }} />
                      </View>
                    </View>
                    {isExpanded && (
                      <View style={s.macroRow}>
                        <View style={s.macroPill}>
                          <Text style={s.macroPillLabel}>P</Text>
                          <Text style={s.macroPillVal}>{log.protein}g</Text>
                        </View>
                        <View style={s.macroPill}>
                          <Text style={s.macroPillLabel}>K</Text>
                          <Text style={s.macroPillVal}>{log.carbs}g</Text>
                        </View>
                        <View style={s.macroPill}>
                          <Text style={s.macroPillLabel}>Y</Text>
                          <Text style={s.macroPillVal}>{log.fat}g</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Edit actions ── */}
            {editMode && (
              <View style={s.editActionsWrap}>
                <View style={[s.editNote, anyNameChanged && s.editNoteReanalyze]}>
                  <Ionicons name={anyNameChanged ? 'sparkles' : 'sparkles-outline'} size={13} color={anyNameChanged ? Colors.terracotta : Colors.ink3} />
                  <Text style={[s.editNoteText, anyNameChanged && { color: Colors.ink }]}>
                    {anyNameChanged ? 'Besin adı değiştirildi — kayıtta yeni AI analizi çalışacak' : 'Kayıtta makrolar AI ile otomatik hesaplanır'}
                  </Text>
                </View>
                <View style={s.editActions}>
                  <TouchableOpacity style={s.cancelEditBtn} onPress={cancelEdit} disabled={savingEdit}>
                    <Text style={s.cancelEditBtnText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.saveEditBtn, savingEdit && { opacity: 0.65 }]} onPress={commitEdit} disabled={savingEdit} activeOpacity={0.85}>
                    {savingEdit
                      ? <><ActivityIndicator size="small" color={Colors.background} /><Text style={s.saveEditBtnText}>Hesaplanıyor…</Text></>
                      : <><Ionicons name="checkmark" size={15} color={Colors.background} /><Text style={s.saveEditBtnText}>Değişiklikleri Kaydet</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Delete All ── */}
            {!editMode && (
              <TouchableOpacity style={s.deleteAllBtn} onPress={onRemoveAll}>
                <Ionicons name="trash-outline" size={15} color="#E74C3C" />
                <Text style={s.deleteAllText}>Bu öğünü günlükten kaldır</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ──────────────────────────── EDITABLE CARD ────────────────────────────
const PCT_PRESETS = [25, 50, 75, 100];
const GRAM_PRESETS = [50, 100, 150, 200, 300];

function EditableCard({
  index, originalName, values, hintCache, onChange,
}: {
  index: number;
  originalName: string;
  values: EditValues;
  hintCache: React.MutableRefObject<Record<string, string>>;
  onChange: (patch: Partial<EditValues>) => void;
}) {
  const [gramHint, setGramHint] = useState<string | null>(() => {
    const name = values?.food_name || originalName;
    const grams = values?.serving_amount ?? 0;
    const cached = getCachedGramHint(name, grams);
    if (cached) hintCache.current[`${name}_${grams}`] = cached;
    return cached ?? null;
  });
  const [hintLoading, setHintLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchHint = useCallback(async (name: string, grams: number) => {
    const localKey = `${name}_${grams}`;
    if (hintCache.current[localKey]) { setGramHint(hintCache.current[localKey]); return; }
    const moduleHit = getCachedGramHint(name, grams);
    if (moduleHit) { hintCache.current[localKey] = moduleHit; setGramHint(moduleHit); return; }
    setHintLoading(true);
    try {
      const hint = await generateGramVisualization(name, grams);
      hintCache.current[localKey] = hint;
      setGramHint(hint);
    } catch { setGramHint(null); } finally { setHintLoading(false); }
  }, [hintCache]);

  useEffect(() => { if (!values?.notEaten && !gramHint) fetchHint(values.food_name || originalName, values.serving_amount); }, []);
  useEffect(() => {
    if (!values || values.notEaten) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchHint(values.food_name || originalName, values.serving_amount), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [values?.food_name, values?.serving_amount, values?.notEaten]);

  if (!values) return null;
  const nameChanged = values.food_name.trim() !== originalName;
  const finalGrams = Math.max(1, Math.round(values.serving_amount * values.pct / 100));

  if (values.notEaten) {
    return (
      <View style={es.cardNotEaten}>
        <View style={es.cardHeader}>
          <View style={es.numBadgeNotEaten}><Ionicons name="close" size={12} color={Colors.ink3} /></View>
          <View style={{ flex: 1 }}>
            <Text style={es.cardNameNotEaten} numberOfLines={1}>{values.food_name || originalName}</Text>
            <Text style={es.notEatenLabel}>Günlüğe eklenmeyecek</Text>
          </View>
          <TouchableOpacity style={es.restoreBtn} onPress={() => onChange({ notEaten: false })} activeOpacity={0.8}>
            <Ionicons name="arrow-undo-outline" size={13} color={Colors.ink2} />
            <Text style={es.restoreBtnText}>Geri al</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[es.card, nameChanged && es.cardHighlighted]}>
      <View style={es.cardHeader}>
        <View style={es.numBadge}><Text style={es.numText}>{index + 1}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={es.fieldLabel}>BESİN ADI</Text>
          <View style={es.nameRow}>
            <View style={[es.nameInputWrap, nameChanged && es.nameInputWrapChanged, { flex: 1 }]}>
              <TextInput style={es.nameInput} value={values.food_name} onChangeText={(t) => onChange({ food_name: t })} placeholder="Besin adı…" placeholderTextColor={Colors.ink4} returnKeyType="done" />
              {nameChanged && <View style={es.nameChangedDot} />}
            </View>
            <TouchableOpacity style={es.notEatenToggle} onPress={() => onChange({ notEaten: true })} activeOpacity={0.75}>
              <Ionicons name="close-circle" size={14} color={Colors.terracotta} />
              <Text style={es.notEatenToggleText}>Yemedim</Text>
            </TouchableOpacity>
          </View>
          {nameChanged && <View style={es.reanalyzeBadge}><Ionicons name="sparkles" size={10} color={Colors.terracotta} /><Text style={es.reanalyzeText}>Yeni analiz yapılacak</Text></View>}
        </View>
      </View>

      <View style={es.section}>
        <Text style={es.fieldLabel}>GRAMAJ</Text>
        <View style={es.stepperRow}>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ serving_amount: Math.max(5, values.serving_amount - 10) })}><Text style={es.stepBtnText}>−10</Text></TouchableOpacity>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ serving_amount: Math.max(5, values.serving_amount - 5) })}><Text style={es.stepBtnText}>−5</Text></TouchableOpacity>
          <View style={es.gramBlock}>
            <Text style={es.gramNum}>{values.serving_amount}<Text style={es.gramUnit}>g</Text></Text>
            <View style={es.hintRow}>
              {hintLoading ? <ActivityIndicator size="small" color={Colors.ink4} style={{ transform: [{ scale: 0.6 }] }} /> : gramHint ? <><Text style={es.hintTilde}>≈</Text><Text style={es.hintText}>{gramHint}</Text></> : null}
            </View>
          </View>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ serving_amount: values.serving_amount + 5 })}><Text style={es.stepBtnText}>+5</Text></TouchableOpacity>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ serving_amount: values.serving_amount + 10 })}><Text style={es.stepBtnText}>+10</Text></TouchableOpacity>
        </View>
        <View style={es.presetRow}>
          {GRAM_PRESETS.map((p) => (
            <TouchableOpacity key={p} style={[es.preset, values.serving_amount === p && es.presetActive]} onPress={() => onChange({ serving_amount: p })}>
              <Text style={[es.presetText, values.serving_amount === p && es.presetTextActive]}>{p}g</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={es.section}>
        <View style={es.pctHeaderRow}>
          <Text style={es.fieldLabel}>NE KADARINI YEDİN?</Text>
          <Text style={es.pctValueLabel}>%{values.pct}</Text>
        </View>
        <View style={es.presetRow}>
          {PCT_PRESETS.map((p) => (
            <TouchableOpacity key={p} style={[es.preset, values.pct === p && es.presetActive]} onPress={() => onChange({ pct: p })}>
              <Text style={[es.presetText, values.pct === p && es.presetTextActive]}>{p === 100 ? 'Hepsi' : `%${p}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={es.stepperRow}>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ pct: Math.max(5, values.pct - 10) })}><Text style={es.stepBtnText}>−10</Text></TouchableOpacity>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ pct: Math.max(5, values.pct - 5) })}><Text style={es.stepBtnText}>−5</Text></TouchableOpacity>
          <View style={es.pctTrack}><View style={[es.pctFill, { width: `${Math.min(100, values.pct)}%` }]} /></View>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ pct: Math.min(200, values.pct + 5) })}><Text style={es.stepBtnText}>+5</Text></TouchableOpacity>
          <TouchableOpacity style={es.stepBtn} onPress={() => onChange({ pct: Math.min(200, values.pct + 10) })}><Text style={es.stepBtnText}>+10</Text></TouchableOpacity>
        </View>
        <View style={es.previewRow}>
          <Ionicons name="checkmark-circle-outline" size={12} color={Colors.ink4} />
          <Text style={es.previewText}>
            Kaydedilecek: <Text style={{ color: Colors.ink, fontFamily: SERIF }}>{finalGrams}g</Text>
            {values.pct !== 100 && <Text style={{ color: Colors.ink3 }}> ({values.serving_amount}g × %{values.pct})</Text>}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────── MAIN STYLES ────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  headerSafe: { backgroundColor: Colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { fontFamily: MONO, fontSize: 12, color: Colors.ink3, letterSpacing: 0.6 },
  headerCenterKcal: { color: Colors.ink, fontWeight: '700' },
  addKareBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: Colors.line, backgroundColor: Colors.background },
  addKareBtnText: { fontFamily: MONO, fontSize: 10.5, color: Colors.terracotta, letterSpacing: 1.2, fontWeight: '700' },

  photoSection: { paddingHorizontal: 22, paddingTop: 16 },
  photoWrapper: { position: 'relative', borderRadius: 22, overflow: 'hidden' },
  photoImg: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 22 },
  photoPlaceholder: { fontFamily: MONO, fontSize: 28, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  karePill: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(23,32,26,0.82)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  karePillText: { fontFamily: MONO, fontSize: 10, color: '#F2EFE6', letterSpacing: 1.6 },

  thumbStrip: { marginTop: 12, flexGrow: 0 },
  thumbStripContent: { paddingHorizontal: 22, gap: 8, alignItems: 'center' },
  thumbActive: { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', borderWidth: 2.5, borderColor: Colors.ink },
  thumbInactive: { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.line },
  thumbImg: { width: '100%', height: '100%' },

  mealNameSection: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 4 },
  mealNameTitle: { fontFamily: SERIF, fontSize: 28, color: Colors.ink, lineHeight: 32 },
  mealNameInput: { fontFamily: SERIF, fontSize: 28, color: Colors.ink, lineHeight: 32, borderBottomWidth: 1.5, borderBottomColor: Colors.terracotta, paddingBottom: 4 },
  mealNameSub: { fontSize: 13, color: Colors.ink3, marginTop: 5, lineHeight: 18 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  sectionLabel: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 1.8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  editBtnText: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: Colors.ink },

  editHintBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 22, marginBottom: 10, padding: 12, borderRadius: 14, backgroundColor: Colors.surfaceSecondary, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  editHintText: { flex: 1, fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: Colors.ink3, lineHeight: 17 },

  foodList: { paddingHorizontal: 22, gap: 2 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line2 },
  foodRowNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  foodRowNumText: { fontFamily: MONO, fontSize: 10, color: Colors.background, fontWeight: '700' },
  foodRowName: { fontFamily: SERIF, fontSize: 15, color: Colors.ink, lineHeight: 18 },
  foodRowGrams: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, marginTop: 2, letterSpacing: 0.4 },
  foodRowRight: { alignItems: 'flex-end', gap: 2 },
  foodRowKcal: { fontFamily: MONO, fontSize: 12, color: Colors.ink, letterSpacing: 0.4 },
  macroRow: { flexDirection: 'row', gap: 6, paddingLeft: 40, paddingBottom: 10, paddingTop: 2 },
  macroPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  macroPillLabel: { fontFamily: MONO, fontSize: 9, color: Colors.ink3, letterSpacing: 1 },
  macroPillVal: { fontFamily: MONO, fontSize: 11, color: Colors.ink, letterSpacing: 0.4 },

  editActionsWrap: { paddingHorizontal: 22, marginTop: 16, gap: 10 },
  editNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: Colors.surfaceSecondary, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  editNoteReanalyze: { backgroundColor: `${Colors.terracotta}12`, borderColor: `${Colors.terracotta}35` },
  editNoteText: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: Colors.ink3, flex: 1, lineHeight: 17 },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelEditBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  cancelEditBtnText: { fontFamily: SERIF, fontSize: 14, color: Colors.ink2 },
  saveEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, backgroundColor: Colors.ink },
  saveEditBtnText: { fontFamily: SERIF, fontSize: 14, color: Colors.background },

  deleteAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 22, marginTop: 24, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  deleteAllText: { fontSize: FontSize.sm, color: '#E74C3C', fontWeight: '600' },
});

// ──────────────────────────── EDITABLE CARD STYLES ────────────────────────────
const es = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.line, padding: 16, gap: 18 },
  cardHighlighted: { borderColor: `${Colors.terracotta}50`, backgroundColor: `${Colors.terracotta}06` },
  cardNotEaten: { backgroundColor: Colors.surfaceSecondary, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.line2, borderStyle: 'dashed', padding: 14, opacity: 0.7 },
  numBadgeNotEaten: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.line2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardNameNotEaten: { fontFamily: SERIF, fontSize: 15, color: Colors.ink3, textDecorationLine: 'line-through' },
  notEatenLabel: { fontFamily: MONO, fontSize: 9, color: Colors.ink4, letterSpacing: 1.2, marginTop: 3 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, marginLeft: 8 },
  restoreBtnText: { fontFamily: SERIF, fontSize: 11, color: Colors.ink2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  numBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 20 },
  numText: { fontFamily: MONO, fontSize: 11, color: Colors.background, fontWeight: '700' },
  fieldLabel: { fontFamily: MONO, fontSize: 9, color: Colors.ink3, letterSpacing: 1.6, marginBottom: 6 },
  nameInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 8 },
  nameInputWrapChanged: { borderColor: `${Colors.terracotta}70`, backgroundColor: `${Colors.terracotta}08` },
  nameInput: { flex: 1, fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: Colors.ink, padding: 0 },
  nameChangedDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: Colors.terracotta, marginLeft: 8 },
  reanalyzeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  reanalyzeText: { fontFamily: MONO, fontSize: 9.5, color: Colors.terracotta, letterSpacing: 0.4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notEatenToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FEF0EE', borderWidth: 1, borderColor: '#F4B3A8', flexShrink: 0 },
  notEatenToggleText: { fontFamily: SERIF, fontSize: 11, color: Colors.terracotta, fontWeight: '600' },
  section: { gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  stepBtnText: { fontFamily: MONO, fontSize: 10, color: Colors.ink2, letterSpacing: 0.4 },
  gramBlock: { flex: 1, alignItems: 'center', gap: 3 },
  gramNum: { fontFamily: SERIF, fontSize: 26, color: Colors.ink, lineHeight: 28 },
  gramUnit: { fontFamily: MONO, fontSize: 12, color: Colors.ink3 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 16 },
  hintTilde: { fontFamily: SERIF, fontSize: 11, color: Colors.ink4 },
  hintText: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: Colors.ink3, textAlign: 'center' },
  presetRow: { flexDirection: 'row', gap: 6 },
  preset: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  presetActive: { backgroundColor: Colors.ink, borderColor: 'transparent' },
  presetText: { fontFamily: SERIF, fontSize: 11, color: Colors.ink2 },
  presetTextActive: { color: Colors.background },
  pctHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctValueLabel: { fontFamily: MONO, fontSize: 11, color: Colors.terracotta, letterSpacing: 0.6 },
  pctTrack: { flex: 1, height: 4, backgroundColor: Colors.surfaceSecondary, borderRadius: 99, overflow: 'hidden' },
  pctFill: { height: '100%', backgroundColor: Colors.ink, borderRadius: 99 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewText: { fontFamily: MONO, fontSize: 10, color: Colors.ink3, letterSpacing: 0.3 },
});
