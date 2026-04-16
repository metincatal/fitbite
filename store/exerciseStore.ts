import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ExerciseLog, ExerciseLogInsert } from '../types';

interface ExerciseState {
  todayExercises: ExerciseLog[];
  isLoading: boolean;

  fetchTodayExercises: (userId: string, date: string) => Promise<void>;
  addExerciseLog: (log: ExerciseLogInsert) => Promise<void>;
  removeExerciseLog: (id: string) => Promise<void>;
  getTotalCaloriesBurned: () => number;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  todayExercises: [],
  isLoading: false,

  fetchTodayExercises: async (userId, date) => {
    set({ isLoading: true });
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;

    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: false });

    set({
      todayExercises: (data as ExerciseLog[]) ?? [],
      isLoading: false,
    });
  },

  addExerciseLog: async (log) => {
    const { data } = await supabase
      .from('exercise_logs')
      .insert(log)
      .select()
      .single();

    if (data) {
      set((state) => ({
        todayExercises: [data as ExerciseLog, ...state.todayExercises],
      }));
    }
  },

  removeExerciseLog: async (id) => {
    await supabase.from('exercise_logs').delete().eq('id', id);
    set((state) => ({
      todayExercises: state.todayExercises.filter((e) => e.id !== id),
    }));
  },

  getTotalCaloriesBurned: () =>
    get().todayExercises.reduce((sum, e) => sum + e.calories_burned, 0),
}));
