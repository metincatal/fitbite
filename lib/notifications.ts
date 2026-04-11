// expo-notifications'ı statik import ETME — Expo Go'da import sırasında crash/error oluşuyor.
// Bunun yerine lazy require kullanıyoruz: fonksiyon çağrısına kadar modül yüklenmez.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'water_reminder_settings';

export interface WaterReminderSettings {
  enabled: boolean;
  intervalHours: number;
  startHour: number;
  endHour: number;
}

export const DEFAULT_SETTINGS: WaterReminderSettings = {
  enabled: false,
  intervalHours: 2,
  startHour: 8,
  endHour: 22,
};

// --- Lazy module loader ---
type NotifModule = typeof import('expo-notifications');
let _notif: NotifModule | null = null;
let _envChecked = false;
let _isExpoGo = false;

function getNotif(): NotifModule | null {
  // Expo Go tespiti — sadece bir kez yapılır
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

  // Expo Go'da expo-notifications hiç yüklenmesin
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

// --- Handler lazy init ---
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
  } catch {
    // Desteklenmiyor ise sessizce geç
  }
}

// --- Public API ---

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
  try {
    const all = await notif.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.type === 'water_reminder') {
        await notif.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // Sessizce geç
  }
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
    } catch {
      // Tek slot hata verse diğerleri devam etsin
    }
  }
}
