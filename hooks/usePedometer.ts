import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActivityStore } from '../store/activityStore';
import { supabase } from '../lib/supabase';
import {
  isHealthConnectAvailable,
  requestHealthConnectPermission,
  getTodayStepsFromHealthConnect,
} from '../lib/healthConnect';

const STEPS_CACHE_KEY = 'fitbite_steps_cache';

function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadCachedSteps(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STEPS_CACHE_KEY);
    if (!raw) return 0;
    const { date, steps } = JSON.parse(raw);
    return date === getToday() ? (steps as number) : 0;
  } catch {
    return 0;
  }
}

async function saveCachedSteps(steps: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STEPS_CACHE_KEY, JSON.stringify({ date: getToday(), steps }));
  } catch {}
}

async function loadSupabaseSteps(userId: string): Promise<number> {
  try {
    const today = getToday();
    const { data } = await supabase
      .from('step_logs')
      .select('step_count')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();
    return (data?.step_count as number) ?? 0;
  } catch {
    return 0;
  }
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
  const useHealthConnect = useRef(false);

  function applySteps(total: number) {
    setTodaySteps(total);
    if (weightKg && heightCm) calculateMetrics(weightKg, heightCm);
  }

  function currentTotal() {
    return baseSteps.current + liveOffset.current;
  }

  async function persistNow() {
    const total = currentTotal();
    if (total <= 0) return;
    saveCachedSteps(total);
    if (userId) saveStepLog(userId, total);
  }

  async function fetchSteps(floor = 0): Promise<number> {
    // Health Connect varsa oradan oku (uygulama kapali iken de sayar)
    if (useHealthConnect.current) {
      const hcSteps = await getTodayStepsFromHealthConnect();
      if (hcSteps !== null) return Math.max(hcSteps, floor);
    }

    // Fallback: expo-sensors Pedometer
    try {
      const result = await Pedometer.getStepCountAsync(getStartOfDay(), new Date());
      return Math.max(result.steps, floor);
    } catch {
      return floor;
    }
  }

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

      // Android'de Health Connect'i dene
      if (Platform.OS === 'android') {
        const hcAvailable = await isHealthConnectAvailable();
        if (hcAvailable) {
          const hcGranted = await requestHealthConnectPermission();
          useHealthConnect.current = hcGranted;
        }
      }

      // Bilinen en iyi degeri hemen goster
      const [cached, supabaseSteps] = await Promise.all([
        loadCachedSteps(),
        userId ? loadSupabaseSteps(userId) : Promise.resolve(0),
      ]);
      const knownFloor = Math.max(cached, supabaseSteps);
      if (knownFloor > 0) {
        baseSteps.current = knownFloor;
        applySteps(knownFloor);
      }

      // Gercek adim verisini getir
      const steps = await fetchSteps(knownFloor);
      baseSteps.current = steps;
      liveOffset.current = 0;
      applySteps(steps);
      saveCachedSteps(steps);

      // Health Connect kullaniyorsa canli sayim gerekmez (zaten OS sayiyor)
      // Expo-sensors ile canli sayim
      if (!useHealthConnect.current) {
        subscription = Pedometer.watchStepCount((result) => {
          liveOffset.current = result.steps;
          const total = currentTotal();
          applySteps(total);
          saveCachedSteps(total);
        });
      }

      if (userId) {
        saveInterval = setInterval(persistNow, 5 * 60 * 1000);
      }
    }

    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const floor = currentTotal();
        const steps = await fetchSteps(floor);
        baseSteps.current = steps;
        liveOffset.current = 0;
        applySteps(steps);
        saveCachedSteps(steps);
      } else if (state === 'background' || state === 'inactive') {
        await persistNow();
      }
    });

    init();

    return () => {
      subscription?.remove();
      if (saveInterval) clearInterval(saveInterval);
      appStateSub.remove();
      persistNow();
    };
  }, [userId, weightKg, heightCm]);
}
