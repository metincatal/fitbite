import { EXERCISE_CATALOG, ExerciseCatalogEntry, ExerciseGroup } from './constants';

export interface ExerciseInput {
  categoryId: string;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
}

export interface ExerciseOutput {
  kcalNet: number;
  epocRange: [number, number];
  totalKcalRange: [number, number];
  waterBonusML: number;
  electrolytesWarning: boolean;
  correctedMet: number;
  standardMet: number;
  metStage: string;
  sourceNote: string;
  chronoWarning: boolean;
  rmr: number;
}

// EPOC multiplier ranges keyed by [group][intensity]
const EPOC_TABLE: Record<ExerciseGroup, Record<'low' | 'moderate' | 'high', [number, number]>> = {
  cardio:    { low: [0.03, 0.05], moderate: [0.06, 0.10], high: [0.11, 0.15] },
  strength:  { low: [0.05, 0.08], moderate: [0.08, 0.12], high: [0.15, 0.20] },
  sport:     { low: [0.04, 0.06], moderate: [0.07, 0.10], high: [0.12, 0.16] },
  mindBody:  { low: [0.02, 0.03], moderate: [0.03, 0.05], high: [0.05, 0.07] },
  outdoor:   { low: [0.04, 0.06], moderate: [0.07, 0.11], high: [0.12, 0.16] },
  other:     { low: [0.04, 0.07], moderate: [0.08, 0.14], high: [0.15, 0.22] },
};

// Gender-specific intensity stage labels (OT Dude 2024 MET stages)
const MET_STAGE_LABEL: Record<'male' | 'female', Record<'low' | 'moderate' | 'high', string>> = {
  male:   { low: 'Stage I–III (Hafif, 1.6–3.9 MET)', moderate: 'Stage IV–V (Orta, 4.0–5.9 MET)', high: 'Stage VI+ (Ağır, ≥6.0 MET)' },
  female: { low: 'Stage I–III (Hafif, 1.2–2.7 MET)', moderate: 'Stage IV–V (Orta, 2.8–4.3 MET)', high: 'Stage VI+ (Ağır, ≥4.4 MET)' },
};

export function computeRMR(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  // Harris-Benedict (Byrne method) — kcal/day
  if (sex === 'male') {
    return 66.4730 + 13.7516 * weightKg + 5.0033 * heightCm - 6.7550 * age;
  }
  return 655.0955 + 9.5634 * weightKg + 1.8496 * heightCm - 4.6756 * age;
}

function rmrToMlPerKgMin(rmrKcal: number, weightKg: number): number {
  // Convert kcal/day to mL O2·kg⁻¹·min⁻¹
  return (rmrKcal / 1440) / (5 * weightKg) * 1000;
}

export function computeCorrectedMet(standardMet: number, rmrKcal: number, weightKg: number): number {
  const rmrMl = rmrToMlPerKgMin(rmrKcal, weightKg);
  return standardMet * (rmrMl / 3.5);
}

export function computeEpocRange(
  kcalNet: number,
  group: ExerciseGroup,
  intensity: 'low' | 'moderate' | 'high',
): [number, number] {
  const [lo, hi] = EPOC_TABLE[group][intensity];
  return [Math.round(kcalNet * lo), Math.round(kcalNet * hi)];
}

export function computeWaterBonus(
  durationMinutes: number,
  intensity: 'low' | 'moderate' | 'high',
): { ml: number; electrolytesWarning: boolean } {
  // ACSM 2007: base 250ml + 150ml per additional 30min + 250ml intensity bonus for high
  const extraBlocks = Math.floor(Math.max(0, durationMinutes - 30) / 30);
  const intensityBonus = intensity === 'high' ? 250 : 0;
  const ml = 250 + extraBlocks * 150 + intensityBonus;
  // Electrolytes warning if estimated sweat loss > 1kg (60+ min high intensity)
  const electrolytesWarning = durationMinutes >= 60 && intensity === 'high';
  return { ml, electrolytesWarning };
}

export function isChronoWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 20;
}

export function compute(input: ExerciseInput): ExerciseOutput {
  const entry: ExerciseCatalogEntry | undefined = EXERCISE_CATALOG.find((e) => e.id === input.categoryId);
  const standardMet = entry?.met[input.intensity] ?? 5.0;
  const group: ExerciseGroup = entry?.group ?? 'other';

  const rmr = computeRMR(input.weightKg, input.heightCm, input.age, input.sex);
  const correctedMet = computeCorrectedMet(standardMet, rmr, input.weightKg);

  // Net MET = correctedMet - 1 (subtract resting to avoid double-counting with TDEE)
  const netMet = Math.max(0, correctedMet - 1);
  const kcalNet = Math.round(netMet * input.weightKg * (input.durationMinutes / 60));

  const epocRange = computeEpocRange(kcalNet, group, input.intensity);
  const totalKcalRange: [number, number] = [kcalNet + epocRange[0], kcalNet + epocRange[1]];

  const { ml: waterBonusML, electrolytesWarning } = computeWaterBonus(input.durationMinutes, input.intensity);

  const metStage = MET_STAGE_LABEL[input.sex][input.intensity];
  const sourceNote = entry?.ainsworthCode
    ? `Ainsworth Kompendiyumu (2011) — Kod ${entry.ainsworthCode}`
    : 'Ainsworth Kompendiyumu (2011)';

  return {
    kcalNet,
    epocRange,
    totalKcalRange,
    waterBonusML,
    electrolytesWarning,
    correctedMet: Math.round(correctedMet * 100) / 100,
    standardMet,
    metStage,
    sourceNote,
    chronoWarning: isChronoWindow(),
    rmr: Math.round(rmr),
  };
}
