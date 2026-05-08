import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { computeStepMetrics } from '../lib/exerciseEngine';

interface ActivityState {
  todaySteps: number;
  isAvailable: boolean;
  permissionGranted: boolean;
  caloriesBurned: number;
  distanceKm: number;
  activeMinutes: number;
  stepGoal: number;
  stepKcal: number;
  stepWaterBonus: number;
  intensityDistribution: { low: number; moderate: number; high: number };

  setTodaySteps: (steps: number) => void;
  setAvailability: (available: boolean, permission: boolean) => void;
  calculateMetrics: (
    weightKg: number,
    heightCm: number,
    age?: number,
    sex?: 'male' | 'female',
  ) => void;
  saveStepLog: (userId: string, stepCount: number) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  todaySteps: 0,
  isAvailable: false,
  permissionGranted: false,
  caloriesBurned: 0,
  distanceKm: 0,
  activeMinutes: 0,
  stepGoal: 10000,
  stepKcal: 0,
  stepWaterBonus: 0,
  intensityDistribution: { low: 100, moderate: 0, high: 0 },

  setTodaySteps: (steps) => set({ todaySteps: steps }),

  setAvailability: (available, permission) =>
    set({ isAvailable: available, permissionGranted: permission }),

  calculateMetrics: (weightKg, heightCm, age = 30, sex = 'male') => {
    const steps = get().todaySteps;
    const strideM = (heightCm * 0.415) / 100;
    const distanceKm = Math.round((steps * strideM) / 1000 * 100) / 100;
    const activeMinutes = Math.round(steps / 100);

    const metrics = computeStepMetrics(steps, weightKg, heightCm, age, sex);
    const caloriesBurned = metrics?.kcalNet ?? 0;
    const stepKcal = metrics?.kcalNet ?? 0;
    const stepWaterBonus = metrics?.waterBonusMl ?? 0;
    const intensityDistribution = metrics?.intensityDistribution ?? { low: 100, moderate: 0, high: 0 };

    set({ caloriesBurned, distanceKm, activeMinutes, stepKcal, stepWaterBonus, intensityDistribution });
  },

  saveStepLog: async (userId, stepCount) => {
    const today = new Date().toISOString().split('T')[0];
    const loggedAt = `${today}T12:00:00`;

    await supabase
      .from('step_logs')
      .upsert(
        { user_id: userId, step_count: stepCount, logged_at: loggedAt },
        { onConflict: 'user_id,logged_at' }
      );
  },
}));
