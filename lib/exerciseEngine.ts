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

// ── Step-based walking metrics ────────────────────────────────────────────────

export interface StepMetrics {
  kcalNet: number;
  waterBonusMl: number;
  intensityDistribution: { low: number; moderate: number; high: number };
  durationMinutes: number;
}

// Walking MET values (Ainsworth 2011, codes 17151–17240)
const WALK_MET = { low: 2.5, moderate: 3.5, high: 5.0 } as const;

/**
 * Estimates net calories and water needs from daily step count.
 * Intensity distribution inferred from Tudor-Locke (2011) cadence norms.
 * Walking cadence assumed 90 spm average → duration = steps / 90.
 * Water bonus: ACSM 2007, 150 ml per 30 min of walking (conservative vs. running).
 */
export function computeStepMetrics(
  steps: number,
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
): StepMetrics | null {
  if (steps < 500) return null;

  const durationMinutes = steps / 90;

  // Intensity distribution keyed by total daily steps
  let lowFrac: number, modFrac: number, highFrac: number;
  if (steps < 3000) {
    lowFrac = 0.85; modFrac = 0.15; highFrac = 0.00;
  } else if (steps < 6000) {
    lowFrac = 0.60; modFrac = 0.35; highFrac = 0.05;
  } else if (steps < 10000) {
    lowFrac = 0.35; modFrac = 0.50; highFrac = 0.15;
  } else if (steps < 15000) {
    lowFrac = 0.20; modFrac = 0.50; highFrac = 0.30;
  } else {
    lowFrac = 0.15; modFrac = 0.45; highFrac = 0.40;
  }

  const rmr = computeRMR(weightKg, heightCm, age, sex);

  let kcalNet = 0;
  (['low', 'moderate', 'high'] as const).forEach((intensity) => {
    const frac = intensity === 'low' ? lowFrac : intensity === 'moderate' ? modFrac : highFrac;
    if (frac === 0) return;
    const correctedMet = computeCorrectedMet(WALK_MET[intensity], rmr, weightKg);
    const netMet = Math.max(0, correctedMet - 1);
    kcalNet += netMet * weightKg * ((durationMinutes * frac) / 60);
  });

  // Water: 150 ml per 30 min of walking, capped at 450 ml
  const waterBonusMl = Math.min(450, 150 * Math.floor(durationMinutes / 30));

  return {
    kcalNet: Math.round(kcalNet),
    waterBonusMl,
    intensityDistribution: {
      low: Math.round(lowFrac * 100),
      moderate: Math.round(modFrac * 100),
      high: Math.round(highFrac * 100),
    },
    durationMinutes: Math.round(durationMinutes),
  };
}
