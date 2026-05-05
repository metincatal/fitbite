// expo-notifications'ı statik import ETME — Expo Go'da import sırasında crash/error oluşuyor.
// Bunun yerine lazy require kullanıyoruz: fonksiyon çağrısına kadar modül yüklenmez.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// --- AsyncStorage Keys ---
const STORAGE_KEY = 'water_reminder_settings';
const MEAL_REMINDER_KEY = 'meal_reminder_settings';
const STEP_REMINDER_KEY = 'step_reminder_settings';
const MOTIVATION_SETTINGS_KEY = 'motivation_settings';
const WATER_GOAL_NOTIFIED_KEY = 'water_goal_notified_date';

// --- Interfaces ---

export interface WaterReminderSettings {
  enabled: boolean;
  intervalHours: number;
  startHour: number;
  endHour: number;
}

export interface MealReminderSettings {
  enabled: boolean;
  breakfast: { enabled: boolean; hour: number; minute: number };
  lunch: { enabled: boolean; hour: number; minute: number };
  dinner: { enabled: boolean; hour: number; minute: number };
}

export interface StepReminderSettings {
  enabled: boolean;
  hour: number;
}

export interface MotivationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

// --- Default Settings ---

export const DEFAULT_SETTINGS: WaterReminderSettings = {
  enabled: false,
  intervalHours: 2,
  startHour: 8,
  endHour: 22,
};

export const DEFAULT_MEAL_SETTINGS: MealReminderSettings = {
  enabled: false,
  breakfast: { enabled: true, hour: 8, minute: 0 },
  lunch: { enabled: true, hour: 12, minute: 30 },
  dinner: { enabled: true, hour: 19, minute: 0 },
};

export const DEFAULT_STEP_SETTINGS: StepReminderSettings = {
  enabled: true,
  hour: 19,
};

export const DEFAULT_MOTIVATION_SETTINGS: MotivationSettings = {
  enabled: false,
  hour: 7,
  minute: 30,
};

// --- Motivasyon Mesaj Havuzu ---
const MOTIVATION_MESSAGES = [
  'Dün ne yaptığın değil, bugün ne yapacağın önemli. 💪',
  'Her sağlıklı karar seni hedefe bir adım yaklaştırıyor. 🌿',
  'Küçük adımlar büyük değişimlere yol açar. Devam et! 🚀',
  'Bugün vücuduna yatırım yapmak, yarın daha iyi hissetmek demek. ✨',
  'Hedeflerin seni burada bekliyor. Güne başlamanın tam zamanı! 🌅',
  'En iyi antreman yapılmış olanıdır. Küçük de olsa harekete geç! 🏃',
  'Sağlıklı yaşam bir sprint değil, maraton. Temponuzu koruyun. 🎯',
  'Bugün nasıl beslendiğin, yarın nasıl hissedeceğini belirler. 🥗',
  'Bilinçli her lokma, hedefine götüren bir adım. 💚',
  'Kendinle gurur duyabileceğin bir gün geçir. Biz buradayız! 😊',
  'Hareket etmek moralini de yükseltir. Bugün biraz daha aktif ol! ⚡',
  'Suyu unutma, metabolizman için en önemli destek. 💧',
  'Tutarlılık mükemmeliyetten daha değerlidir. Her gün biraz daha iyi. 📈',
  'Bugün için değil, gelecekteki sen için seçim yap. 🌟',
];

// --- Lazy Module Loader ---
type NotifModule = typeof import('expo-notifications');
let _notif: NotifModule | null = null;
let _envChecked = false;
let _isExpoGo = false;

function getNotif(): NotifModule | null {
  if (!_envChecked) {
    _envChecked = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Constants = require('expo-constants').default;
      _isExpoGo = Constants.executionEnvironment === 'storeClient';
    } catch {
      _isExpoGo = false;
    }
  }

  if (_isExpoGo) return null;

  if (!_notif) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _notif = require('expo-notifications') as NotifModule;
    } catch {
      return null;
    }
  }

  return _notif;
}

// --- Handler Lazy Init ---
let _handlerSet = false;
function ensureHandler(notif: NotifModule) {
  if (_handlerSet) return;
  try {
    notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    _handlerSet = true;
  } catch {}
}

// --- Yardımcı: Tipli bildirimleri iptal et ---
async function cancelByType(notif: NotifModule, type: string): Promise<void> {
  try {
    const all = await notif.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.type === type) {
        await notif.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

// ============================================================
// PUBLIC API — Su Hatırlatıcısı (mevcut, korunuyor)
// ============================================================

export async function loadReminderSettings(): Promise<WaterReminderSettings> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveReminderSettings(settings: WaterReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const notif = getNotif();
  if (!notif) return false;
  try {
    const { status } = await notif.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelWaterReminders(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  await cancelByType(notif, 'water_reminder');
}

export async function scheduleWaterReminders(settings: WaterReminderSettings): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);
  await cancelWaterReminders();

  if (!settings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const messages = [
    'Bir bardak su içmeyi unutma! 💧',
    'Vücudun suya ihtiyaç duyuyor, hadi bir yudum al! 🌿',
    'Sağlıklı kalmak için su iç! 💪',
    'Su içme zamanı geldi! Hedefine ulaşmak için devam et.',
  ];

  let msgIndex = 0;
  for (let h = settings.startHour; h <= settings.endHour; h += settings.intervalHours) {
    const msg = messages[msgIndex % messages.length];
    msgIndex++;
    try {
      await notif.scheduleNotificationAsync({
        content: {
          title: '💧 Su Zamanı!',
          body: msg,
          sound: true,
          data: { type: 'water_reminder' },
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: h,
          minute: 0,
        },
      });
    } catch {}
  }
}

// ============================================================
// PUBLIC API — Öğün Hatırlatıcıları
// ============================================================

export async function loadMealReminderSettings(): Promise<MealReminderSettings> {
  try {
    const json = await AsyncStorage.getItem(MEAL_REMINDER_KEY);
    if (!json) return DEFAULT_MEAL_SETTINGS;
    return { ...DEFAULT_MEAL_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_MEAL_SETTINGS;
  }
}

export async function saveMealReminderSettings(settings: MealReminderSettings): Promise<void> {
  await AsyncStorage.setItem(MEAL_REMINDER_KEY, JSON.stringify(settings));
}

export async function cancelMealReminders(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  await cancelByType(notif, 'meal_reminder_breakfast');
  await cancelByType(notif, 'meal_reminder_lunch');
  await cancelByType(notif, 'meal_reminder_dinner');
}

export async function scheduleMealReminders(settings: MealReminderSettings): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);
  await cancelMealReminders();

  if (!settings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const meals = [
    {
      slot: settings.breakfast,
      type: 'meal_reminder_breakfast',
      title: '🌅 Kahvaltı Zamanı!',
      body: 'Güne sağlıklı başla. Kahvaltını loglamayı unutma!',
    },
    {
      slot: settings.lunch,
      type: 'meal_reminder_lunch',
      title: '☀️ Öğle Yemeği!',
      body: 'Öğle yemeği vakti. Bilinçli bir tercih yap ve logla.',
    },
    {
      slot: settings.dinner,
      type: 'meal_reminder_dinner',
      title: '🌙 Akşam Yemeği!',
      body: 'Günü iyi bitir. Akşam yemeğini loglamayı unutma!',
    },
  ];

  for (const meal of meals) {
    if (!meal.slot.enabled) continue;
    try {
      await notif.scheduleNotificationAsync({
        content: {
          title: meal.title,
          body: meal.body,
          sound: true,
          data: { type: meal.type },
        },
        trigger: {
          type: notif.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: meal.slot.hour,
          minute: meal.slot.minute,
        },
      });
    } catch {}
  }
}

// ============================================================
// PUBLIC API — Adım Hedefi Hatırlatıcısı
// ============================================================

export async function loadStepReminderSettings(): Promise<StepReminderSettings> {
  try {
    const json = await AsyncStorage.getItem(STEP_REMINDER_KEY);
    if (!json) return DEFAULT_STEP_SETTINGS;
    return { ...DEFAULT_STEP_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_STEP_SETTINGS;
  }
}

export async function saveStepReminderSettings(settings: StepReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STEP_REMINDER_KEY, JSON.stringify(settings));
}

export async function cancelStepReminder(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  await cancelByType(notif, 'step_reminder');
}

export async function scheduleStepReminder(settings: StepReminderSettings): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);
  await cancelStepReminder();

  if (!settings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: '👟 Adım Hedefin!',
        body: 'Günlük adım hedefinize ulaştın mı? Biraz daha hareket sağlığın için harika!',
        sound: true,
        data: { type: 'step_reminder' },
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        hour: settings.hour,
        minute: 0,
      },
    });
  } catch {}
}

// Adım hedefine ulaşılınca bugünün hatırlatıcısını iptal et
export async function cancelStepReminderToday(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  // Bugünkü günü iptal etmek için tüm step_reminder bildirimlerini iptal et,
  // sabah scheduleStepReminder ile yeniden kurulmayacak — yeterli çünkü CALENDAR
  // trigger zaten yarın tekrar tetiklenir. Bugünkü pencere geçmiş olduğundan sorun olmaz.
  await cancelByType(notif, 'step_reminder');

  // Yarın için yeniden kur (settings'ten oku)
  const settings = await loadStepReminderSettings();
  if (settings.enabled) {
    await scheduleStepReminder(settings);
  }
}

// ============================================================
// PUBLIC API — Motivasyon Mesajları
// ============================================================

export async function loadMotivationSettings(): Promise<MotivationSettings> {
  try {
    const json = await AsyncStorage.getItem(MOTIVATION_SETTINGS_KEY);
    if (!json) return DEFAULT_MOTIVATION_SETTINGS;
    return { ...DEFAULT_MOTIVATION_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_MOTIVATION_SETTINGS;
  }
}

export async function saveMotivationSettings(settings: MotivationSettings): Promise<void> {
  await AsyncStorage.setItem(MOTIVATION_SETTINGS_KEY, JSON.stringify(settings));
}

export async function cancelMotivationMessages(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  await cancelByType(notif, 'motivation');
}

export async function scheduleMotivationMessages(settings: MotivationSettings): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);
  await cancelMotivationMessages();

  if (!settings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Rotasyonel mesaj — bugünün gün numarasına göre sabit seçim (her gün farklı)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const msg = MOTIVATION_MESSAGES[dayOfYear % MOTIVATION_MESSAGES.length];

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: '✨ Günaydın!',
        body: msg,
        sound: true,
        data: { type: 'motivation' },
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  } catch {}
}

// ============================================================
// PUBLIC API — Haftalık Rapor
// ============================================================

export async function cancelWeeklyReport(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;
  await cancelByType(notif, 'weekly_report');
}

export async function scheduleWeeklyReport(enabled: boolean): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);
  await cancelWeeklyReport();

  if (!enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: '📊 Haftalık Rapor Hazır!',
        body: "Geçen haftanı FitBite'da gözden geçir. Nasıl gittin? 🎯",
        sound: true,
        data: { type: 'weekly_report' },
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        weekday: 2, // Pazartesi (1=Pazar, 2=Pazartesi)
        hour: 9,
        minute: 0,
      },
    });
  } catch {}
}

// ============================================================
// PUBLIC API — Su Hedefi Achievement (programmatic)
// ============================================================

export async function triggerWaterGoalAchievement(): Promise<void> {
  const notif = getNotif();
  if (!notif) return;

  ensureHandler(notif);

  // Bugün zaten gönderildiyse tekrar gönderme
  const today = new Date().toISOString().split('T')[0];
  try {
    const lastDate = await AsyncStorage.getItem(WATER_GOAL_NOTIFIED_KEY);
    if (lastDate === today) return;
    await AsyncStorage.setItem(WATER_GOAL_NOTIFIED_KEY, today);
  } catch {}

  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: '🎉 Günlük Su Hedefi!',
        body: 'Tebrikler! Bugünkü su hedefine ulaştın. Harika bir alışkanlık! 💧',
        sound: true,
        data: { type: 'water_goal_achievement' },
      },
      trigger: null, // Anında göster
    });
  } catch {}
}

// ============================================================
// PUBLIC API — İlk login sonrası izin kontrolü
// ============================================================

export async function checkAndRequestNotificationPermission(): Promise<boolean> {
  const notif = getNotif();
  if (!notif) return false;

  try {
    const { status } = await notif.getPermissionsAsync();
    if (status === 'granted') return true;
    if (status === 'undetermined') {
      const { status: newStatus } = await notif.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    // 'denied' — sistem izni verilmemiş, kullanıcıya bilgi ver
    Alert.alert(
      'Bildirimler Kapalı',
      'FitBite bildirimleri almak için Ayarlar > FitBite > Bildirimler bölümünden izin ver.',
      [{ text: 'Tamam' }]
    );
    return false;
  } catch {
    return false;
  }
}
