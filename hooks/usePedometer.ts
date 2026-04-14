import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useActivityStore } from '../store/activityStore';

function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function usePedometer(
  userId: string | undefined,
  weightKg: number | undefined,
  heightCm: number | undefined
) {
  const { setTodaySteps, setAvailability, calculateMetrics, saveStepLog } =
    useActivityStore();
  const liveOffset = useRef(0);
  const baseSteps = useRef(0);

  useEffect(() => {
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let saveInterval: ReturnType<typeof setInterval> | null = null;

    async function init() {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setAvailability(false, false);
        return;
      }

      const { granted } = await Pedometer.requestPermissionsAsync();
      setAvailability(true, granted);
      if (!granted) return;

      // Gunun baslarindan simidiye kadarki adimlari al
      await fetchTodaySteps();

      // Canli adim takibi
      subscription = Pedometer.watchStepCount((result) => {
        liveOffset.current = result.steps;
        const total = baseSteps.current + liveOffset.current;
        setTodaySteps(total);
        if (weightKg && heightCm) {
          calculateMetrics(weightKg, heightCm);
        }
      });

      // Her 5 dakikada Supabase'e kaydet
      if (userId) {
        saveInterval = setInterval(() => {
          const total = baseSteps.current + liveOffset.current;
          if (total > 0) saveStepLog(userId, total);
        }, 5 * 60 * 1000);
      }
    }

    async function fetchTodaySteps() {
      try {
        const result = await Pedometer.getStepCountAsync(getStartOfDay(), new Date());
        baseSteps.current = result.steps;
        liveOffset.current = 0;
        setTodaySteps(result.steps);
        if (weightKg && heightCm) {
          calculateMetrics(weightKg, heightCm);
        }
      } catch {
        // Pedometer veri alınamadı
      }
    }

    // Uygulama on plana donunce yeniden veri cek
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchTodaySteps();
      }
    });

    init();

    return () => {
      subscription?.remove();
      if (saveInterval) clearInterval(saveInterval);
      appStateSub.remove();
      // Son kayit
      if (userId) {
        const total = baseSteps.current + liveOffset.current;
        if (total > 0) saveStepLog(userId, total);
      }
    };
  }, [userId, weightKg, heightCm]);
}
