import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityLevel,
  DietType,
  Goal,
  TTMStage,
  OccupationalActivity,
  ExerciseFrequency,
  BodyFatBand,
  MedicalCondition,
} from '../lib/constants';
import { NotificationPreferences, ScoffAnswers } from '../types/database';

export interface OnboardingData {
  // Name
  name: string;
  // Gender + Birth
  gender: 'male' | 'female' | null;
  birth_year: string;
  birth_month: string;
  // Body metrics
  height_cm: string;
  weight_kg: string;
  target_weight_kg: string;
  // Motivations
  motivations: string[];
  // Past obstacles
  past_obstacles: string[];
  // Legacy activity (fallback — yeni kullanıcılar için kullanılmıyor)
  activity_level: ActivityLevel | null;
  // Diet
  diet_type: DietType;
  // Allergies
  allergies: string[];
  // Meal rhythm
  meal_count: number;
  // Meal timing
  first_meal_time: string;
  last_meal_time: string;
  // Weekly weight goal rate
  weekly_weight_goal_kg: number;
  // Derived: Goal
  goal: Goal | null;
  // Notifications
  notification_preferences: NotificationPreferences;
  // Account
  email: string;
  password: string;

  // v2 — Bilimsel yeniden yapılandırma alanları
  ttm_stage: TTMStage | null;
  scoff_answers: ScoffAnswers;
  medical_conditions: MedicalCondition[];
  occupational_activity: OccupationalActivity | null;
  exercise_frequency: ExerciseFrequency | null;
  body_fat_band: BodyFatBand | null;
}

interface OnboardingStore {
  data: OnboardingData;
  currentStep: number;
  setStep: (step: number) => void;
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleArrayItem: (
    key: 'motivations' | 'past_obstacles' | 'allergies',
    item: string
  ) => void;
  toggleMedicalCondition: (item: MedicalCondition) => void;
  setScoffAnswer: (key: keyof ScoffAnswers, value: boolean) => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  name: '',
  gender: null,
  birth_year: '',
  birth_month: '6',
  height_cm: '',
  weight_kg: '',
  target_weight_kg: '',
  motivations: [],
  past_obstacles: [],
  activity_level: null,
  diet_type: 'normal',
  allergies: [],
  meal_count: 3,
  first_meal_time: '08:00',
  last_meal_time: '20:00',
  weekly_weight_goal_kg: 0.5,
  goal: null,
  notification_preferences: {
    meals: true,
    water: true,
    weekly_report: true,
    motivation: false,
  },
  email: '',
  password: '',

  // v2 defaults
  ttm_stage: null,
  scoff_answers: {},
  medical_conditions: [],
  occupational_activity: null,
  exercise_frequency: null,
  body_fat_band: null,
};

export const useOnboardingData = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: { ...initialData },
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),
      updateField: (key, value) =>
        set((state) => ({
          data: { ...state.data, [key]: value },
        })),
      toggleArrayItem: (key, item) =>
        set((state) => {
          const arr = state.data[key] as string[];
          const newArr = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
          return { data: { ...state.data, [key]: newArr } };
        }),
      // "Hiçbiri" seçiminde diğerlerini temizle; başka bir seçimde "none"'ı temizle.
      toggleMedicalCondition: (item) =>
        set((state) => {
          const current = state.data.medical_conditions;
          let next: MedicalCondition[];
          if (item === 'none') {
            next = current.includes('none') ? [] : ['none'];
          } else {
            const withoutNone = current.filter((c) => c !== 'none');
            next = withoutNone.includes(item)
              ? withoutNone.filter((c) => c !== item)
              : [...withoutNone, item];
          }
          return { data: { ...state.data, medical_conditions: next } };
        }),
      setScoffAnswer: (key, value) =>
        set((state) => ({
          data: {
            ...state.data,
            scoff_answers: { ...state.data.scoff_answers, [key]: value },
          },
        })),
      reset: () => set({ data: { ...initialData }, currentStep: 0 }),
    }),
    {
      name: 'fitbite-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState) => {
        const p = (persistedState ?? {}) as Partial<OnboardingStore>;
        const pd = (p.data ?? {}) as Partial<OnboardingData>;
        return {
          ...p,
          data: {
            ...initialData,
            ...pd,
            notification_preferences: {
              ...initialData.notification_preferences,
              ...(pd.notification_preferences ?? {}),
            },
            scoff_answers: {
              ...initialData.scoff_answers,
              ...(pd.scoff_answers ?? {}),
            },
            medical_conditions: pd.medical_conditions ?? [],
            motivations: pd.motivations ?? [],
            past_obstacles: pd.past_obstacles ?? [],
            allergies: pd.allergies ?? [],
          },
          currentStep: p.currentStep ?? 0,
        } as OnboardingStore;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingStore>;
        const pd = (p.data ?? {}) as Partial<OnboardingData>;
        return {
          ...current,
          ...p,
          data: {
            ...initialData,
            ...pd,
            notification_preferences: {
              ...initialData.notification_preferences,
              ...(pd.notification_preferences ?? {}),
            },
            scoff_answers: {
              ...initialData.scoff_answers,
              ...(pd.scoff_answers ?? {}),
            },
            medical_conditions: pd.medical_conditions ?? [],
            motivations: pd.motivations ?? [],
            past_obstacles: pd.past_obstacles ?? [],
            allergies: pd.allergies ?? [],
          },
        };
      },
    }
  )
);
