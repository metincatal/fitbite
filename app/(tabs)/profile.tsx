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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, ACTIVITY_LEVELS, GOALS, DIET_TYPES, TTM_STAGES, ActivityLevel, Goal, DietType, OccupationalActivity, ExerciseFrequency, BodyFatBand } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
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
  const [editData, setEditData] = useState({ name: '', weight_kg: '', goal: '', diet_type: '', activity_level: '' });
  const [savingEdit, setSavingEdit] = useState(false);

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

  useEffect(() => {
    loadReminderSettings().then(setReminderSettings);
    loadMealReminderSettings().then(setMealSettings);
    loadStepReminderSettings().then(setStepSettings);
    loadMotivationSettings().then(setMotivationSettings);
    // Haftalık rapor durumunu notifications üzerinden oku (enabled toggle)
    // stepSettings yeterli — weeklyReport ayrı storage yok, AsyncStorage'den oku
    import('@react-native-async-storage/async-storage').then(({ default: AS }) =>
      AS.getItem('weekly_report_enabled').then((v) => setWeeklyReportEnabled(v === 'true'))
    );

    refreshHealthConnectState();
  }, []);

  // Health Connect durumunu kontrol et: önce SDK var mı, sonra okuma yetkimiz var mı
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
      // İzin verilmişse readRecords değer döner; izin yoksa null gelir.
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

    // hcState === 'available' → izin diyaloğunu aç
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
        // Belki kullanıcı reddetti, belki delegate hata verdi. State'i tekrar oku.
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
      diet_type: profile.diet_type,
      activity_level: profile.activity_level,
    });
    setShowEditModal(true);
  }

  async function saveProfile() {
    if (!user || !profile) return;
    const weight = parseFloat(editData.weight_kg);
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
    const macros = calculateMacroGoals(metrics);
    const { data } = await supabase
      .from('profiles')
      .update({
        name: editData.name.trim(),
        weight_kg: weight,
        goal: editData.goal as Goal,
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
    setSavingEdit(false);
    if (data) {
      setProfile(data);
      setShowEditModal(false);
      Alert.alert('Kaydedildi', 'Profiliniz güncellendi.');
    } else {
      Alert.alert('Hata', 'Profil güncellenemedi. Tekrar deneyin.');
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
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
          onPress: async () => {
            if (!user) return;
            // Kullanıcı verilerini sil
            await supabase.from('food_logs').delete().eq('user_id', user.id);
            await supabase.from('water_logs').delete().eq('user_id', user.id);
            await supabase.from('weight_logs').delete().eq('user_id', user.id);
            await supabase.from('chat_messages').delete().eq('user_id', user.id);
            await supabase.from('body_measurements').delete().eq('user_id', user.id);
            await supabase.from('profiles').delete().eq('user_id', user.id);
            await signOut();
          },
        },
      ]
    );
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
          <Text style={styles.emptyText}>Profil bilgileri yükleniyor...</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profil Başlığı */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons
              name={profile.gender === 'male' ? 'person' : 'person'}
              size={44}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {GOALS[profile.goal]?.label ?? profile.goal}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={styles.badgeText}>
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

        {/* Vücut İstatistikleri */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Vücut Bilgileri</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.weight_kg} kg</Text>
              <Text style={styles.statLabel}>Kilo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.height_cm} cm</Text>
              <Text style={styles.statLabel}>Boy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{age}</Text>
              <Text style={styles.statLabel}>Yaş</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getBMIColor(bmi) }]}>{bmi}</Text>
              <Text style={styles.statLabel}>BMI ({getBMICategory(bmi)})</Text>
            </View>
          </View>
        </Card>

        {/* Günlük Hedefler */}
        <Card style={styles.goalsCard}>
          <Text style={styles.sectionTitle}>Günlük Hedefler</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Kalori</Text>
            <Text style={styles.goalValue}>{profile.daily_calorie_goal} kcal</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Protein</Text>
            <Text style={styles.goalValue}>{profile.daily_protein_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Karbonhidrat</Text>
            <Text style={styles.goalValue}>{profile.daily_carbs_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Yağ</Text>
            <Text style={styles.goalValue}>{profile.daily_fat_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Su</Text>
            <Text style={styles.goalValue}>{(profile.daily_water_goal_ml / 1000).toFixed(1)} L</Text>
          </View>
          <View style={[styles.goalRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.goalLabel}>BMR</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.goalValue}>{bmrValue} kcal</Text>
              <Text style={styles.bmrFormula}>
                {bmrFormula === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Aktivite Seviyesi */}
        <Card style={styles.activityCard}>
          <Text style={styles.sectionTitle}>Aktivite Seviyesi</Text>
          <Text style={styles.activityValue}>
            {ACTIVITY_LEVELS[profile.activity_level]?.label ?? profile.activity_level}
          </Text>
        </Card>

        {/* Alerjiler */}
        {profile.allergies && profile.allergies.length > 0 && (
          <Card style={styles.allergiesCard}>
            <Text style={styles.sectionTitle}>Alerjiler & Kısıtlamalar</Text>
            <View style={styles.tagsRow}>
              {profile.allergies.map((allergy) => (
                <View key={allergy} style={styles.tag}>
                  <Text style={styles.tagText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Ayarlar Bölümü */}
        <Card style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow} onPress={openEditModal}>
            <Ionicons name="create-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Profili Düzenle</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/shopping-list')}>
            <Ionicons name="cart-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Alışveriş Listesi</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowNotifModal(true)}>
            <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Su Hatırlatıcıları</Text>
            <View style={styles.settingRight}>
              {reminderSettings.enabled && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Açık</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowMealModal(true)}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Öğün Hatırlatıcıları</Text>
            <View style={styles.settingRight}>
              {mealSettings.enabled && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Açık</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <Ionicons name="footsteps-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <View style={styles.settingLabelWrap}>
              <Text style={styles.settingLabelInline}>Adım Hedefi Uyarısı</Text>
              <Text style={styles.settingSubLabel}>Her gün 19:00'da hatırlatır</Text>
            </View>
            <Switch
              value={stepSettings.enabled}
              onValueChange={handleStepReminderToggle}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={stepSettings.enabled ? Colors.primary : Colors.textMuted}
            />
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowMotivationModal(true)}>
            <Ionicons name="sparkles-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Motivasyon Mesajları</Text>
            <View style={styles.settingRight}>
              {motivationSettings.enabled && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Açık</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <Ionicons name="bar-chart-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <View style={styles.settingLabelWrap}>
              <Text style={styles.settingLabelInline}>Haftalık Rapor</Text>
              <Text style={styles.settingSubLabel}>Her Pazartesi sabah 09:00</Text>
            </View>
            <Switch
              value={weeklyReportEnabled}
              onValueChange={handleWeeklyReportToggle}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={weeklyReportEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleRequestPedometerPermission}
            disabled={checkingPedometer}
          >
            <Ionicons name="footsteps-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <View style={styles.settingLabelWrap}>
              <Text style={styles.settingLabelInline}>Fiziksel Aktivite</Text>
              {isAvailable && (
                <Text style={styles.settingSubLabel}>
                  {permissionGranted ? 'Adım takibi aktif' : 'İzin gerekiyor'}
                </Text>
              )}
            </View>
            <View style={styles.settingRight}>
              {isAvailable && permissionGranted ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Açık</Text>
                </View>
              ) : isAvailable && !permissionGranted ? (
                <View style={styles.warningBadge}>
                  <Text style={styles.warningBadgeText}>İzin Ver</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleHealthConnectPress}
              disabled={hcRequesting || hcState === 'checking'}
            >
              <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
              <View style={styles.settingLabelWrap}>
                <Text style={styles.settingLabelInline}>Health Connect</Text>
                <Text style={styles.settingSubLabel}>
                  {hcState === 'checking' && 'Kontrol ediliyor…'}
                  {hcState === 'unavailable' && 'Cihazda yüklü değil'}
                  {hcState === 'available' && 'Bağlamak için izin ver'}
                  {hcState === 'connected' && 'Arka plan adımları senkron'}
                </Text>
              </View>
              <View style={styles.settingRight}>
                {hcRequesting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : hcState === 'connected' ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Bağlı</Text>
                  </View>
                ) : hcState === 'available' ? (
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningBadgeText}>Bağlan</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowPrivacyModal(true)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} style={styles.settingIconView} />
            <Text style={styles.settingLabel}>Gizlilik & Güvenlik</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} style={styles.settingIconView} />
            <Text style={[styles.settingLabel, { color: Colors.error }]}>Çıkış Yap</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Su Hatırlatıcıları Modal */}
      <Modal visible={showNotifModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Su Hatırlatıcıları</Text>
            <TouchableOpacity onPress={() => setShowNotifModal(false)}>
              <Text style={styles.notifClose}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifContent}>
            {/* Ana aç/kapat */}
            <Card style={styles.notifCard}>
              <View style={styles.notifRow}>
                <View style={styles.notifRowInfo}>
                  <Text style={styles.notifRowTitle}>Su Hatırlatıcılarını Etkinleştir</Text>
                  <Text style={styles.notifRowDesc}>Belirli aralıklarla su içmen için bildirim gönderilir</Text>
                </View>
                <Switch
                  value={reminderSettings.enabled}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={reminderSettings.enabled ? Colors.primary : Colors.textMuted}
                />
              </View>
            </Card>

            {reminderSettings.enabled && (
              <>
                {/* Hatırlatma aralığı */}
                <Card style={styles.notifCard}>
                  <Text style={styles.notifSectionLabel}>Hatırlatma Aralığı</Text>
                  <View style={styles.optionRow}>
                    {[1, 2, 3].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.optionBtn,
                          reminderSettings.intervalHours === h && styles.optionBtnActive,
                        ]}
                        onPress={() =>
                          setReminderSettings((s) => ({ ...s, intervalHours: h }))
                        }
                      >
                        <Text
                          style={[
                            styles.optionBtnText,
                            reminderSettings.intervalHours === h && styles.optionBtnTextActive,
                          ]}
                        >
                          {h} saatte bir
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                {/* Başlangıç saati */}
                <Card style={styles.notifCard}>
                  <Text style={styles.notifSectionLabel}>Başlangıç Saati</Text>
                  <View style={styles.optionRow}>
                    {[7, 8, 9, 10].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.optionBtn,
                          reminderSettings.startHour === h && styles.optionBtnActive,
                        ]}
                        onPress={() =>
                          setReminderSettings((s) => ({ ...s, startHour: h }))
                        }
                      >
                        <Text
                          style={[
                            styles.optionBtnText,
                            reminderSettings.startHour === h && styles.optionBtnTextActive,
                          ]}
                        >
                          {h}:00
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                {/* Bitiş saati */}
                <Card style={styles.notifCard}>
                  <Text style={styles.notifSectionLabel}>Bitiş Saati</Text>
                  <View style={styles.optionRow}>
                    {[20, 21, 22, 23].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.optionBtn,
                          reminderSettings.endHour === h && styles.optionBtnActive,
                        ]}
                        onPress={() =>
                          setReminderSettings((s) => ({ ...s, endHour: h }))
                        }
                      >
                        <Text
                          style={[
                            styles.optionBtnText,
                            reminderSettings.endHour === h && styles.optionBtnTextActive,
                          ]}
                        >
                          {h}:00
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                {/* Özet */}
                <View style={styles.notifSummary}>
                  <Text style={styles.notifSummaryText}>
                    Saat {reminderSettings.startHour}:00 ile {reminderSettings.endHour}:00 arasında{' '}
                    her {reminderSettings.intervalHours} saatte bir hatırlatılacaksın.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.notifFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, savingNotif && styles.saveBtnDisabled]}
              onPress={handleSaveNotifSettings}
              disabled={savingNotif}
            >
              <Text style={styles.saveBtnText}>
                {savingNotif ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Öğün Hatırlatıcıları Modal */}
      <Modal visible={showMealModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Öğün Hatırlatıcıları</Text>
            <TouchableOpacity onPress={() => setShowMealModal(false)}>
              <Text style={styles.notifClose}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notifContent}>
            <Card style={styles.notifCard}>
              <View style={styles.notifRow}>
                <View style={styles.notifRowInfo}>
                  <Text style={styles.notifRowTitle}>Öğün Hatırlatıcılarını Etkinleştir</Text>
                  <Text style={styles.notifRowDesc}>Seçtiğin saatlerde öğün bildirimi al</Text>
                </View>
                <Switch
                  value={mealSettings.enabled}
                  onValueChange={(v) => setMealSettings((s) => ({ ...s, enabled: v }))}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={mealSettings.enabled ? Colors.primary : Colors.textMuted}
                />
              </View>
            </Card>
            {mealSettings.enabled && (
              <>
                {/* Kahvaltı */}
                <Card style={styles.notifCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>🌅 Kahvaltı</Text>
                    <Switch
                      value={mealSettings.breakfast.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, breakfast: { ...s.breakfast, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                      thumbColor={mealSettings.breakfast.enabled ? Colors.primary : Colors.textMuted}
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
                </Card>
                {/* Öğle */}
                <Card style={styles.notifCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>☀️ Öğle Yemeği</Text>
                    <Switch
                      value={mealSettings.lunch.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, lunch: { ...s.lunch, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                      thumbColor={mealSettings.lunch.enabled ? Colors.primary : Colors.textMuted}
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
                </Card>
                {/* Akşam */}
                <Card style={styles.notifCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealLabel}>🌙 Akşam Yemeği</Text>
                    <Switch
                      value={mealSettings.dinner.enabled}
                      onValueChange={(v) => setMealSettings((s) => ({ ...s, dinner: { ...s.dinner, enabled: v } }))}
                      trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                      thumbColor={mealSettings.dinner.enabled ? Colors.primary : Colors.textMuted}
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
                </Card>
              </>
            )}
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
          <View style={styles.notifFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, savingMeal && styles.saveBtnDisabled]}
              onPress={handleSaveMealSettings}
              disabled={savingMeal}
            >
              <Text style={styles.saveBtnText}>{savingMeal ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Motivasyon Mesajları Modal */}
      <Modal visible={showMotivationModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Motivasyon Mesajları</Text>
            <TouchableOpacity onPress={() => setShowMotivationModal(false)}>
              <Text style={styles.notifClose}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notifContent}>
            <Card style={styles.notifCard}>
              <View style={styles.notifRow}>
                <View style={styles.notifRowInfo}>
                  <Text style={styles.notifRowTitle}>Sabah Motivasyonu</Text>
                  <Text style={styles.notifRowDesc}>Her sabah güne ilham veren bir mesajla başla</Text>
                </View>
                <Switch
                  value={motivationSettings.enabled}
                  onValueChange={(v) => setMotivationSettings((s) => ({ ...s, enabled: v }))}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={motivationSettings.enabled ? Colors.primary : Colors.textMuted}
                />
              </View>
            </Card>
            {motivationSettings.enabled && (
              <Card style={styles.notifCard}>
                <Text style={styles.notifSectionLabel}>Bildirim Saati</Text>
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
              </Card>
            )}
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
          <View style={styles.notifFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, savingMotivation && styles.saveBtnDisabled]}
              onPress={handleSaveMotivationSettings}
              disabled={savingMotivation}
            >
              <Text style={styles.saveBtnText}>{savingMotivation ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Profili Düzenle Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Profili Düzenle</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.notifClose}>İptal</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notifContent} keyboardShouldPersistTaps="handled">
            <Card style={styles.notifCard}>
              <Text style={styles.editFieldLabel}>İsim</Text>
              <TextInput
                style={styles.editInput}
                value={editData.name}
                onChangeText={(v) => setEditData((p) => ({ ...p, name: v }))}
                placeholder="Adınız"
                placeholderTextColor={Colors.textMuted}
              />
            </Card>
            <Card style={styles.notifCard}>
              <Text style={styles.editFieldLabel}>Kilo (kg)</Text>
              <TextInput
                style={styles.editInput}
                value={editData.weight_kg}
                onChangeText={(v) => setEditData((p) => ({ ...p, weight_kg: v }))}
                placeholder="örn: 72"
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </Card>
            <Card style={styles.notifCard}>
              <Text style={styles.editFieldLabel}>Hedef</Text>
              <View style={styles.optionRow}>
                {(Object.entries(GOALS) as [Goal, { label: string }][]).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionBtn, editData.goal === key && styles.optionBtnActive]}
                    onPress={() => setEditData((p) => ({ ...p, goal: key }))}
                  >
                    <Text style={[styles.optionBtnText, editData.goal === key && styles.optionBtnTextActive]}>
                      {val.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
            <Card style={styles.notifCard}>
              <Text style={styles.editFieldLabel}>Diyet Tipi</Text>
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
            </Card>
            <Card style={styles.notifCard}>
              <Text style={styles.editFieldLabel}>Aktivite Seviyesi</Text>
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
            </Card>
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
          <View style={styles.notifFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, savingEdit && styles.saveBtnDisabled]}
              onPress={saveProfile}
              disabled={savingEdit}
            >
              {savingEdit
                ? <ActivityIndicator color={Colors.textLight} />
                : <Text style={styles.saveBtnText}>Kaydet</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Gizlilik & Güvenlik Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Gizlilik & Güvenlik</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.notifClose}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notifContent}>
            <Card style={styles.notifCard}>
              <Text style={styles.privacySectionTitle}>Veri Güvenliği</Text>
              <Text style={styles.privacyText}>
                Tüm verileriniz Supabase altyapısında şifrelenmiş olarak saklanmaktadır. Üçüncü taraflarla paylaşılmaz.
              </Text>
            </Card>
            <Card style={styles.notifCard}>
              <Text style={styles.privacySectionTitle}>Şifre Sıfırlama</Text>
              <Text style={styles.privacyText}>
                {user?.email} adresinize şifre sıfırlama bağlantısı gönderilebilir.
              </Text>
              <TouchableOpacity
                style={[styles.privacyBtn, sendingReset && styles.saveBtnDisabled]}
                onPress={handlePasswordReset}
                disabled={sendingReset}
              >
                {sendingReset
                  ? <ActivityIndicator color={Colors.textLight} size="small" />
                  : <Text style={styles.privacyBtnText}>Şifre Sıfırlama E-postası Gönder</Text>
                }
              </TouchableOpacity>
            </Card>
            <Card style={styles.notifCard}>
              <Text style={[styles.privacySectionTitle, { color: Colors.error }]}>Tehlikeli Bölge</Text>
              <Text style={styles.privacyText}>
                Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
              </Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
                <Text style={styles.deleteBtnText}>Hesabı Sil</Text>
              </TouchableOpacity>
            </Card>
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
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
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  profileName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  profileBadges: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeSecondary: { backgroundColor: Colors.primaryLight },
  badgeTTM: { backgroundColor: Colors.accent },
  badgeText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  bmrFormula: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  statsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  goalsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  goalLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  goalValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  activityCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  activityValue: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.primary },
  allergiesCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.accentLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  tagText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '600' },
  settingsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  settingIconView: { width: 24 },
  settingLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  settingSubLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  settingLabelWrap: { flex: 1 },
  settingLabelInline: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  activeBadge: {
    backgroundColor: Colors.primaryPale,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  warningBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  warningBadgeText: { fontSize: FontSize.xs, color: '#D97706', fontWeight: '700' },

  // Bildirim Modal
  notifModal: { flex: 1, backgroundColor: Colors.background },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  notifTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  notifClose: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  notifContent: { flex: 1, paddingTop: Spacing.md },
  notifCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifRowInfo: { flex: 1, marginRight: Spacing.md },
  notifRowTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  notifRowDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  notifSectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  optionBtnTextActive: { color: Colors.textLight },
  notifSummary: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primaryPale,
    borderRadius: BorderRadius.md,
  },
  notifSummaryText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '500', lineHeight: 20 },
  notifFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.lg },
  // Öğün modal
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  mealLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  // Edit modal
  editFieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  editInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  // Privacy modal
  privacySectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  privacyText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  privacyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  privacyBtnText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.sm },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  deleteBtnText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
});
