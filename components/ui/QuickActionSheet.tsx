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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
}

interface ActionItem {
  id: string;
  icon: IoniconName;
  label: string;
  sublabel: string;
  bgColor: string;
  iconColor: string;
}

const ACTIONS: ActionItem[] = [
  { id: 'camera', icon: 'camera', label: 'Fotoğraf Çek', sublabel: 'AI ile analiz', bgColor: '#EDF6FF', iconColor: '#2563EB' },
  { id: 'gallery', icon: 'images', label: 'Galeriden Seç', sublabel: 'Önceki fotoğraf', bgColor: '#F5F0FF', iconColor: '#7C3AED' },
  { id: 'water', icon: 'water', label: 'Su Ekle', sublabel: 'Hızlı kayıt', bgColor: '#ECFEFF', iconColor: '#0891B2' },
  { id: 'weight', icon: 'scale-outline', label: 'Kilo Kaydet', sublabel: 'Anlık ölçüm', bgColor: '#FFF7ED', iconColor: '#EA580C' },
  { id: 'exercise', icon: 'barbell', label: 'Egzersiz Ekle', sublabel: 'Aktivite kayıt', bgColor: '#FEF2F2', iconColor: '#DC2626' },
  { id: 'fitbot', icon: 'chatbubble-ellipses', label: 'FitBot\'a Sor', sublabel: 'AI diyetisyen', bgColor: '#ECFDF5', iconColor: '#059669' },
];

// Premium Renkli Simgeler ve Tanımlamalar
const WATER_AMOUNTS: { ml: number; label: string; icon: IoniconName; size: number; iconColor: string; bgColor: string }[] = [
  { ml: 150, label: '150 ml', icon: 'cafe', size: 24, iconColor: '#2563EB', bgColor: '#DBEAFE' },     // Koyu Mavi & Açık Zemin
  { ml: 250, label: '250 ml', icon: 'pint', size: 32, iconColor: '#0891B2', bgColor: '#CFFAFE' },     // Cyan & Açık Cyan
  { ml: 500, label: '500 ml', icon: 'flask', size: 38, iconColor: '#059669', bgColor: '#D1FAE5' },    // Premium Zümrüt Yeşili
];

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
    return () => {
      showSub.remove();
      hideSub.remove();
    };
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
    ]).start(() => {
      onClose();
    });
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
      <Animated.View style={[
        styles.sheet, 
        { 
          transform: [{ translateY: slideAnim }],
          paddingBottom: keyboardHeight + (Platform.OS === 'ios' ? 34 : 16)
        }
      ]}>
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Hızlı İşlemler</Text>
          <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action Grid */}
        {!showWaterPicker && !showWeightInput && (
          <View style={styles.grid}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleAction(action.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon} size={26} color={action.iconColor} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSublabel}>{action.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Water Picker */}
        {showWaterPicker && (
          <View style={styles.subPanel}>
            <TouchableOpacity onPress={() => setShowWaterPicker(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
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
                  <View style={[styles.waterIconCircle, { backgroundColor: w.bgColor }]}>
                    <Ionicons name={w.icon} size={w.size} color={w.iconColor} />
                  </View>
                  <Text style={styles.waterLabel}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Weight Input */}
        {showWeightInput && (
          <View style={styles.subPanel}>
            <TouchableOpacity onPress={() => setShowWeightInput(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  actionSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  subPanel: {
    marginBottom: Spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  subTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
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
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    shadowColor: Colors.textSecondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  waterIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  waterLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
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
