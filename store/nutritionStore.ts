import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { FoodLog, FoodLogWithFood, WaterLog } from '../types';
import { MealType } from '../lib/constants';
import { useExerciseStore } from './exerciseStore';
import { isChronoWindow } from '../lib/exerciseEngine';

interface NutritionState {
  foodLogs: FoodLogWithFood[];
  waterLogs: WaterLog[];
  selectedDate: string;
  isLoading: boolean;

  setSelectedDate: (date: string) => void;
  fetchDayLogs: (userId: string, date: string) => Promise<void>;
  addFoodLog: (
    log: Omit<
      FoodLog,
      | 'id'
      | 'created_at'
      | 'image_url'
      | 'cooking_method'
      | 'texture'
      | 'composition_entry_id'
      | 'engine_confidence'
      | 'engine_factors'
    > & {
      image_url?: string | null;
      cooking_method?: string | null;
      texture?: string | null;
      composition_entry_id?: string | null;
      engine_confidence?: 'high' | 'medium' | 'low' | null;
      engine_factors?: { density: number; yield: number; hidden: number } | null;
    }
  ) => Promise<void>;
  removeFoodLog: (id: string) => Promise<void>;
  addWaterLog: (userId: string, amount_ml: number) => Promise<void>;

  getDailyTotals: () => { calories: number; protein: number; carbs: number; fat: number };
  getWaterTotal: () => number;
  getLogsByMeal: (meal: MealType) => FoodLogWithFood[];
  getExerciseBuffer: (goal: 'lose' | 'maintain' | 'gain') => {
    kcalBurned: number;
    epocRange: [number, number];
    eatBackBudget: number;
    waterBonusML: number;
    chronoWarning: boolean;
    bannerMessage: string;
  };
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  foodLogs: [],
  waterLogs: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  setSelectedDate: (date) => set({ selectedDate: date }),

  fetchDayLogs: async (userId, date) => {
    set({ isLoading: true });

    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;

    const [foodResult, waterResult] = await Promise.all([
      supabase
        .from('food_logs')
        .select('*, food:foods(*)')
        .eq('user_id', userId)
        .gte('logged_at', start)
        .lte('logged_at', end)
        .order('logged_at', { ascending: true }),

      supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', start)
        .lte('logged_at', end),
    ]);

    set({
      foodLogs: (foodResult.data as FoodLogWithFood[]) ?? [],
      waterLogs: waterResult.data ?? [],
      isLoading: false,
    });
  },

  addFoodLog: async (log) => {
    const { data } = await supabase
      .from('food_logs')
      .insert(log)
      .select('*, food:foods(*)')
      .single();

    if (data) {
      set((state) => ({ foodLogs: [...state.foodLogs, data as FoodLogWithFood] }));
    }
  },

  removeFoodLog: async (id) => {
    await supabase.from('food_logs').delete().eq('id', id);
    set((state) => ({ foodLogs: state.foodLogs.filter((l) => l.id !== id) }));
  },

  addWaterLog: async (userId, amount_ml) => {
    const { data } = await supabase
      .from('water_logs')
      .insert({ user_id: userId, amount_ml, logged_at: new Date().toISOString() })
      .select()
      .single();

    if (data) {
      set((state) => ({ waterLogs: [...state.waterLogs, data] }));
    }
  },

  getDailyTotals: () => {
    const logs = get().foodLogs;
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },

  getWaterTotal: () =>
    get().waterLogs.reduce((sum, log) => sum + log.amount_ml, 0),

  getLogsByMeal: (meal) =>
    get().foodLogs.filter((log) => log.meal_type === meal),

  getExerciseBuffer: (goal) => {
    const exerciseStore = useExerciseStore.getState();
    const kcalBurned = exerciseStore.getTotalCaloriesBurned();
    const epocRange = exerciseStore.getEpocRange();
    const eatBackBudget = exerciseStore.getEatBackBudget(goal);
    const waterBonusML = exerciseStore.getWaterBonus();
    const chronoWarning = isChronoWindow();

    let bannerMessage = '';
    if (kcalBurned > 0) {
      if (goal === 'lose') {
        bannerMessage = `Bugün ${kcalBurned} kcal yaktın → +${eatBackBudget} kcal eat-back tamponun var (%50 güvenli pay)`;
      } else {
        bannerMessage = `Bugün ${kcalBurned} kcal yaktın → +${eatBackBudget} kcal tamponun var`;
      }
    }

    return { kcalBurned, epocRange, eatBackBudget, waterBonusML, chronoWarning, bannerMessage };
  },
}));
