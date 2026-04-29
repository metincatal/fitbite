import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

function getStartOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function requestHealthConnectPermission(): Promise<boolean> {
  try {
    await initialize();
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);
    return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  } catch {
    return false;
  }
}

export async function getTodayStepsFromHealthConnect(): Promise<number | null> {
  try {
    await initialize();
    const { records } = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: getStartOfDay(),
        endTime: new Date().toISOString(),
      },
    });
    return records.reduce((sum, r) => sum + r.count, 0);
  } catch {
    return null;
  }
}
