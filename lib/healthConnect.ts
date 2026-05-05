// Defensive Health Connect entegrasyonu.
//
// ÖNEMLI: react-native-health-connect (RNHC) v3'te requestPermission native tarafta
// HealthConnectPermissionDelegate.setPermissionDelegate(MainActivity) çağrısı yapılmamışsa
// bir background coroutine içinden UninitializedPropertyAccessException fırlatır ve
// uygulama TÜM JS try/catch'lerini bypass ederek çöker. Bu çağrıyı sağlayan custom
// config plugin (plugins/withHealthConnectSetup.js) eklendi; ancak eski APK'larda
// güvende olmak için requestPermission'ı dışarıdan tetiklenebilir tek noktada tutuyoruz
// ve cold-start akışında ASLA otomatik çağırmıyoruz. Sadece readRecords/getSdkStatus
// güvenli çağrılardır (kendi içlerinde try/catch'leri var).

import { Platform } from 'react-native';

type RNHC = typeof import('react-native-health-connect');

let _module: RNHC | null = null;
let _moduleLoaded = false;

function getModule(): RNHC | null {
  if (Platform.OS !== 'android') return null;
  if (_moduleLoaded) return _module;
  _moduleLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _module = require('react-native-health-connect') as RNHC;
  } catch {
    _module = null;
  }
  return _module;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);
    promise
      .then((v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  const m = getModule();
  if (!m) return false;
  try {
    const status = await withTimeout(m.getSdkStatus(), 3000, -1);
    return status === m.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/**
 * Sadece kullanıcı ayarlardan Health Connect entegrasyonunu açtığında çağrılmalı.
 * Cold-start (auth + dashboard mount) akışında ASLA otomatik tetiklenmemeli —
 * delegate eksikse native crash riski vardır.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  const m = getModule();
  if (!m) return false;
  try {
    const available = await isHealthConnectAvailable();
    if (!available) return false;

    const initialized = await withTimeout(m.initialize(), 3000, false);
    if (!initialized) return false;

    const granted = await withTimeout(
      m.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]),
      10000,
      [] as Awaited<ReturnType<typeof m.requestPermission>>
    );

    return Array.isArray(granted) && granted.some((p) => p.recordType === 'Steps');
  } catch {
    return false;
  }
}

/**
 * readRecords RNHC tarafında kendi try/catch'i içinde çalışır; izin yoksa promise
 * temizce reject edilir ve null döner. Cold-start akışında güvenle çağrılabilir.
 */
export async function getHealthConnectStepsToday(): Promise<number | null> {
  const m = getModule();
  if (!m) return null;
  try {
    const available = await isHealthConnectAvailable();
    if (!available) return null;

    const initialized = await withTimeout(m.initialize(), 3000, false);
    if (!initialized) return null;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await withTimeout(
      m.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: new Date().toISOString(),
        },
      }),
      3000,
      null as Awaited<ReturnType<typeof m.readRecords<'Steps'>>> | null
    );

    if (!result || !('records' in result)) return null;
    return result.records.reduce((sum, r) => sum + r.count, 0);
  } catch {
    return null;
  }
}
