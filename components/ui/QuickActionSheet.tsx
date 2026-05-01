import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
}

interface ActionItem {
  id: string;
  icon: string;
  label: string;
  hint: string;
  accent: boolean;
}

const ACTIONS: ActionItem[] = [
  { id: 'camera',   icon: 'camera',   label: 'Fotoğraf Çek',      hint: 'Tabağını tanıyalım',    accent: true  },
  { id: 'gallery',  icon: 'gallery',  label: 'Galeriden Seç',     hint: 'Mevcut bir fotoğraf',   accent: false },
  { id: 'fitbot',   icon: 'chat',     label: 'FitBot ile Konuş',  hint: 'Soru sor, plan kur',    accent: false },
  { id: 'water',    icon: 'drop',     label: 'Su Ekle',           hint: '+1 bardak · 240 ml',    accent: false },
  { id: 'weight',   icon: 'scale',    label: 'Anlık Kilo Kaydet', hint: 'Günün tartısı',         accent: false },
  { id: 'exercise', icon: 'steps',    label: 'Egzersiz Ekle',     hint: 'Yürüyüş, koşu, yoga…', accent: false },
];

const WATER_AMOUNTS = [
  { ml: 150, label: '150 ml' },
  { ml: 250, label: '250 ml' },
  { ml: 500, label: '500 ml' },
];

// ── SVG Quick Action Icons (from prototype) ──────────────────────────────────
function QAIcon({ kind, color }: { kind: string; color: string }) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'camera') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 8h3l2-2.5h6L17 8h3v11H4z" {...p} />
      <Circle cx={12} cy={13.5} r={3.8} {...p} />
      <Circle cx={12} cy={13.5} r={1.4} fill={color} stroke="none" />
    </Svg>
  );
  if (kind === 'gallery') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={4} y={5} width={16} height={14} rx={1.5} {...p} />
      <Path d="M4 16l4.5-5 3.5 4 2.5-2.5L20 16" {...p} />
      <Circle cx={9} cy={9.5} r={1.4} {...p} />
    </Svg>
  );
  if (kind === 'chat') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 6 H18 A2 2 0 0 1 20 8 V14 A2 2 0 0 1 18 16 H10 L6 19 V16 H4 A2 2 0 0 1 2 14 V8 A2 2 0 0 1 4 6 Z" {...p} />
      <Circle cx={8.5} cy={11} r={0.9} fill={color} stroke="none" />
      <Circle cx={12} cy={11} r={0.9} fill={color} stroke="none" />
      <Circle cx={15.5} cy={11} r={0.9} fill={color} stroke="none" />
    </Svg>
  );
  if (kind === 'drop') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M12 3.5 Q 6 11 6 15 A 6 6 0 0 0 18 15 Q 18 11 12 3.5 Z" {...p} />
      <Path d="M8.5 15.5 Q 10 17.5 12 17.5" {...p} strokeWidth={1} />
    </Svg>
  );
  if (kind === 'scale') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3.5} y={5.5} width={17} height={13} rx={2} {...p} />
      <Path d="M8 9v1M10 9v1.5M12 9v1M14 9v1.5M16 9v1" {...p} />
      <Path d="M9 15 L 12 12 L 15 15" {...p} />
    </Svg>
  );
  if (kind === 'steps') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M3 12 H7 L9 6 L13 18 L16 9 L18 12 H21" {...p} />
    </Svg>
  );
  return null;
}

export function QuickActionSheet({ visible, onClose, onOpenCamera, onOpenGallery }: QuickActionSheetProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addWaterLog, getWaterTotal } = useNutritionStore();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [showWaterPicker, setShowWaterPicker] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      setShowWaterPicker(false);
      setShowWeightInput(false);
      setWeightValue('');
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function showToast(message: string) {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  function closeSheet() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { onClose(); });
  }

  async function handleAction(id: string) {
    switch (id) {
      case 'camera':
        closeSheet();
        setTimeout(() => onOpenCamera(), 300);
        break;
      case 'gallery':
        closeSheet();
        setTimeout(() => onOpenGallery(), 300);
        break;
      case 'water':
        setShowWaterPicker(true);
        setShowWeightInput(false);
        break;
      case 'weight':
        setShowWeightInput(true);
        setShowWaterPicker(false);
        break;
      case 'exercise':
        closeSheet();
        setTimeout(() => router.push('/(tabs)/exercise'), 300);
        break;
      case 'fitbot':
        closeSheet();
        setTimeout(() => router.push('/(tabs)/ai-chat'), 300);
        break;
    }
  }

  async function addWater(amountMl: number) {
    if (!user) return;
    await addWaterLog(user.id, amountMl);
    const total = getWaterTotal() + amountMl;
    showToast(`💧 ${amountMl}ml su eklendi (toplam: ${(total / 1000).toFixed(1)}L)`);
    setShowWaterPicker(false);
    setTimeout(() => closeSheet(), 600);
  }

  async function saveWeight() {
    const weight = parseFloat(weightValue);
    if (isNaN(weight) || weight < 20 || weight > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo değeri girin (20-300 kg)');
      return;
    }
    if (!user) return;
    const { supabase } = require('../../lib/supabase');
    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg: weight,
      logged_at: new Date().toISOString(),
    });
    showToast(`⚖️ ${weight} kg kaydedildi`);
    setShowWeightInput(false);
    setWeightValue('');
    setTimeout(() => closeSheet(), 600);
  }

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} statusBarTranslucent animationType="none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeSheet} activeOpacity={1} />
      </Animated.View>

      {/* Toast */}
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 110,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>HIZLI İŞLEMLER</Text>
            <Text style={styles.title}>
              Ne <Text style={styles.titleAccent}>kaydedelim</Text>?
            </Text>
          </View>
          <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
            <Ionicons name="close" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main action list */}
        {!showWaterPicker && !showWeightInput && (
          <View style={styles.actionList}>
            {ACTIONS.map((action, i) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionRow, i > 0 && styles.actionRowBorder]}
                onPress={() => handleAction(action.id)}
                activeOpacity={0.65}
              >
                {/* Icon tile */}
                <View
                  style={[
                    styles.iconTile,
                    action.accent
                      ? { backgroundColor: Colors.accent }
                      : { backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.borderLight },
                  ]}
                >
                  <QAIcon
                    kind={action.icon}
                    color={action.accent ? Colors.background : Colors.textPrimary}
                  />
                </View>

                {/* Text */}
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionHint}>{action.hint}</Text>
                </View>

                {/* Chevron */}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Water Picker */}
        {showWaterPicker && (
          <View style={styles.subPanel}>
            <TouchableOpacity onPress={() => setShowWaterPicker(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.backText}>Geri</Text>
            </TouchableOpacity>
            <Text style={styles.subTitle}>💧 Ne kadar su içtin?</Text>
            <View style={styles.waterRow}>
              {WATER_AMOUNTS.map((w) => (
                <TouchableOpacity
                  key={w.ml}
                  style={styles.waterBtn}
                  onPress={() => addWater(w.ml)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.waterMl}>{w.ml}</Text>
                  <Text style={styles.waterUnit}>ml</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Weight Input */}
        {showWeightInput && (
          <View style={styles.subPanel}>
            <TouchableOpacity onPress={() => setShowWeightInput(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.backText}>Geri</Text>
            </TouchableOpacity>
            <Text style={styles.subTitle}>⚖️ Güncel kilonuz</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={weightValue}
                onChangeText={setWeightValue}
                placeholder="78.5"
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                selectTextOnFocus
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveWeight}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 32, 26, 0.36)',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    zIndex: 999,
  },
  toastText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    shadowColor: '#17201A',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.textMuted,
    opacity: 0.35,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overline: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 24,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  titleAccent: {
    fontStyle: 'italic',
    color: Colors.accent,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Action list
  actionList: {
    gap: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  actionRowBorder: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  actionHint: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  chevron: {
    fontFamily: SERIF,
    fontSize: 22,
    color: Colors.textFaint,
    lineHeight: 24,
  },

  // Sub-panels (water / weight)
  subPanel: {
    paddingTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  subTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  waterBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  waterMl: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  waterUnit: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  weightInput: {
    width: 140,
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: Spacing.sm,
  },
  weightUnit: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
