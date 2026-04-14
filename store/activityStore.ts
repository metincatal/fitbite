import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ActivityState {
  todaySteps: number;
  isAvailable: boolean;
  permissionGranted: boolean;
  caloriesBurned: number;
  distanceKm: number;
  activeMinutes: number;
  stepGoal: number;

  setTodaySteps: (steps: number) => void;
  setAvailability: (available: boolean, permission: boolean) => void;
  calculateMetrics: (weightKg: number, heightCm: number) => void;
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

  setTodaySteps: (steps) => set({ todaySteps: steps }),

  setAvailability: (available, permission) =>
    set({ isAvailable: available, permissionGranted: permission }),

  calculateMetrics: (weightKg, heightCm) => {
    const steps = get().todaySteps;
    const caloriesBurned = Math.round(steps * 0.04 * weightKg);
    const strideM = (heightCm * 0.415) / 100;
    const distanceKm = Math.round((steps * strideM) / 1000 * 100) / 100;
    const activeMinutes = Math.round(steps / 100);
    set({ caloriesBurned, distanceKm, activeMinutes });
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
