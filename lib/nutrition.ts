import {
  ActivityLevel,
  Goal,
  ACTIVITY_LEVELS,
  GOALS,
  OccupationalActivity,
  ExerciseFrequency,
  BodyFatBand,
  MedicalCondition,
  CHRONIC_DISEASES,
  getBodyFatPercentageFromBand,
} from './constants';

export interface UserMetrics {
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: Goal;

  // Legacy tek-PAL fallback için (eski kullanıcılar)
  activity_level?: ActivityLevel;

  // v2 bilimsel girdiler (opsiyonel — yoksa fallback devreye girer)
  occupational_activity?: OccupationalActivity;
  exercise_frequency?: ExerciseFrequency;
  body_fat_band?: BodyFatBand;
  body_fat_percentage?: number;
}

export type BMRFormula = 'mifflin' | 'katch_mcardle';

export interface BMRResult {
  value: number;
  formula: BMRFormula;
}

/**
 * Dual BMR: vücut yağ oranı varsa Katch-McArdle, yoksa Mifflin-St Jeor.
 */
export function calculateBMR(m: UserMetrics): BMRResult {
  const bfp = resolveBodyFatPercentage(m);
  if (bfp !== null && bfp > 3 && bfp < 60) {
    const lbm = m.weight_kg * (1 - bfp / 100);
    return { value: Math.round(370 + 21.6 * lbm), formula: 'katch_mcardle' };
  }
  const base = 10 * m.weight_kg + 6.25 * m.height_cm - 5 * m.age;
  const value = Math.round(m.gender === 'male' ? base + 5 : base - 161);
  return { value, formula: 'mifflin' };
}

/**
 * body_fat_percentage > band → numerik öncelikli, aksi halde bant ortası.
 */
function resolveBodyFatPercentage(m: UserMetrics): number | null {
  if (m.body_fat_percentage && m.body_fat_percentage > 3 && m.body_fat_percentage < 60) {
    return m.body_fat_percentage;
  }
  if (m.body_fat_band) {
    return getBodyFatPercentageFromBand(m.body_fat_band, m.gender);
  }
  return null;
}

/**
 * Combined PAL matrix (IOM 2005 ankerli).
 * Satır: mesleki aktivite, sütun: egzersiz sıklığı.
 */
export const PAL_MATRIX: Record<OccupationalActivity, Record<ExerciseFrequency, number>> = {
  desk: { none: 1.2, low: 1.35, moderate: 1.5, high: 1.65, athlete: 1.8 },
  light: { none: 1.3, low: 1.45, moderate: 1.6, high: 1.75, athlete: 1.9 },
  moderate: { none: 1.45, low: 1.55, moderate: 1.7, high: 1.85, athlete: 2.0 },
  heavy: { none: 1.6, low: 1.7, moderate: 1.8, high: 1.95, athlete: 2.1 },
};

export function resolvePAL(occ: OccupationalActivity, ex: ExerciseFrequency): number {
  return PAL_MATRIX[occ][ex];
}

/**
 * PAL seçimi: v2 girdileri varsa matristen, yoksa legacy tek-PAL fallback.
 */
export interface PALResult {
  multiplier: number;
  source: 'combined' | 'legacy';
}

export function resolvePALForMetrics(m: UserMetrics): PALResult {
  if (m.occupational_activity && m.exercise_frequency) {
    return {
      multiplier: resolvePAL(m.occupational_activity, m.exercise_frequency),
      source: 'combined',
    };
  }
  const legacy = m.activity_level ?? 'moderate';
  return { multiplier: ACTIVITY_LEVELS[legacy].multiplier, source: 'legacy' };
}

/**
 * TDEE = BMR × PAL
 */
export function calculateTDEE(m: UserMetrics): number {
  const { value: bmr } = calculateBMR(m);
  const { multiplier } = resolvePALForMetrics(m);
  return Math.round(bmr * multiplier);
}

/**
 * Hedefe göre günlük kalori hedefi.
 * Güvenlik zemini: Kadın 1200, Erkek 1500 kcal.
 */
export function calculateDailyCalorieGoal(m: UserMetrics, weeklyGoalKg?: number): number {
  const tdee = calculateTDEE(m);

  let offset: number;
  if (weeklyGoalKg !== undefined && weeklyGoalKg > 0) {
    // 1 kg yağ ≈ 7700 kcal → haftalık hedef / 7 = günlük açık/fazla
    const dynamicOffset = Math.round((weeklyGoalKg * 7700) / 7);
    offset = m.goal === 'gain' ? dynamicOffset : m.goal === 'lose' ? -dynamicOffset : 0;
  } else {
    offset = GOALS[m.goal].calorieOffset;
  }

  const target = tdee + offset;
  const minCalories = m.gender === 'male' ? 1500 : 1200;
  return Math.max(target, minCalories);
}

// =============================================================================
// AMDR (Acceptable Macronutrient Distribution Range) — WHO / TÜBER
// =============================================================================

export const AMDR = {
  protein: { min: 0.1, max: 0.35 },
  carbs: { min: 0.45, max: 0.65 },
  fat: { min: 0.2, max: 0.35 },
} as const;

export interface AMDRFlags {
  protein_over_amdr: boolean;
  carbs_under_amdr: boolean;
  fat_over_amdr: boolean;
}

export interface MacroGoals {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  amdr_flags: AMDRFlags;
}

/**
 * AMDR-aware makro çözücü.
 * Öncelik: protein g/kg (biyolojik zemin) → %30 yağ default → karb residual.
 * Karb AMDR min altına düşerse yağ kısılarak telafi edilir.
 */
export function calculateMacroGoals(m: UserMetrics, weeklyGoalKg?: number): MacroGoals {
  const calories = calculateDailyCalorieGoal(m, weeklyGoalKg);

  // Protein: 1.2–1.8 g/kg (hedefe göre)
  const proteinPerKg = m.goal === 'gain' ? 1.8 : m.goal === 'lose' ? 1.6 : 1.2;
  const protein_g = Math.round(m.weight_kg * proteinPerKg);
  const proteinCal = protein_g * 4;

  // Yağ default %30
  let fatPct = 0.3;
  let fat_g = Math.round((calories * fatPct) / 9);
  let carbsCal = calories - proteinCal - fat_g * 9;

  // Karb AMDR alt sınırı altına düştüyse yağ yüzdesini min'e çekerek telafi et
  if (carbsCal / calories < AMDR.carbs.min) {
    fatPct = Math.max(AMDR.fat.min, 1 - proteinCal / calories - AMDR.carbs.min);
    fat_g = Math.round((calories * fatPct) / 9);
    carbsCal = calories - proteinCal - fat_g * 9;
  }
  const carbs_g = Math.max(0, Math.round(carbsCal / 4));

  const amdr_flags: AMDRFlags = {
    protein_over_amdr: proteinCal / calories > AMDR.protein.max,
    carbs_under_amdr: carbsCal / calories < AMDR.carbs.min,
    fat_over_amdr: (fat_g * 9) / calories > AMDR.fat.max,
  };

  return { protein_g, carbs_g, fat_g, calories, amdr_flags };
}

// =============================================================================
// Güvenlik değerlendirme
// =============================================================================

export type SafetyBlocker = 'underweight_bmi' | 'scoff_positive';
export type SafetyWarning =
  | 'rate_too_aggressive'
  | 'chronic_disease'
  | 'pregnancy'
  | 'lactation'
  | 'protein_over_amdr'
  | 'calorie_floor_hit';

export interface SafetyAssessment {
  canProceed: boolean;
  blockers: SafetyBlocker[];
  warnings: SafetyWarning[];
}

export interface SafetyInput {
  bmi: number;
  scoff_score: number;
  medical_conditions: MedicalCondition[];
  weekly_goal_kg: number;
  weight_kg: number;
  amdr_flags?: AMDRFlags;
  calorie_floor_hit?: boolean;
}

/**
 * Güvenlik kararları:
 *  • BMI<18.5 → blocker (kilo verme önerisi sunma)
 *  • SCOFF ≥ 2 → blocker (yeme bozukluğu riski)
 *  • Haftalık hedef > %1 vücut ağırlığı → warning
 *  • Kronik hastalık / hamilelik / emzirme → warning
 *  • Protein AMDR üstü → warning
 */
export function evaluateSafety(input: SafetyInput): SafetyAssessment {
  const blockers: SafetyBlocker[] = [];
  const warnings: SafetyWarning[] = [];

  if (input.bmi < 18.5) blockers.push('underweight_bmi');
  if (input.scoff_score >= 2) blockers.push('scoff_positive');

  if (
    input.weekly_goal_kg > 0 &&
    input.weight_kg > 0 &&
    input.weekly_goal_kg / input.weight_kg > 0.01
  ) {
    warnings.push('rate_too_aggressive');
  }
  if (input.medical_conditions.includes('pregnancy')) warnings.push('pregnancy');
  if (input.medical_conditions.includes('lactation')) warnings.push('lactation');
  if (input.medical_conditions.some((c) => CHRONIC_DISEASES.includes(c))) {
    warnings.push('chronic_disease');
  }
  if (input.amdr_flags?.protein_over_amdr) warnings.push('protein_over_amdr');
  if (input.calorie_floor_hit) warnings.push('calorie_floor_hit');

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * SCOFF cevap haritasından skor hesapla (0–5).
 */
export function calculateScoffScore(answers: Record<string, boolean | undefined>): number {
  return Object.values(answers).filter((v) => v === true).length;
}

// =============================================================================
// Klasik yardımcılar
// =============================================================================

/**
 * İdeal vücut ağırlığı (Devine formülü)
 */
export function calculateIdealWeight(gender: 'male' | 'female', height_cm: number): number {
  const heightInches = (height_cm - 152.4) / 2.54;
  const base = gender === 'male' ? 50 : 45.5;
  return Math.round(base + 2.3 * heightInches);
}

/**
 * BMI
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
