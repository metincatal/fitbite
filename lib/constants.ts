export const Colors = {
  // Ana renkler
  primary: '#2D6A4F',
  primaryLight: '#52B788',
  primaryPale: '#B7E4C7',
  primaryDark: '#1B4332',

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
  hero: 40,
};

export const MEAL_TYPES = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
  snack: 'Atıştırmalık',
} as const;

export type MealType = keyof typeof MEAL_TYPES;

export function getMealTypes(mealCount: number): { key: string; label: string }[] {
  switch (mealCount) {
    case 2:
      return [
        { key: 'breakfast', label: 'Öğün 1' },
        { key: 'dinner', label: 'Öğün 2' },
        { key: 'snack', label: 'Atıştırmalık' },
      ];
    case 4:
      return [
        { key: 'breakfast', label: 'Kahvaltı' },
        { key: 'snack', label: 'Ara Öğün' },
        { key: 'lunch', label: 'Öğle' },
        { key: 'dinner', label: 'Akşam' },
        { key: 'snack', label: 'Atıştırmalık' },
      ];
    default: // 3
      return [
        { key: 'breakfast', label: 'Kahvaltı' },
        { key: 'lunch', label: 'Öğle' },
        { key: 'dinner', label: 'Akşam' },
        { key: 'snack', label: 'Atıştırmalık' },
      ];
  }
}

export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Hareketsiz', description: 'Masa başı iş, az yürüme', multiplier: 1.2 },
  light: { label: 'Hafif aktif', description: 'Hafif egzersiz, haftada 1-3 gün', multiplier: 1.375 },
  moderate: { label: 'Orta aktif', description: 'Orta egzersiz, haftada 3-5 gün', multiplier: 1.55 },
  active: { label: 'Çok aktif', description: 'Ağır egzersiz, haftada 6-7 gün', multiplier: 1.725 },
  very_active: { label: 'Ekstra aktif', description: 'Çok ağır egzersiz veya fiziksel iş', multiplier: 1.9 },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

export const DIET_TYPES = {
  normal: { label: 'Normal', description: 'Her şey serbest', emoji: '🍽️' },
  vegetarian: { label: 'Vejetaryen', description: 'Et yok, süt/yumurta var', emoji: '🥬' },
  vegan: { label: 'Vegan', description: 'Hayvansal ürün yok', emoji: '🌱' },
  pescatarian: { label: 'Pesketaryen', description: 'Balık + vejetaryen', emoji: '🐟' },
  keto: { label: 'Keto', description: 'Düşük karb, yüksek yağ', emoji: '🥑' },
  paleo: { label: 'Paleo', description: 'Doğal, işlenmemiş gıdalar', emoji: '🥩' },
  mediterranean: { label: 'Akdeniz', description: 'Zeytinyağı, sebze, balık', emoji: '🫒' },
  gluten_free: { label: 'Glutensiz', description: 'Gluten içermeyen beslenme', emoji: '🌾' },
  flexitarian: { label: 'Esnek Vejetaryen', description: 'Çoğunlukla bitkisel', emoji: '🥗' },
  lactose_free: { label: 'Laktozsuz', description: 'Süt ürünlerinden kaçınma', emoji: '🥛' },
} as const;

export type DietType = keyof typeof DIET_TYPES;

export const GOALS = {
  lose: { label: 'Kilo ver', calorieOffset: -500 },
  maintain: { label: 'Kiloyu koru', calorieOffset: 0 },
  gain: { label: 'Kilo al', calorieOffset: 300 },
} as const;

export type Goal = keyof typeof GOALS;

export const MOTIVATIONS = [
  { key: 'weight_management', label: 'Kilo Yönetimi', icon: 'scale-outline' },
  { key: 'more_energy', label: 'Daha Fazla Enerji', icon: 'flash-outline' },
  { key: 'mental_clarity', label: 'Zihinsel Berraklık', icon: 'bulb-outline' },
  { key: 'better_digestion', label: 'Daha İyi Sindirim', icon: 'leaf-outline' },
  { key: 'immune_boost', label: 'Bağışıklık Güçlendirme', icon: 'shield-outline' },
  { key: 'blood_sugar', label: 'Kan Şekerini Dengele', icon: 'analytics-outline' },
  { key: 'muscle_gain', label: 'Kas Kazanımı', icon: 'barbell-outline' },
  { key: 'better_sleep', label: 'Daha İyi Uyku', icon: 'moon-outline' },
  { key: 'skin_hair', label: 'Sağlıklı Cilt & Saç', icon: 'sparkles-outline' },
  { key: 'stress_management', label: 'Stres Yönetimi', icon: 'heart-outline' },
] as const;

export const OBSTACLES = [
  { key: 'time', label: 'Vakit darlığı', description: 'Yoğun iş temposu yüzünden' },
  { key: 'tracking', label: 'Takip etmek zor', description: 'Kalori saymak sıkıcı geliyor' },
  { key: 'food_stress', label: 'Yiyecek seçimlerinde stres', description: 'Ne yesem bilmiyorum' },
  { key: 'motivation', label: 'Motivasyon kaybı', description: 'Başlıyorum ama bırakıyorum' },
  { key: 'social', label: 'Sosyal baskı', description: 'Çevre uyumu zor' },
  { key: 'info_overload', label: 'Bilgi karmaşası', description: 'Hangi diyet doğru bilmiyorum' },
] as const;

export const ALLERGIES = [
  { key: 'gluten', label: 'Gluten', description: 'Sindirimini ve enerjini yorabilir', emoji: '🌾' },
  { key: 'lactose', label: 'Laktoz', description: 'Süt ürünlerinde bulunan şeker', emoji: '🥛' },
  { key: 'egg', label: 'Yumurta', description: 'Cilt veya bağırsak reaksiyonları', emoji: '🥚' },
  { key: 'nuts', label: 'Fıstık / Kuruyemiş', description: 'Ciddi alerjik reaksiyon riski', emoji: '🥜' },
  { key: 'seafood', label: 'Deniz Ürünleri', description: 'Balık ve kabuklu deniz ürünleri', emoji: '🦐' },
  { key: 'soy', label: 'Soya', description: 'Birçok işlenmiş gıdada bulunur', emoji: '🫘' },
  { key: 'sesame', label: 'Susam', description: 'Ekmek ve tahıl ürünlerinde yaygın', emoji: '🫓' },
] as const;

export const MEAL_RHYTHMS = [
  { count: 2, label: '2 Öğün', subtitle: '16/8 Orucu / IF Akışı', icon: 'time-outline' },
  { count: 3, label: '3 Öğün', subtitle: 'Dengeli Akış', icon: 'restaurant-outline' },
  { count: 4, label: '4+ Öğün', subtitle: 'Sık ve Az', icon: 'grid-outline' },
] as const;

export const EXERCISE_CATEGORIES = [
  { key: 'running', label: 'Koşu', icon: 'walk-outline', emoji: '🏃', color: '#EF4444', met: { low: 6.0, moderate: 8.3, high: 11.0 } },
  { key: 'walking', label: 'Yürüyüş', icon: 'footsteps-outline', emoji: '🚶', color: '#22C55E', met: { low: 2.5, moderate: 3.5, high: 5.0 } },
  { key: 'cycling', label: 'Bisiklet', icon: 'bicycle-outline', emoji: '🚴', color: '#3B82F6', met: { low: 4.0, moderate: 6.8, high: 10.0 } },
  { key: 'swimming', label: 'Yüzme', icon: 'water-outline', emoji: '🏊', color: '#06B6D4', met: { low: 4.5, moderate: 7.0, high: 10.0 } },
  { key: 'weight_training', label: 'Ağırlık', icon: 'barbell-outline', emoji: '🏋️', color: '#8B5CF6', met: { low: 3.0, moderate: 5.0, high: 6.0 } },
  { key: 'yoga', label: 'Yoga', icon: 'body-outline', emoji: '🧘', color: '#EC4899', met: { low: 2.0, moderate: 3.0, high: 4.0 } },
  { key: 'hiit', label: 'HIIT', icon: 'flash-outline', emoji: '⚡', color: '#F97316', met: { low: 6.0, moderate: 8.0, high: 12.0 } },
  { key: 'pilates', label: 'Pilates', icon: 'fitness-outline', emoji: '🤸', color: '#14B8A6', met: { low: 2.5, moderate: 4.0, high: 5.5 } },
  { key: 'dance', label: 'Dans', icon: 'musical-notes-outline', emoji: '💃', color: '#F43F5E', met: { low: 3.0, moderate: 5.0, high: 7.5 } },
  { key: 'football', label: 'Futbol', icon: 'football-outline', emoji: '⚽', color: '#10B981', met: { low: 5.0, moderate: 7.0, high: 10.0 } },
  { key: 'basketball', label: 'Basketbol', icon: 'basketball-outline', emoji: '🏀', color: '#F59E0B', met: { low: 4.5, moderate: 6.5, high: 8.0 } },
  { key: 'tennis', label: 'Tenis', icon: 'tennisball-outline', emoji: '🎾', color: '#84CC16', met: { low: 4.0, moderate: 7.0, high: 10.0 } },
  { key: 'stretching', label: 'Esneme', icon: 'resize-outline', emoji: '🙆', color: '#A78BFA', met: { low: 2.0, moderate: 2.5, high: 3.5 } },
  { key: 'stair_climbing', label: 'Merdiven', icon: 'trending-up-outline', emoji: '🪜', color: '#64748B', met: { low: 4.0, moderate: 8.0, high: 12.0 } },
  { key: 'other', label: 'Diğer', icon: 'ellipsis-horizontal-outline', emoji: '🏅', color: '#6B7280', met: { low: 3.0, moderate: 5.0, high: 7.0 } },
] as const;

export type ExerciseIntensity = 'low' | 'moderate' | 'high';

export const INTENSITY_LABELS: Record<ExerciseIntensity, { label: string; emoji: string; color: string }> = {
  low: { label: 'Hafif', emoji: '😌', color: '#22C55E' },
  moderate: { label: 'Orta', emoji: '💪', color: '#F59E0B' },
  high: { label: 'Yoğun', emoji: '🔥', color: '#EF4444' },
};

export function calculateExerciseCalories(
  met: number,
  weightKg: number,
  durationMinutes: number,
): number {
  // Kalori = MET × Kilo(kg) × Süre(saat)
  return Math.round(met * weightKg * (durationMinutes / 60));
}

