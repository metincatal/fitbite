import { create } from 'zustand';
import { ActivityLevel, DietType, Goal } from '../lib/constants';
import { NotificationPreferences } from '../types/database';

export interface OnboardingData {
  // Step 3: Name
  name: string;
  // Step 4: Gender + Birth
  gender: 'male' | 'female' | null;
  birth_year: string;
  birth_month: string;
  // Step 5: Body
  height_cm: string;
  weight_kg: string;
  target_weight_kg: string;
  // Step 7: Motivations
  motivations: string[];
  // Step 8: Past obstacles
  past_obstacles: string[];
  // Step 9: Activity
  activity_level: ActivityLevel | null;
  // Step 10: Diet
  diet_type: DietType;
  // Step 11: Allergies
  allergies: string[];
  // Step 12: Meal rhythm
  meal_count: number;
  // Step 13: Meal timing
  first_meal_time: string;
  last_meal_time: string;
  // Step 14: Weight goal rate
  weekly_weight_goal_kg: number;
  // Step 5 derived: Goal
  goal: Goal | null;
  // Step 16: Notifications
  notification_preferences: NotificationPreferences;
}

interface OnboardingStore {
  data: OnboardingData;
  currentStep: number;
  setStep: (step: number) => void;
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleArrayItem: (key: 'motivations' | 'past_obstacles' | 'allergies', item: string) => void;
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
};

export const useOnboardingData = create<OnboardingStore>((set) => ({
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
  reset: () => set({ data: { ...initialData }, currentStep: 0 }),
}));
