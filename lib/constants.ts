export const Colors = {
  // Ana renkler
  primary: '#2D6A4F',
  primaryLight: '#52B788',
  primaryPale: '#B7E4C7',

  // Arka plan
  background: '#FAFDF6',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F7F4',

  // Aksan
  accent: '#F4845F',
  accentLight: '#F9B8A3',

  // Metin
  textPrimary: '#1A2E22',
  textSecondary: '#4A6B57',
  textMuted: '#8FAF9B',
  textLight: '#FFFFFF',

  // Durum
  success: '#2D6A4F',
  warning: '#F4845F',
  error: '#E63946',
  info: '#52B788',

  // Sınır
  border: '#D8EDE3',
  borderLight: '#EEF7F2',

  // Makro renkler
  protein: '#52B788',
  carbs: '#F4845F',
  fat: '#FFB703',
  fiber: '#8ECAE6',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const MEAL_TYPES = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
  snack: 'Atıştırmalık',
} as const;

export type MealType = keyof typeof MEAL_TYPES;

export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Hareketsiz', multiplier: 1.2 },
  light: { label: 'Hafif aktif', multiplier: 1.375 },
  moderate: { label: 'Orta aktif', multiplier: 1.55 },
  active: { label: 'Çok aktif', multiplier: 1.725 },
  very_active: { label: 'Ekstra aktif', multiplier: 1.9 },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

export const DIET_TYPES = {
  normal: 'Normal',
  vegetarian: 'Vejetaryen',
  vegan: 'Vegan',
  gluten_free: 'Glutensiz',
  lactose_free: 'Laktoz İçermez',
} as const;

export type DietType = keyof typeof DIET_TYPES;

export const GOALS = {
  lose: { label: 'Kilo ver', calorieOffset: -500 },
  maintain: { label: 'Kiloyu koru', calorieOffset: 0 },
  gain: { label: 'Kilo al', calorieOffset: 300 },
} as const;

export type Goal = keyof typeof GOALS;
