import { ActivityLevel, Goal, ACTIVITY_LEVELS, GOALS } from './constants';

export interface UserMetrics {
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
}

/**
 * Mifflin-St Jeor denklemi ile BMR hesapla
 */
export function calculateBMR(metrics: UserMetrics): number {
  const { gender, age, height_cm, weight_kg } = metrics;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * TDEE hesapla (BMR × aktivite faktörü)
 */
export function calculateTDEE(metrics: UserMetrics): number {
  const bmr = calculateBMR(metrics);
  const multiplier = ACTIVITY_LEVELS[metrics.activity_level].multiplier;
  return Math.round(bmr * multiplier);
}

/**
 * Hedefe göre günlük kalori hedefini hesapla
 * Güvenlik sınırları: Kadın min 1200, Erkek min 1500
 */
export function calculateDailyCalorieGoal(metrics: UserMetrics): number {
  const tdee = calculateTDEE(metrics);
  const offset = GOALS[metrics.goal].calorieOffset;
  const target = tdee + offset;

  const minCalories = metrics.gender === 'male' ? 1500 : 1200;
  return Math.max(target, minCalories);
}

export interface MacroGoals {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

/**
 * WHO ve Türkiye Beslenme Rehberi referanslı makro hesaplama
 */
export function calculateMacroGoals(metrics: UserMetrics): MacroGoals {
  const calories = calculateDailyCalorieGoal(metrics);

  // Protein: 1.2-1.6 g/kg (hedefe göre)
  const proteinPerKg = metrics.goal === 'gain' ? 1.8 : metrics.goal === 'lose' ? 1.6 : 1.2;
  const protein_g = Math.round(metrics.weight_kg * proteinPerKg);

  // Yağ: %30 kalori
  const fat_g = Math.round((calories * 0.30) / 9);

  // Karbonhidrat: kalan kalorileri doldur
  const proteinCalories = protein_g * 4;
  const fatCalories = fat_g * 9;
  const carbs_g = Math.round((calories - proteinCalories - fatCalories) / 4);

  return { protein_g, carbs_g, fat_g, calories };
}

/**
 * İdeal vücut ağırlığı (Devine formülü)
 */
export function calculateIdealWeight(gender: 'male' | 'female', height_cm: number): number {
  const heightInches = (height_cm - 152.4) / 2.54;
  const base = gender === 'male' ? 50 : 45.5;
  return Math.round(base + 2.3 * heightInches);
}

/**
 * BMI hesapla
 */
export function calculateBMI(weight_kg: number, height_cm: number): number {
  const heightM = height_cm / 100;
  return Math.round((weight_kg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla kilolu';
  return 'Obez';
}
