import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, ACTIVITY_LEVELS, GOALS, DIET_TYPES, TTM_STAGES, ActivityLevel, Goal, DietType, OccupationalActivity, ExerciseFrequency, BodyFatBand } from '../../lib/constants';
import { calculateBMI, getBMICategory, calculateMacroGoals, calculateBMR, UserMetrics } from '../../lib/nutrition';
import { supabase } from '../../lib/supabase';
import {
  WaterReminderSettings,
  MealReminderSettings,
  StepReminderSettings,
  MotivationSettings,
  DEFAULT_SETTINGS,
  DEFAULT_MEAL_SETTINGS,
  DEFAULT_STEP_SETTINGS,
  DEFAULT_MOTIVATION_SETTINGS,
  loadReminderSettings,
  saveReminderSettings,
  scheduleWaterReminders,
  cancelWaterReminders,
  requestNotificationPermissions,
  loadMealReminderSettings,
  saveMealReminderSettings,
  scheduleMealReminders,
  cancelMealReminders,
  loadStepReminderSettings,
  saveStepReminderSettings,
  scheduleStepReminder,
  cancelStepReminder,
  loadMotivationSettings,
  saveMotivationSettings,
  scheduleMotivationMessages,
  cancelMotivationMessages,
  scheduleWeeklyReport,
} from '../../lib/notifications';
import { Pedometer } from 'expo-sensors';
import { useActivityStore } from '../../store/activityStore';
import {
  isHealthConnectAvailable,
  requestHealthConnectPermissions,
  getHealthConnectStepsToday,
} from '../../lib/healthConnect';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });

// Tab bar yüksekliği (BAR_H 58 + bottom 14/26 + boşluk) — ScrollView altı için.
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 120 : 110;

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, signOut, setProfile } = useAuthStore();
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<WaterReminderSettings>(DEFAULT_SETTINGS);
  const [savingNotif, setSavingNotif] = useState(false);

  // Öğün hatırlatıcıları
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealSettings, setMealSettings] = useState<MealReminderSettings>(DEFAULT_MEAL_SETTINGS);
  const [savingMeal, setSavingMeal] = useState(false);

  // Adım hedefi hatırlatıcısı
  const [stepSettings, setStepSettings] = useState<StepReminderSettings>(DEFAULT_STEP_SETTINGS);

  // Motivasyon mesajları
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [motivationSettings, setMotivationSettings] = useState<MotivationSettings>(DEFAULT_MOTIVATION_SETTINGS);
  const [savingMotivation, setSavingMotivation] = useState(false);

  // Haftalık rapor
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);

  // Profil düzenleme
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', weight_kg: '', goal: '', weekly_weight_goal_kg: 0, diet_type: '', activity_level: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<Goal | null>(null);
  const [pendingRate, setPendingRate] = useState(0.5);

  // Gizlilik & Güvenlik
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Pedometer / Fiziksel Aktivite
  const { isAvailable, permissionGranted } = useActivityStore();
  const [checkingPedometer, setCheckingPedometer] = useState(false);

  // Health Connect (Android — opsiyonel arka plan adım kaynağı)
  type HCState = 'checking' | 'unavailable' | 'available' | 'connected';
  const [hcState, setHcState] = useState<HCState>('checking');
  const [hcRequesting, setHcRequesting] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadReminderSettings().then(setReminderSettings);
    loadMealReminderSettings().then(setMealSettings);
    loadStepReminderSettings().then(setStepSettings);
    loadMotivationSettings().then(setMotivationSettings);
    import('@react-native-async-storage/async-storage').then(({ default: AS }) =>
      AS.getItem('weekly_report_enabled').then((v) => setWeeklyReportEnabled(v === 'true'))
    );

    refreshHealthConnectState();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadProfilePhoto(user.id);
  }, [user?.id]);

  async function loadProfilePhoto(userId: string) {
    const stored = await AsyncStorage.getItem(`fitbite_profile_avatar_uri_${userId}`);
    setProfileImageUri(stored);
  }

  async function saveProfilePhoto(uri: string) {
    if (!user) return;
    await AsyncStorage.setItem(`fitbite_profile_avatar_uri_${user.id}`, uri);
    setProfileImageUri(uri);
  }

  async function pickProfilePhoto(source: 'camera' | 'gallery') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('İzin Gerekli', source === 'camera'
        ? 'Kamera ile fotoğraf çekmek için izin vermen gerekiyor.'
        : 'Galeriden fotoğraf seçmek için izin vermen gerekiyor.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    await saveProfilePhoto(result.assets[0].uri);
  }

  function handleProfilePhotoPress() {
    Alert.alert('Profil Görseli', 'Görsel kaynağını seç', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kamera', onPress: () => pickProfilePhoto('camera') },
      { text: 'Galeri', onPress: () => pickProfilePhoto('gallery') },
    ]);
  }

  function handleRemoveProfilePhoto() {
    Alert.alert(
      'Fotoğrafı Kaldır',
      'Profil fotoğrafını kaldırmak istiyor musun?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            if (!user) return;
            AsyncStorage.removeItem(`fitbite_profile_avatar_uri_${user.id}`);
            setProfileImageUri(null);
          },
        },
      ]
    );
  }

  async function refreshHealthConnectState() {
    if (Platform.OS !== 'android') {
      setHcState('unavailable');
      return;
    }
    setHcState('checking');
    try {
      const available = await isHealthConnectAvailable();
      if (!available) {
        setHcState('unavailable');
        return;
      }
      const steps = await getHealthConnectStepsToday();
      setHcState(steps !== null ? 'connected' : 'available');
    } catch {
      setHcState('unavailable');
    }
  }

  async function handleHealthConnectPress() {
    if (Platform.OS !== 'android') return;

    if (hcState === 'unavailable') {
      Alert.alert(
        'Health Connect Yok',
        'Bu özelliği kullanmak için Play Store\'dan "Health Connect" uygulamasını yüklemen gerekiyor. Android 14 ve sonrasında genelde yüklü gelir.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Play Store',
            onPress: () => Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
              Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')
            ),
          },
        ]
      );
      return;
    }

    if (hcState === 'connected') {
      Alert.alert(
        'Health Connect Bağlı',
        'Adım verilerin Health Connect üzerinden senkronize ediliyor. Bağlantıyı kesmek için Health Connect uygulamasından FitBite\'ın izinlerini kaldırabilirsin.',
        [
          { text: 'Tamam', style: 'default' },
          {
            text: 'Health Connect Aç',
            onPress: () => Linking.openURL('package:com.google.android.apps.healthdata').catch(() =>
              Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => {})
            ),
          },
        ]
      );
      return;
    }

    setHcRequesting(true);
    try {
      const granted = await requestHealthConnectPermissions();
      if (granted) {
        setHcState('connected');
        Alert.alert(
          'Bağlandı',
          'Health Connect adım verilerine erişim izni verildi. Uygulama kapalıyken sayılan adımlar artık otomatik senkronize olacak.'
        );
      } else {
        Alert.alert(
          'İzin Verilmedi',
          'Adım verilerine erişim izni alınamadı. Health Connect uygulamasından FitBite\'a izin vererek tekrar deneyebilirsin.'
        );
        await refreshHealthConnectState();
      }
    } finally {
      setHcRequesting(false);
    }
  }

  function openEditModal() {
    if (!profile) return;
    setEditData({
      name: profile.name,
      weight_kg: profile.weight_kg.toString(),
      goal: profile.goal,
      weekly_weight_goal_kg: profile.weekly_weight_goal_kg ?? (profile.goal === 'gain' ? -0.25 : profile.goal === 'lose' ? 0.5 : 0),
      diet_type: profile.diet_type,
      activity_level: profile.activity_level,
    });
    setPendingGoal(null);
    setShowEditModal(true);
  }

  async function saveProfile() {
    if (!user || !profile) return;
    const weight = parseFloat(editData.weight_kg.trim().replace(',', '.'));
    if (!editData.name.trim()) {
      Alert.alert('Hata', 'İsim boş bırakılamaz');
      return;
    }
    if (isNaN(weight) || weight < 20 || weight > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo değeri girin (20-300 kg)');
      return;
    }
    setSavingEdit(true);
    const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
    const metrics: UserMetrics = {
      gender: profile.gender,
      age,
      height_cm: profile.height_cm,
      weight_kg: weight,
      activity_level: editData.activity_level as ActivityLevel,
      goal: editData.goal as Goal,
    };
    const macros = calculateMacroGoals(metrics, editData.weekly_weight_goal_kg);
    const { data } = await supabase
      .from('profiles')
      .update({
        name: editData.name.trim(),
        weight_kg: weight,
        goal: editData.goal as Goal,
        weekly_weight_goal_kg: editData.weekly_weight_goal_kg,
        diet_type: editData.diet_type as DietType,
        activity_level: editData.activity_level as ActivityLevel,
        daily_calorie_goal: macros.calories,
        daily_protein_goal: macros.protein_g,
        daily_carbs_goal: macros.carbs_g,
        daily_fat_goal: macros.fat_g,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();
    const goalChanged = editData.goal !== profile?.goal;
    setSavingEdit(false);
    if (data) {
      setProfile(data);
      setShowEditModal(false);
      Alert.alert(
        'Kaydedildi',
        goalChanged
          ? `Hedefin "${GOALS[editData.goal as Goal]?.label}" olarak güncellendi. Yeni günlük kalori hedefin: ${macros.calories} kcal.`
          : 'Profilin güncellendi.',
      );
    } else {
      Alert.alert('Hata', 'Profil güncellenemedi. Tekrar deneyin.');
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'fitbite://reset-password',
    });
    setSendingReset(false);
    if (error) {
      Alert.alert('Hata', 'E-posta gönderilemedi. Lütfen tekrar deneyin.');
    } else {
      Alert.alert('E-posta Gönderildi', `${user.email} adresine şifre sıfırlama bağlantısı gönderildi.`);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı Sil',
      'Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Emin misin?',
              'Bu işlem geri alınamaz. Hesabın ve tüm verilerin silinecek.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Evet, Sil', style: 'destructive', onPress: confirmDeleteAccount },
              ]
            );
          },
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    if (!user) return;
    setSendingReset(true); // loading göstergesi olarak yeniden kullan
    try {
      const uid = user.id;
      const tables = ['food_logs', 'water_logs', 'weight_logs', 'exercise_logs', 'chat_messages', 'body_measurements', 'profiles'] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', uid);
        if (error) console.warn(`${table} silinemedi:`, error.message);
      }
      // Auth kaydını sil (Edge Function gerekiyor — yoksa sadece oturum kapatılır)
      await supabase.functions.invoke('delete-user').catch(() => {});
      router.replace('/(auth)/register');
      await signOut();
    } catch (e) {
      Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSendingReset(false);
    }
  }

  async function handleNotifToggle(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'İzin Gerekli',
          'Bildirim göndermek için izin vermeniz gerekiyor. Ayarlar > FitBite > Bildirimler bölümünden etkinleştirin.'
        );
        return;
      }
    }
    const updated = { ...reminderSettings, enabled: value };
    setReminderSettings(updated);
  }

  async function handleSaveNotifSettings() {
    setSavingNotif(true);
    await saveReminderSettings(reminderSettings);
    if (reminderSettings.enabled) {
      await scheduleWaterReminders(reminderSettings);
    } else {
      await cancelWaterReminders();
    }
    setSavingNotif(false);
    setShowNotifModal(false);
    Alert.alert(
      'Kaydedildi',
      reminderSettings.enabled
        ? `Su hatırlatıcıları aktif! Her ${reminderSettings.intervalHours} saatte bir hatırlatılacaksın.`
        : 'Su hatırlatıcıları kapatıldı.'
    );
  }

  async function handleRequestPedometerPermission() {
    setCheckingPedometer(true);
    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        Alert.alert('Desteklenmiyor', 'Bu cihaz adım sayacını desteklemiyor.');
        return;
      }
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (granted) {
        Alert.alert('İzin Verildi', 'Fiziksel aktivite izni alındı. Adımlarınız artık takip edilecek.');
      } else {
        const hint = Platform.OS === 'ios'
          ? 'Ayarlar > Gizlilik > Hareket ve Kondisyon bölümünde FitBite için izni açın.'
          : 'Ayarlar > Uygulamalar > FitBite > İzinler > Fiziksel Aktivite iznini açın.';
        Alert.alert(
          'İzin Gerekli',
          hint,
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Ayarları Aç',
              onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings(),
            },
          ]
        );
      }
    } finally {
      setCheckingPedometer(false);
    }
  }

  async function handleSaveMealSettings() {
    setSavingMeal(true);
    await saveMealReminderSettings(mealSettings);
    if (mealSettings.enabled) {
      await scheduleMealReminders(mealSettings);
    } else {
      await cancelMealReminders();
    }
    setSavingMeal(false);
    setShowMealModal(false);
    Alert.alert('Kaydedildi', mealSettings.enabled ? 'Öğün hatırlatıcıları aktif!' : 'Öğün hatırlatıcıları kapatıldı.');
  }

  async function handleStepReminderToggle(value: boolean) {
    const updated = { ...stepSettings, enabled: value };
    setStepSettings(updated);
    await saveStepReminderSettings(updated);
    if (value) {
      await scheduleStepReminder(updated);
    } else {
      await cancelStepReminder();
    }
  }

  async function handleSaveMotivationSettings() {
    setSavingMotivation(true);
    await saveMotivationSettings(motivationSettings);
    if (motivationSettings.enabled) {
      await scheduleMotivationMessages(motivationSettings);
    } else {
      await cancelMotivationMessages();
    }
    setSavingMotivation(false);
    setShowMotivationModal(false);
    Alert.alert('Kaydedildi', motivationSettings.enabled ? 'Motivasyon mesajları aktif!' : 'Motivasyon mesajları kapatıldı.');
  }

  async function handleWeeklyReportToggle(value: boolean) {
    setWeeklyReportEnabled(value);
    const AS = (await import('@react-native-async-storage/async-storage')).default;
    await AS.setItem('weekly_report_enabled', value ? 'true' : 'false');
    await scheduleWeeklyReport(value);
  }

  function handleSignOut() {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
      ]
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Profil bilgileri yükleniyor…</Text>
          <TouchableOpacity style={styles.emergencySignOut} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.emergencySignOutText}>Oturumu Kapat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();

  const bmrMetrics: UserMetrics = {
    gender: profile.gender,
    age,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    goal: profile.goal,
    activity_level: profile.activity_level as ActivityLevel,
    occupational_activity: profile.occupational_activity ? profile.occupational_activity as OccupationalActivity : undefined,
    exercise_frequency: profile.exercise_frequency ? profile.exercise_frequency as ExerciseFrequency : undefined,
    body_fat_band: profile.body_fat_band ? profile.body_fat_band as BodyFatBand : undefined,
    body_fat_percentage: profile.body_fat_percentage ?? undefined,
  };
  const { value: bmrValue, formula: bmrFormula } = calculateBMR(bmrMetrics);
  const ttmEntry = TTM_STAGES.find(s => s.key === profile.ttm_stage);
  const firstName = profile.name?.split(' ')[0] ?? profile.name ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
      >
        {/* ── Editorial Hero ── */}
        <View style={styles.heroBlock}>
          <Text style={styles.overline}>SENİN PROFİLİN</Text>
          <View style={styles.heroRow}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatar} activeOpacity={0.85} onPress={handleProfilePhotoPress}>
                {profileImageUri ? (
                  <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons
                    name="person"
                    size={34}
                    color={Colors.accent}
                  />
                )}
              </TouchableOpacity>
              {profileImageUri ? (
                <TouchableOpacity
                  style={styles.avatarDeleteBadge}
                  onPress={handleRemoveProfilePhoto}
                  activeOpacity={0.8}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Ionicons name="close" size={10} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarAddBadge} pointerEvents="none">
                  <Ionicons name="add" size={11} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.profileName}>
                {firstName}
                <Text style={styles.profileNameAccent}>.</Text>
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profilePhotoHint}>
                {profileImageUri
                  ? 'Değiştirmek için dokun · kaldırmak için ✕'
                  : 'Fotoğraf eklemek için daireye dokun'}
              </Text>
            </View>
          </View>
          <View style={styles.profileBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {GOALS[profile.goal]?.label ?? profile.goal}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={styles.badgeTextSecondary}>
                {DIET_TYPES[profile.diet_type]?.label ?? profile.diet_type}
              </Text>
            </View>
            {ttmEntry && (
              <View style={[styles.badge, styles.badgeTTM]}>
                <Text style={styles.badgeText}>{ttmEntry.emoji} {ttmEntry.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Vücut Bilgileri ── */}
        <View style={styles.section}>
          <Text style={styles.overline}>VÜCUT BİLGİLERİ</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.weight_kg.toFixed(1)}</Text>
              <Text style={styles.statUnit}>kg</Text>
              <Text style={styles.statLabel}>KİLO</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.height_cm}</Text>
              <Text style={styles.statUnit}>cm</Text>
              <Text style={styles.statLabel}>BOY</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{age}</Text>
              <Text style={styles.statUnit}>yaş</Text>
              <Text style={styles.statLabel}>YAŞ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getBMIColor(bmi) }]}>{bmi}</Text>
              <Text style={styles.statUnit}>{getBMICategory(bmi).toLowerCase()}</Text>
              <Text style={styles.statLabel}>BMI</Text>
            </View>
          </View>
        </View>

        {/* ── Günlük Hedefler ── */}
        <View style={styles.section}>
          <Text style={styles.overline}>GÜNLÜK HEDEFLER</Text>
          <View style={styles.editorialCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Kalori</Text>
              <Text style={styles.goalValue}>{profile.daily_calorie_goal} <Text style={styles.goalUnit}>kcal</Text></Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Protein</Text>
              <Text style={styles.goalValue}>{profile.daily_protein_goal} <Text style={styles.goalUnit}>g</Text></Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Karbonhidrat</Text>
              <Text style={styles.goalValue}>{profile.daily_carbs_goal} <Text style={styles.goalUnit}>g</Text></Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Yağ</Text>
              <Text style={styles.goalValue}>{profile.daily_fat_goal} <Text style={styles.goalUnit}>g</Text></Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Su</Text>
              <Text style={styles.goalValue}>{(profile.daily_water_goal_ml / 1000).toFixed(1)} <Text style={styles.goalUnit}>L</Text></Text>
            </View>
            <View style={[styles.goalRow, styles.goalRowLast]}>
              <View>
                <Text style={styles.goalLabel}>BMR</Text>
                <Text style={styles.bmrFormula}>
                  {bmrFormula === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}
                </Text>
              </View>
              <Text style={styles.goalValue}>{bmrValue} <Text style={styles.goalUnit}>kcal</Text></Text>
            </View>
          </View>
        </View>

        {/* ── Aktivite ── */}
        <View style={styles.section}>
          <Text style={styles.overline}>AKTİVİTE SEVİYESİ</Text>
          <View style={styles.editorialCard}>
            <Text style={styles.activityValue}>
              {ACTIVITY_LEVELS[profile.activity_level]?.label ?? profile.activity_level}
            </Text>
            <Text style={styles.activityDesc}>
              {ACTIVITY_LEVELS[profile.activity_level]?.description ?? ''}
            </Text>
          </View>
        </View>

        {/* ── Alerjiler ── */}
        {profile.allergies && profile.allergies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.overline}>ALERJİLER & KISITLAMALAR</Text>
            <View style={styles.tagsRow}>
              {profile.allergies.map((allergy) => (
                <View key={allergy} style={styles.tag}>
                  <Text style={styles.tagText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Ayarlar ── */}
        <View style={styles.section}>
          <Text style={styles.overline}>AYARLAR</Text>
          <View style={styles.editorialCard}>
            <SettingRow
              icon="create-outline"
              label="Profili Düzenle"
              onPress={openEditModal}
            />
            <SettingRow
              icon="notifications-outline"
              label="Su Hatırlatıcıları"
              rightBadge={reminderSettings.enabled ? 'AÇIK' : null}
              onPress={() => setShowNotifModal(true)}
            />
            <SettingRow
              icon="restaurant-outline"
              label="Öğün Hatırlatıcıları"
              rightBadge={mealSettings.enabled ? 'AÇIK' : null}
              onPress={() => setShowMealModal(true)}
            />
            <SettingRow
              icon="footsteps-outline"
              label="Adım Hedefi Uyarısı"
              sublabel="Her gün 19:00'da hatırlatır"
              switchProps={{
                value: stepSettings.enabled,
                onValueChange: handleStepReminderToggle,
              }}
            />
            <SettingRow
              icon="sparkles-outline"
              label="Motivasyon Mesajları"
              rightBadge={motivationSettings.enabled ? 'AÇIK' : null}
              onPress={() => setShowMotivationModal(true)}
            />
            <SettingRow
              icon="bar-chart-outline"
              label="Haftalık Rapor"
              sublabel="Her Pazartesi sabah 09:00"
              switchProps={{
                value: weeklyReportEnabled,
                onValueChange: handleWeeklyReportToggle,
              }}
            />
            <SettingRow
              icon="footsteps-outline"
              label="Fiziksel Aktivite"
              sublabel={
                isAvailable
                  ? (permissionGranted ? 'Adım takibi aktif' : 'İzin gerekiyor')
                  : 'Cihaz desteklemiyor'
              }
              rightBadge={
                isAvailable && permissionGranted
                  ? 'AÇIK'
                  : isAvailable && !permissionGranted
                  ? 'İZİN VER'
                  : null
              }
              rightBadgeWarn={isAvailable && !permissionGranted}
              onPress={handleRequestPedometerPermission}
              disabled={checkingPedometer}
            />
            {Platform.OS === 'android' && (
              <SettingRow
                icon="heart-outline"
                label="Health Connect"
                sublabel={
                  hcState === 'checking' ? 'Kontrol ediliyor…' :
                  hcState === 'unavailable' ? 'Cihazda yüklü değil' :
                  hcState === 'available' ? 'Bağlamak için izin ver' :
                  'Arka plan adımları senkron'
                }
                rightBadge={
                  hcRequesting ? null :
                  hcState === 'connected' ? 'BAĞLI' :
                  hcState === 'available' ? 'BAĞLAN' :
                  null
                }
                rightBadgeWarn={hcState === 'available'}
                rightSpinner={hcRequesting}
                onPress={handleHealthConnectPress}
                disabled={hcRequesting || hcState === 'checking'}
              />
            )}
            <SettingRow
              icon="shield-checkmark-outline"
              label="Gizlilik & Güvenlik"
              onPress={() => setShowPrivacyModal(true)}
            />
            <SettingRow
              icon="log-out-outline"
              label="Çıkış Yap"
              destructive
              onPress={handleSignOut}
              isLast
            />
          </View>
        </View>
      </ScrollView>

      {/* ────────────────────────────────────────────────────────────────────
          Su Hatırlatıcıları Modal
          ──────────────────────────────────────────────────────────────────── */}
      <Modal visible={showNotifModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <ModalHeader title="Su Hatırlatıcıları" overline="HATIRLATMA" onClose={() => setShowNotifModal(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.editorialCard}>
              <View style={styles.modalRow}>
                <View style={styles.modalRowInfo}>
                  <Text style={styles.modalRowTitle}>Hatırlatıcıları Etkinleştir</Text>
                  <Text style={styles.modalRowDesc}>Belirli aralıklarla su içmen için bildirim gönderilir</Text>
                </View>
                <Switch
                  value={reminderSettings.enabled}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: Colors.border, true: Colors.accentLight }}
                  thumbColor={reminderSettings.enabled ? Colors.accent : Colors.textMuted}
                />
              </View>
            </View>

            {reminderSettings.enabled && (
              <>
                <Text style={styles.modalSectionLabel}>HATIRLATMA ARALIĞI</Text>
                <View style={styles.optionRow}>
                  {[1, 2, 3].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.optionBtn, reminderSettings.intervalHours === h && styles.optionBtnActive]}
                      onPress={() => setReminderSettings((s) => ({ ...s, intervalHours: h }))}
                    >
                      <Text style={[styles.optionBtnText, reminderSettings.intervalHours === h && styles.optionBtnTextActive]}>
                        {h} saatte bir
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalSectionLabel}>BAŞLANGIÇ SAATİ</Text>
                <View style={styles.optionRow}>
                  {[7, 8, 9, 10].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.optionBtn, reminderSettings.startHour === h && styles.optionBtnActive]}
                      onPress={() => setReminderSettings((s) => ({ ...s, startHour: h }))}
                    >
                      <Text style={[styles.optionBtnText, reminderSettings.startHour === h && styles.optionBtnTextActive]}>
                        {h}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalSectionLabel}>BİTİŞ SAATİ</Text>
                <View style={styles.optionRow}>
                  {[20, 21, 22, 23].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.optionBtn, reminderSettings.endHour === h && styles.optionBtnActive]}
                      onPress={() => setReminderSettings((s) => ({ ...s, endHour: h }))}
                    >
                      <Text style={[styles.optionBtnText, reminderSettings.endHour === h && styles.optionBtnTextActive]}>
                        {h}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalSummary}>
                  <Text style={styles.modalSummaryText}>
                    Saat {reminderSettings.startHour}:00 ile {reminderSettings.endHour}:00 arasında her {reminderSettings.intervalHours} saatte bir hatırlatılacaksın.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <ModalFooter saving={savingNotif} onSave={handleSaveNotifSettings} />
        </SafeAreaView>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────
          Öğün Hatırlatıcıları Modal
          ──────────────────────────────────────────────────────────────────── */}
      <Modal visible={showMealModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <ModalHeader title="Öğün Hatırlatıcıları" overline="HATIRLATMA" onClose={() => setShowMealModal(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.editorialCard}>
              <View style={styles.modalRow}>
                <View style={styles.modalRowInfo}>
                  <Text style={styles.modalRowTitle}>Öğün Hatırlatıcılarını Etkinleştir</Text>
                  <Text style={styles.modalRowDesc}>Seçtiğin saatlerde öğün bildirimi al</Text>
                </View>
                <Switch
                  value={mealSettings.enabled}
                  onValueChange={(v) => setMealSettings((s) => ({ ...s, enabled: v }))}
                  trackColor={{ false: Colors.border, true: Colors.accentLight }}
                  thumbColor={mealSettings.enabled ? Colors.accent : Colors.textMuted}
                />
              </View>
            </View>
            {mealSettings.enabled && (
              <>
                <View style={styles.editorialCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>🌅 Kahvaltı</Text>
                    <Switch
                      value={mealSettings.breakfast.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, breakfast: { ...s.breakfast, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.accentLight }}
                      thumbColor={mealSettings.breakfast.enabled ? Colors.accent : Colors.textMuted}
                    />
                  </View>
                  {mealSettings.breakfast.enabled && (
                    <View style={[styles.optionRow, { marginTop: Spacing.sm }]}>
                      {[7, 8, 9, 10].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.optionBtn, mealSettings.breakfast.hour === h && styles.optionBtnActive]}
                          onPress={() => setMealSettings((s) => ({ ...s, breakfast: { ...s.breakfast, hour: h } }))}
                        >
                          <Text style={[styles.optionBtnText, mealSettings.breakfast.hour === h && styles.optionBtnTextActive]}>
                            {h}:00
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.editorialCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>☀️ Öğle Yemeği</Text>
                    <Switch
                      value={mealSettings.lunch.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, lunch: { ...s.lunch, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.accentLight }}
                      thumbColor={mealSettings.lunch.enabled ? Colors.accent : Colors.textMuted}
                    />
                  </View>
                  {mealSettings.lunch.enabled && (
                    <View style={[styles.optionRow, { marginTop: Spacing.sm }]}>
                      {[11, 12, 13, 14].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.optionBtn, mealSettings.lunch.hour === h && styles.optionBtnActive]}
                          onPress={() => setMealSettings((s) => ({ ...s, lunch: { ...s.lunch, hour: h } }))}
                        >
                          <Text style={[styles.optionBtnText, mealSettings.lunch.hour === h && styles.optionBtnTextActive]}>
                            {h}:00
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.editorialCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>🌙 Akşam Yemeği</Text>
                    <Switch
                      value={mealSettings.dinner.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, dinner: { ...s.dinner, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.accentLight }}
                      thumbColor={mealSettings.dinner.enabled ? Colors.accent : Colors.textMuted}
                    />
                  </View>
                  {mealSettings.dinner.enabled && (
                    <View style={[styles.optionRow, { marginTop: Spacing.sm }]}>
                      {[17, 18, 19, 20, 21].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.optionBtn, mealSettings.dinner.hour === h && styles.optionBtnActive]}
                          onPress={() => setMealSettings((s) => ({ ...s, dinner: { ...s.dinner, hour: h } }))}
                        >
                          <Text style={[styles.optionBtnText, mealSettings.dinner.hour === h && styles.optionBtnTextActive]}>
                            {h}:00
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
          <ModalFooter saving={savingMeal} onSave={handleSaveMealSettings} />
        </SafeAreaView>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────
          Motivasyon Mesajları Modal
          ──────────────────────────────────────────────────────────────────── */}
      <Modal visible={showMotivationModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <ModalHeader title="Motivasyon Mesajları" overline="GÜNLÜK İLHAM" onClose={() => setShowMotivationModal(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.editorialCard}>
              <View style={styles.modalRow}>
                <View style={styles.modalRowInfo}>
                  <Text style={styles.modalRowTitle}>Sabah Motivasyonu</Text>
                  <Text style={styles.modalRowDesc}>Her sabah güne ilham veren bir mesajla başla</Text>
                </View>
                <Switch
                  value={motivationSettings.enabled}
                  onValueChange={(v) => setMotivationSettings((s) => ({ ...s, enabled: v }))}
                  trackColor={{ false: Colors.border, true: Colors.accentLight }}
                  thumbColor={motivationSettings.enabled ? Colors.accent : Colors.textMuted}
                />
              </View>
            </View>
            {motivationSettings.enabled && (
              <>
                <Text style={styles.modalSectionLabel}>BİLDİRİM SAATİ</Text>
                <View style={styles.optionRow}>
                  {[6, 7, 8, 9].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.optionBtn, motivationSettings.hour === h && styles.optionBtnActive]}
                      onPress={() => setMotivationSettings((s) => ({ ...s, hour: h, minute: 30 }))}
                    >
                      <Text style={[styles.optionBtnText, motivationSettings.hour === h && styles.optionBtnTextActive]}>
                        {h}:30
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <ModalFooter saving={savingMotivation} onSave={handleSaveMotivationSettings} />
        </SafeAreaView>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────
          Profili Düzenle Modal
          ──────────────────────────────────────────────────────────────────── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <ModalHeader title="Profili Düzenle" overline="DÜZENLE" closeLabel="İptal" onClose={() => setShowEditModal(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalSectionLabel}>İSİM</Text>
            <TextInput
              style={styles.editInput}
              value={editData.name}
              onChangeText={(v) => setEditData((p) => ({ ...p, name: v }))}
              placeholder="Adınız"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalSectionLabel}>KİLO (KG)</Text>
            <TextInput
              style={styles.editInput}
              value={editData.weight_kg}
              onChangeText={(v) => setEditData((p) => ({ ...p, weight_kg: v }))}
              placeholder="örn: 79,8"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.modalSectionLabel}>HEDEF</Text>

            {/* ── Mevcut hedef + değiştir seçenekleri ── */}
            {!pendingGoal && (
              <>
                <View style={styles.goalCurrentRow}>
                  <View>
                    <Text style={styles.goalCurrentText}>{GOALS[editData.goal as Goal]?.label}</Text>
                    {editData.goal !== 'maintain' && (
                      <Text style={styles.goalCurrentSub}>
                        {Math.abs(editData.weekly_weight_goal_kg).toFixed(3).replace(/\.?0+$/, '')} kg / hafta
                      </Text>
                    )}
                  </View>
                  <Text style={styles.goalLockHint}>Değiştirmek için{'\n'}seç →</Text>
                </View>
                <View style={styles.optionRow}>
                  {(Object.entries(GOALS) as [Goal, { label: string }][])
                    .filter(([k]) => k !== editData.goal)
                    .map(([key, val]) => (
                      <TouchableOpacity
                        key={key}
                        style={styles.optionBtn}
                        onPress={() => {
                          setPendingGoal(key);
                          setPendingRate(key === 'gain' ? 0.25 : 0.5);
                        }}
                      >
                        <Text style={styles.optionBtnText}>{val.label}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}

            {/* ── Hedef değişikliği onay paneli ── */}
            {pendingGoal && pendingGoal !== (editData.goal as Goal) && profile && (() => {
              const pw = parseFloat(editData.weight_kg.replace(',', '.')) || profile.weight_kg;
              const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
              const newRate = pendingGoal === 'maintain' ? 0 : pendingGoal === 'gain' ? -pendingRate : pendingRate;
              const previewMetrics: UserMetrics = {
                gender: profile.gender, age,
                height_cm: profile.height_cm, weight_kg: pw,
                goal: pendingGoal,
                activity_level: editData.activity_level as ActivityLevel,
              };
              const newMacros = calculateMacroGoals(previewMetrics, newRate);
              const currentCal = profile.daily_calorie_goal ?? 2000;
              const diff = newMacros.calories - currentCal;
              const accentColor = pendingGoal === 'lose' ? Colors.terracotta : pendingGoal === 'gain' ? '#4A7C59' : Colors.primary;
              const LOSE_RATES = [0.25, 0.5, 0.75, 1.0];
              const GAIN_RATES = [0.125, 0.25, 0.5, 0.75];

              return (
                <View style={styles.goalConfirmPanel}>
                  {/* Yön başlığı */}
                  <View style={styles.goalConfirmHeader}>
                    <Text style={styles.goalConfirmOld}>{GOALS[editData.goal as Goal]?.label}</Text>
                    <Text style={styles.goalConfirmArrowText}> → </Text>
                    <Text style={[styles.goalConfirmNew, { color: accentColor }]}>{GOALS[pendingGoal]?.label}</Text>
                  </View>

                  {/* Tempo seçici (lose/gain için) */}
                  {pendingGoal !== 'maintain' && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.goalConfirmRateLabel}>HAFTALIK TEMPO</Text>
                      <View style={styles.goalConfirmRateRow}>
                        {(pendingGoal === 'lose' ? LOSE_RATES : GAIN_RATES).map((r) => {
                          const sel = pendingRate === r;
                          return (
                            <TouchableOpacity
                              key={r}
                              style={[styles.goalRateChip, sel && { backgroundColor: accentColor, borderColor: accentColor }]}
                              onPress={() => setPendingRate(r)}
                            >
                              <Text style={[styles.goalRateChipText, sel && { color: '#fff' }]}>{r} kg</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Kalori önizleme */}
                  <View style={[styles.goalConfirmCalRow, { borderLeftColor: accentColor }]}>
                    <Text style={styles.goalConfirmCalLabel}>Yeni günlük kalori hedefi</Text>
                    <Text style={[styles.goalConfirmCalValue, { color: accentColor }]}>
                      {newMacros.calories} kcal
                    </Text>
                    <Text style={styles.goalConfirmCalDiff}>
                      {diff > 0 ? '+' : ''}{diff} kcal / gün
                      {' '}({newMacros.protein_g}g protein · {newMacros.carbs_g}g karb · {newMacros.fat_g}g yağ)
                    </Text>
                  </View>

                  {/* Uyarı notu */}
                  <View style={styles.goalConfirmWarn}>
                    <Text style={styles.goalConfirmWarnText}>
                      Kalori, protein, karbonhidrat ve yağ hedeflerin bu plana göre yeniden hesaplanacak. Kaydettiğin yemek kayıtları değişmez.
                    </Text>
                  </View>

                  {/* Onay / Vazgeç */}
                  <View style={styles.goalConfirmBtns}>
                    <TouchableOpacity
                      style={[styles.goalConfirmOkBtn, { backgroundColor: accentColor }]}
                      onPress={() => {
                        setEditData((p) => ({ ...p, goal: pendingGoal!, weekly_weight_goal_kg: newRate }));
                        setPendingGoal(null);
                      }}
                    >
                      <Text style={styles.goalConfirmOkText}>Planı Değiştir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.goalConfirmCancelBtn}
                      onPress={() => setPendingGoal(null)}
                    >
                      <Text style={styles.goalConfirmCancelText}>Vazgeç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.modalSectionLabel}>DİYET TİPİ</Text>
            <View style={styles.optionRow}>
              {(Object.entries(DIET_TYPES) as [DietType, typeof DIET_TYPES[DietType]][]).map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionBtn, editData.diet_type === key && styles.optionBtnActive]}
                  onPress={() => setEditData((p) => ({ ...p, diet_type: key }))}
                >
                  <Text style={[styles.optionBtnText, editData.diet_type === key && styles.optionBtnTextActive]}>
                    {val.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>AKTİVİTE SEVİYESİ</Text>
            <View style={styles.optionRow}>
              {(Object.entries(ACTIVITY_LEVELS) as [ActivityLevel, { label: string }][]).map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionBtn, editData.activity_level === key && styles.optionBtnActive]}
                  onPress={() => setEditData((p) => ({ ...p, activity_level: key }))}
                >
                  <Text style={[styles.optionBtnText, editData.activity_level === key && styles.optionBtnTextActive]}>
                    {val.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <ModalFooter saving={savingEdit} onSave={saveProfile} />
        </SafeAreaView>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────
          Gizlilik & Güvenlik Modal
          ──────────────────────────────────────────────────────────────────── */}
      <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <ModalHeader title="Gizlilik & Güvenlik" overline="GÜVENLİK" onClose={() => setShowPrivacyModal(false)} />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <View style={styles.editorialCard}>
              <Text style={styles.privacySectionTitle}>Veri Güvenliği</Text>
              <Text style={styles.privacyText}>
                Tüm verilerin Supabase altyapısında şifrelenmiş olarak saklanır. Üçüncü taraflarla paylaşılmaz.
              </Text>
            </View>
            <View style={styles.editorialCard}>
              <Text style={styles.privacySectionTitle}>Şifre Sıfırlama</Text>
              <Text style={styles.privacyText}>
                {user?.email} adresine şifre sıfırlama bağlantısı gönderebilirsin.
              </Text>
              <TouchableOpacity
                style={[styles.privacyBtn, sendingReset && styles.btnDisabled]}
                onPress={handlePasswordReset}
                disabled={sendingReset}
              >
                {sendingReset
                  ? <ActivityIndicator color={Colors.textLight} size="small" />
                  : <Text style={styles.privacyBtnText}>Şifre Sıfırlama E-postası Gönder</Text>
                }
              </TouchableOpacity>
            </View>
            <View style={[styles.editorialCard, styles.dangerCard]}>
              <Text style={[styles.privacySectionTitle, { color: Colors.error }]}>Tehlikeli Bölge</Text>
              <Text style={styles.privacyText}>
                Hesabını sildiğinde tüm verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.
              </Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
                <Text style={styles.deleteBtnText}>Hesabı Sil</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Yardımcı bileşenler — Editorial setting row + Modal header/footer
// ────────────────────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  rightBadge?: string | null;
  rightBadgeWarn?: boolean;
  rightSpinner?: boolean;
  switchProps?: { value: boolean; onValueChange: (v: boolean) => void };
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

function SettingRow({
  icon, label, sublabel, rightBadge, rightBadgeWarn, rightSpinner,
  switchProps, onPress, destructive, disabled, isLast,
}: SettingRowProps) {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[styles.settingRow, !isLast && styles.settingRowBorder]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
    >
      <Ionicons
        name={icon}
        size={18}
        color={destructive ? Colors.error : Colors.textSecondary}
        style={styles.settingIcon}
      />
      <View style={styles.settingLabelWrap}>
        <Text style={[styles.settingLabel, destructive && { color: Colors.error }]}>
          {label}
        </Text>
        {sublabel && <Text style={styles.settingSubLabel}>{sublabel}</Text>}
      </View>
      <View style={styles.settingRight}>
        {rightSpinner && <ActivityIndicator size="small" color={Colors.primary} />}
        {!rightSpinner && rightBadge && (
          <View style={[styles.settingBadge, rightBadgeWarn && styles.settingBadgeWarn]}>
            <Text style={[styles.settingBadgeText, rightBadgeWarn && styles.settingBadgeTextWarn]}>
              {rightBadge}
            </Text>
          </View>
        )}
        {switchProps && (
          <Switch
            value={switchProps.value}
            onValueChange={switchProps.onValueChange}
            trackColor={{ false: Colors.border, true: Colors.accentLight }}
            thumbColor={switchProps.value ? Colors.accent : Colors.textMuted}
          />
        )}
        {!switchProps && onPress && (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </Container>
  );
}

function ModalHeader({
  title,
  overline,
  closeLabel = 'Kapat',
  onClose,
}: {
  title: string;
  overline: string;
  closeLabel?: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.overline}>{overline}</Text>
        <Text style={styles.modalTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
        <Text style={styles.modalCloseText}>{closeLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ModalFooter({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <View style={styles.modalFooter}>
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={Colors.textLight} />
          : <Text style={styles.saveBtnText}>Kaydet</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return Colors.info;
  if (bmi < 25) return Colors.success;
  if (bmi < 30) return Colors.warning;
  return Colors.error;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, fontFamily: SERIF },
  emergencySignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.full,
  },
  emergencySignOutText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },

  // ── Hero ──
  heroBlock: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
  },
  overline: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarDeleteBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
    zIndex: 1,
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
    zIndex: 1,
  },
  heroText: {
    flex: 1,
  },
  profileName: {
    fontFamily: SERIF,
    fontSize: 32,
    color: Colors.ink,
    lineHeight: 36,
  },
  profileNameAccent: {
    fontFamily: SERIF,
    color: Colors.terracotta,
    fontStyle: 'italic',
  },
  profileEmail: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.ink3,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  profilePhotoHint: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink4,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 14,
  },
  badge: {
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.line,
  },
  badgeTTM: { backgroundColor: Colors.terracotta },
  badgeText: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.background,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  badgeTextSecondary: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Section / Card ──
  section: {
    paddingHorizontal: 22,
    marginTop: 22,
    gap: 10,
  },
  editorialCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 4,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  dangerCard: {
    borderColor: Colors.error + '40',
  },

  // ── Stats grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  statUnit: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink4,
    marginTop: 8,
    letterSpacing: 1.2,
  },

  // ── Goal rows ──
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  goalRowLast: { borderBottomWidth: 0 },
  goalLabel: {
    fontFamily: SERIF,
    fontSize: 16,
    color: Colors.ink2,
  },
  goalValue: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  goalUnit: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.ink3,
    fontWeight: '400',
  },
  bmrFormula: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Activity ──
  activityValue: {
    fontFamily: SERIF,
    fontSize: 22,
    color: Colors.terracotta,
    fontStyle: 'italic',
  },
  activityDesc: {
    fontFamily: SERIF,
    fontSize: 13,
    color: Colors.ink3,
    marginTop: 4,
    lineHeight: 18,
  },

  // ── Tags / Allergies ──
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    backgroundColor: Colors.accentLight + '40',
    borderWidth: 0.5,
    borderColor: Colors.accent + '60',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Setting rows ──
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: { width: 22 },
  settingLabelWrap: { flex: 1 },
  settingLabel: {
    fontFamily: SERIF,
    fontSize: 16,
    color: Colors.ink,
  },
  settingSubLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingBadge: {
    backgroundColor: Colors.ink + '12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  settingBadgeText: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  settingBadgeWarn: {
    backgroundColor: Colors.ink + '08',
    borderWidth: 0.5,
    borderColor: Colors.ink3,
  },
  settingBadgeTextWarn: {
    color: Colors.ink2,
  },
  chevron: {
    fontFamily: SERIF,
    fontSize: 22,
    color: Colors.textFaint,
    lineHeight: 22,
  },

  // ── Modal ──
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 30,
    marginTop: 4,
  },
  modalCloseBtn: {
    paddingTop: 4,
  },
  modalCloseText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalScroll: { flex: 1 },
  modalContent: {
    paddingHorizontal: 22,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRowInfo: { flex: 1, marginRight: Spacing.md },
  modalRowTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink,
  },
  modalRowDesc: {
    fontFamily: SERIF,
    fontSize: 13,
    color: Colors.ink3,
    marginTop: 4,
    lineHeight: 18,
  },
  modalSectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 1.4,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  optionBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  optionBtnText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.ink2,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  optionBtnTextActive: { color: Colors.background },

  // ── Hedef değişikliği UI ──
  goalCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    marginBottom: 10,
  },
  goalCurrentText: {
    fontFamily: SERIF,
    fontSize: 20,
    color: Colors.ink,
  },
  goalCurrentSub: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  goalLockHint: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink4,
    letterSpacing: 0.8,
    textAlign: 'right',
  },
  goalConfirmPanel: {
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 0,
  },
  goalConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalConfirmOld: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink3,
  },
  goalConfirmArrowText: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink3,
  },
  goalConfirmNew: {
    fontFamily: SERIF,
    fontSize: 18,
    fontStyle: 'italic',
  },
  goalConfirmRateLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  goalConfirmRateRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalRateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: Colors.line,
    borderRadius: 999,
  },
  goalRateChipText: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.ink2,
    fontWeight: '600',
  },
  goalConfirmCalRow: {
    marginTop: 14,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.line,
  },
  goalConfirmCalLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.2,
  },
  goalConfirmCalValue: {
    fontFamily: SERIF,
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  goalConfirmCalDiff: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  goalConfirmWarn: {
    marginTop: 14,
    padding: 10,
    backgroundColor: Colors.ink + '08',
    borderLeftWidth: 2,
    borderLeftColor: Colors.ink4,
  },
  goalConfirmWarnText: {
    fontFamily: SERIF,
    fontSize: 12,
    color: Colors.ink3,
    lineHeight: 18,
  },
  goalConfirmBtns: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  goalConfirmOkBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  goalConfirmOkText: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  goalConfirmCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 0.5,
    borderColor: Colors.line,
  },
  goalConfirmCancelText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.ink3,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  modalSummary: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.accentLight + '26',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  modalSummaryText: {
    fontFamily: SERIF,
    fontSize: 13,
    color: Colors.accent,
    lineHeight: 19,
  },
  modalFooter: {
    paddingHorizontal: 22,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.ink,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: Colors.background,
    fontFamily: MONO,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.2,
  },

  // ── Meal modal rows ──
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealLabel: {
    fontFamily: SERIF,
    fontSize: 17,
    color: Colors.ink,
  },

  // ── Edit modal inputs ──
  editInput: {
    borderWidth: 0.5,
    borderColor: Colors.line,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: SERIF,
    fontSize: 16,
    color: Colors.ink,
    backgroundColor: Colors.surface,
  },

  // ── Privacy modal ──
  privacySectionTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: 6,
  },
  privacyText: {
    fontFamily: SERIF,
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  privacyBtn: {
    backgroundColor: Colors.ink,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  privacyBtnText: {
    color: Colors.background,
    fontFamily: MONO,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.error,
    fontFamily: MONO,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
