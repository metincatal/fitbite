// Analiz isteğini AsyncStorage'a yazar/okur/siler.
// Uygulama tamamen kapatılsa bile analiz isteği korunur ve sonraki açılışta devam edilir.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitbite_pending_analysis_v2';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 dakika — eskimiş girdi temizlenir
const MAX_TOTAL_CHARS = 4 * 1024 * 1024; // ~4MB base64 string limiti

export interface PendingAnalysisEntry {
  images: string[];
  hint: string;
  startedAt: number;
}

export async function savePendingAnalysis(images: string[], hint: string): Promise<boolean> {
  try {
    const capped = images.slice(0, 5);
    const totalSize = capped.reduce((s, img) => s + img.length, 0);
    if (totalSize > MAX_TOTAL_CHARS) {
      // Resimler çok büyük — bellekte tutarız ama AsyncStorage'a yazmayız
      return false;
    }
    const entry: PendingAnalysisEntry = { images: capped, hint, startedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export async function loadPendingAnalysis(): Promise<PendingAnalysisEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const entry: PendingAnalysisEntry = JSON.parse(raw);
    if (Date.now() - entry.startedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export async function clearPendingAnalysis(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
