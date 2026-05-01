import type {
  EngineInput,
  EngineOutput,
  EngineSubResult,
  EngineConfidence,
  DetectedFoodItem,
  CookingMethod,
} from '../types/nutrition';

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function classifyConfidence(score: number): EngineConfidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

// --- Public: ana hesap ---
// Gemini birincil ve tek kalori kaynağı; compute() yalnızca porsiyon oranıyla ölçekler.

export function compute(input: EngineInput): EngineOutput {
  const { detection, userGrams } = input;
  const baseGrams = detection.estimatedGrams > 0 ? detection.estimatedGrams : userGrams;
  const ratio = baseGrams > 0 ? userGrams / baseGrams : 1;
  const confScore = round1(clamp01(detection.confidence));

  // Karışık tabak: Gemini'nin bileşen bazlı grams/calories değerlerini kullan.
  if (detection.ingredientBreakdown && detection.ingredientBreakdown.length > 0) {
    const subs: EngineSubResult[] = [];
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const ing of detection.ingredientBreakdown) {
      let ingKcal: number;
      let ingGrams: number;

      if (ing.grams !== undefined && ing.calories !== undefined) {
        // Yeni şema: Gemini bileşen gramı ve kalorisini direkt verdi
        ingGrams = ing.grams * ratio;
        ingKcal = ing.calories * ratio;
      } else {
        // Eski şema: ratio × toplam değerler
        const r = clamp01(ing.ratio ?? 0);
        ingGrams = userGrams * r;
        ingKcal = (detection.calories ?? 0) * r;
      }

      const ingRatio = baseGrams > 0 ? (ing.grams ?? 0) / baseGrams : (ing.ratio ?? 0);
      const sub: EngineSubResult = {
        name: ing.name,
        grams: Math.round(ingGrams),
        kcal: Math.round(ingKcal),
        protein: round1((detection.protein ?? 0) * clamp01(ingRatio) * ratio),
        carbs: round1((detection.carbs ?? 0) * clamp01(ingRatio) * ratio),
        fat: round1((detection.fat ?? 0) * clamp01(ingRatio) * ratio),
        match: { entryId: null, score: confScore, source: 'gemini' },
        factors: { density: 1, yield: 1, hidden: 1 },
      };
      subs.push(sub);
      totalKcal += ingKcal;
      totalProtein += sub.protein;
      totalCarbs += sub.carbs;
      totalFat += sub.fat;
    }

    return {
      kcal: Math.round(totalKcal),
      protein: round1(totalProtein),
      carbs: round1(totalCarbs),
      fat: round1(totalFat),
      match: { entryId: null, score: confScore, source: 'gemini' },
      factors: { density: 1, yield: 1, hidden: 1 },
      confidence: classifyConfidence(confScore),
      confidenceScore: confScore,
      breakdown: [],
      subResults: subs,
    };
  }

  // Tekil yemek: Gemini değerlerini porsiyon oranıyla ölçekle.
  return {
    kcal: Math.round((detection.calories ?? 0) * ratio),
    protein: round1((detection.protein ?? 0) * ratio),
    carbs: round1((detection.carbs ?? 0) * ratio),
    fat: round1((detection.fat ?? 0) * ratio),
    match: { entryId: null, score: confScore, source: 'gemini' },
    factors: { density: 1, yield: 1, hidden: 1 },
    confidence: classifyConfidence(confScore),
    confidenceScore: confScore,
    breakdown: [],
  };
}

export function computeMany(
  items: { detection: DetectedFoodItem; userGrams: number }[]
): EngineOutput[] {
  return items.map(compute);
}

// Manuel ekleme için: composition kaldırıldı, çağıran Gemini'ye (estimateNutritionFromText) düşsün.
export function estimateForManualInput(
  _name: string,
  _grams: number,
  _cookingMethod: CookingMethod = 'unknown'
): EngineOutput | null {
  return null;
}
