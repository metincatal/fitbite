import { matchFood } from './foodMatcher';
import { COMPOSITION_BY_ID } from './foodComposition';
import type {
  CookingMethod,
  Texture,
  FoodCategory,
  CompositionEntry,
  EngineInput,
  EngineOutput,
  EngineSubResult,
  EngineFactors,
  EngineConfidence,
  BreakdownStep,
  DetectedFoodItem,
} from '../types/nutrition';

// --- Sabit tablolar ---

// Doku → görsel hacim → gerçek kütle düzeltmesi (taneler arası boşluk vs).
// Granüler için 0.75: pirinç tanelerinin arasındaki hava katı kütle değildir.
// Fluffy (kabarık ekmek/salata) için 0.5: hava ağırlığı düşürür.
const DENSITY_BY_TEXTURE: Record<Texture, number> = {
  fluffy: 0.5,
  dense: 1.0,
  granular: 0.75,
  liquid: 1.0,
  amorphous: 0.9,
};

// USDA Tablo 5 özet — pişirme sırasında kütle değişimi.
// Tahıllar haşlanırken su emer (×2.5-3.0), proteinler suyunu kaybeder (×0.7-0.9).
// Kompozisyon entry'si "raw" formundaysa: pişmiş gram → çiğ eşdeğeri için BÖLERİZ.
// "cooked" formdaysa yield 1.0 (zaten pişmiş değer kullanılıyor).
type YieldKey = `${CookingMethod}_${FoodCategory}` | CookingMethod;
const YIELD_TABLE: Partial<Record<YieldKey, number>> = {
  // boiled: tahıl şişer, protein suyunu kaybeder
  boiled_grain: 2.7,
  boiled_protein: 0.85,
  boiled_vegetable: 0.92,
  boiled: 1.0,
  // grilled
  grilled_protein: 0.78,
  grilled_vegetable: 0.85,
  grilled: 0.85,
  // fried (sığ)
  fried_protein: 0.85,
  fried_vegetable: 0.78,
  fried_grain: 0.95,
  fried: 0.85,
  // deep fried
  deep_fried_protein: 0.80,
  deep_fried_vegetable: 0.75,
  deep_fried_grain: 0.90,
  deep_fried: 0.80,
  // baked
  baked_protein: 0.85,
  baked_grain: 0.95,
  baked: 0.90,
  // steamed
  steamed_protein: 0.92,
  steamed_vegetable: 0.95,
  steamed: 0.95,
  // sauteed
  sauteed_protein: 0.85,
  sauteed_vegetable: 0.80,
  sauteed: 0.85,
  // raw / unknown
  raw: 1.0,
  unknown: 1.0,
};

function yieldFactor(method: CookingMethod, category: FoodCategory): number {
  const specific = YIELD_TABLE[`${method}_${category}` as YieldKey];
  if (typeof specific === 'number') return specific;
  const generic = YIELD_TABLE[method];
  return typeof generic === 'number' ? generic : 1.0;
}

// Pişirme yöntemine göre absorpsiyon katsayısı (kütleye eklenen gizli yağ).
const HIDDEN_FAT_BY_METHOD: Record<CookingMethod, number> = {
  raw: 0,
  boiled: 0,
  steamed: 0,
  grilled: 0.02,
  baked: 0.03,
  sauteed: 0.07,
  fried: 0.15,
  deep_fried: 0.20,
  unknown: 0.05,
};

// --- Saf yardımcılar ---

function defaultTextureFor(entry: CompositionEntry): Texture {
  return entry.defaultTexture;
}

function classifyConfidence(score: number): EngineConfidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// --- Tek bileşen hesabı ---

function computeSingle(
  name: string,
  grams: number,
  detection: DetectedFoodItem
): { result: EngineSubResult; entry: CompositionEntry | null; matchScore: number } {
  const cookingMethod: CookingMethod = detection.cookingMethod ?? 'unknown';
  const hiddenSauceProb = clamp01(detection.hiddenSauceProb ?? 0);

  const match = matchFood(name);

  if (match.entry) {
    const entry = match.entry;
    const texture = detection.texture ?? entry.defaultTexture;
    const density = DENSITY_BY_TEXTURE[texture];

    // Form 'raw' ise kullanıcı pişmiş gramı verdi → çiğ eşdeğerine çeviriyoruz.
    // Form 'cooked' ise zaten pişmiş değer, yield = 1.
    const rawYield = yieldFactor(cookingMethod, entry.category);
    const yieldDivisor = entry.form === 'raw' ? rawYield : 1;
    const effectiveGrams = (grams * density) / yieldDivisor;

    const baseHidden = HIDDEN_FAT_BY_METHOD[cookingMethod];
    const hiddenMultiplier = 1 + baseHidden + hiddenSauceProb * 0.10;

    const factor = effectiveGrams / 100; // per100g'i ölçeklemek için
    const kcal = entry.per100g.kcal * factor * hiddenMultiplier;
    const protein = entry.per100g.protein * factor;
    const carbs = entry.per100g.carbs * factor;
    // Yağ → gizli yağı sadece gerçek yağ değerine ekle (kcal multiplier dolaylı kapsadı, gram için ayrı)
    const hiddenFatGrams = hiddenMultiplier > 1 ? (kcal * 0) : 0; // eklenen yağ kcal'a yansıdı, gram tarafında ek değişiklik yok
    const fat = entry.per100g.fat * factor + (hiddenMultiplier - 1) * effectiveGrams * 0.1; // yaklaşık: %1 hidden = +0.1g yağ/g
    void hiddenFatGrams;

    const factors: EngineFactors = {
      density,
      yield: yieldDivisor === 1 ? 1 : 1 / yieldDivisor, // raporlama için "çarpan" formu
      hidden: hiddenMultiplier,
    };

    return {
      result: {
        name: entry.nameTr,
        grams,
        kcal: Math.round(kcal),
        protein: round1(protein),
        carbs: round1(carbs),
        fat: round1(fat),
        match: { entryId: entry.id, score: match.score, source: 'composition' },
        factors,
      },
      entry,
      matchScore: match.score,
    };
  }

  // Fallback: kompozisyon eşleşmedi → Gemini'nin verdiği eski mutlak değerleri kullan.
  // Bu değerler DetectedFoodItem v2'de OPSİYONEL; varsa estimateGrams oranıyla ölçekle.
  const detectedGrams = detection.estimatedGrams || grams;
  const ratio = detectedGrams > 0 ? grams / detectedGrams : 1;
  const fbKcal = (detection.calories ?? 0) * ratio;
  const fbProtein = (detection.protein ?? 0) * ratio;
  const fbCarbs = (detection.carbs ?? 0) * ratio;
  const fbFat = (detection.fat ?? 0) * ratio;

  return {
    result: {
      name,
      grams,
      kcal: Math.round(fbKcal),
      protein: round1(fbProtein),
      carbs: round1(fbCarbs),
      fat: round1(fbFat),
      match: { entryId: null, score: match.score, source: 'gemini_fallback' },
      factors: { density: 1, yield: 1, hidden: 1 },
    },
    entry: null,
    matchScore: match.score,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// --- Public: ana hesap ---

export function compute(input: EngineInput): EngineOutput {
  const { detection, userGrams } = input;
  const breakdown: BreakdownStep[] = [];

  // Karışık tabak: bileşen oranlarına göre alt hesaplar.
  if (detection.ingredientBreakdown && detection.ingredientBreakdown.length > 0) {
    const subs: EngineSubResult[] = [];
    let totalKcal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    let weightedScore = 0;
    let primaryEntryId: string | null = null;

    for (const ing of detection.ingredientBreakdown) {
      const ingGrams = userGrams * clamp01(ing.ratio);
      const { result, matchScore, entry } = computeSingle(ing.name, ingGrams, detection);
      subs.push(result);
      totalKcal += result.kcal;
      totalProtein += result.protein;
      totalCarbs += result.carbs;
      totalFat += result.fat;
      weightedScore += matchScore * ing.ratio;
      if (!primaryEntryId && entry) primaryEntryId = entry.id;

      breakdown.push({
        label: ing.name,
        detail: `${result.grams.toFixed(0)}g · ${result.kcal} kcal`,
        value:
          result.match.source === 'composition'
            ? `eşleşme %${Math.round(result.match.score * 100)}`
            : 'Gemini tahmini',
      });
    }

    const tanimaConf = clamp01(detection.confidence);
    const occlusionPenalty = 1 - clamp01(detection.occlusionRatio ?? 0);
    const overallConfScore = Math.min(tanimaConf, weightedScore, occlusionPenalty);

    return {
      kcal: Math.round(totalKcal),
      protein: round1(totalProtein),
      carbs: round1(totalCarbs),
      fat: round1(totalFat),
      match: {
        entryId: primaryEntryId,
        score: weightedScore,
        source: weightedScore > 0 ? 'composition' : 'gemini_fallback',
      },
      factors: { density: 1, yield: 1, hidden: 1 }, // alt-hesap içinde
      confidence: classifyConfidence(overallConfScore),
      confidenceScore: round1(overallConfScore),
      breakdown,
      subResults: subs,
    };
  }

  // Tek bileşen hesabı.
  const { result, matchScore, entry } = computeSingle(detection.name, userGrams, detection);

  // Breakdown adımları
  if (entry) {
    breakdown.push({
      label: 'Eşleşme',
      detail: `${entry.nameTr} (${entry.source})`,
      value: `%${Math.round(matchScore * 100)} güven`,
    });
    breakdown.push({
      label: 'Çiğ değer',
      detail: `${entry.per100g.kcal} kcal/100g`,
    });
    breakdown.push({
      label: 'Kullanıcı gramı',
      detail: `${userGrams.toFixed(0)}g (${detection.cookingMethod ?? 'pişirme bilinmiyor'})`,
    });
    if (entry.form === 'raw' && (detection.cookingMethod ?? 'unknown') !== 'raw') {
      breakdown.push({
        label: 'Pişirme verim faktörü',
        detail: `${result.factors.yield.toFixed(2)}× (çiğ eşdeğerine çevrildi)`,
      });
    }
    breakdown.push({
      label: `Doku: ${detection.texture ?? entry.defaultTexture}`,
      detail: `yoğunluk × ${result.factors.density.toFixed(2)}`,
    });
    if (result.factors.hidden > 1) {
      breakdown.push({
        label: 'Gizli yağ tahmini',
        detail: `× ${result.factors.hidden.toFixed(2)} (+%${Math.round(
          (result.factors.hidden - 1) * 100
        )})`,
      });
    }
    breakdown.push({
      label: 'Final',
      detail: `${result.kcal} kcal · P ${result.protein}g · K ${result.carbs}g · Y ${result.fat}g`,
    });
  } else {
    breakdown.push({
      label: 'Eşleşme bulunamadı',
      detail: 'Kompozisyon tablosunda yok; Gemini tahminine düştü',
      value: 'düşük güven',
    });
    breakdown.push({
      label: 'Final',
      detail: `${result.kcal} kcal · P ${result.protein}g · K ${result.carbs}g · Y ${result.fat}g`,
    });
  }

  const tanimaConf = clamp01(detection.confidence);
  const occlusionPenalty = 1 - clamp01(detection.occlusionRatio ?? 0);
  const overallConfScore = Math.min(tanimaConf, matchScore, occlusionPenalty);

  return {
    kcal: result.kcal,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
    match: result.match,
    factors: result.factors,
    confidence: classifyConfidence(overallConfScore),
    confidenceScore: round1(overallConfScore),
    breakdown,
  };
}

// --- Yardımcı: birden çok DetectedFoodItem'ı toplu hesaba çevir ---
export function computeMany(
  items: { detection: DetectedFoodItem; userGrams: number }[]
): EngineOutput[] {
  return items.map(compute);
}

// Manuel ekleme/düzenleme için: kullanıcı yiyecek adı + gram girer, motor önce
// kompozisyon eşleştirmesi dener. Eşleşme bulamazsa null döner — çağıran taraf
// Gemini fallback'e (estimateNutritionFromText) gidebilir.
export function estimateForManualInput(
  name: string,
  grams: number,
  cookingMethod: CookingMethod = 'unknown'
): EngineOutput | null {
  const trimmed = name.trim();
  if (!trimmed || grams <= 0) return null;
  const synthetic: DetectedFoodItem = {
    name: trimmed,
    estimatedGrams: grams,
    cookingMethod,
    texture: 'dense',
    hiddenSauceProb: 0,
    referenceObject: 'none',
    occlusionRatio: 0,
    confidence: 1,
  };
  const out = compute({ detection: synthetic, userGrams: grams });
  return out.match.source === 'composition' ? out : null;
}

// Test/debug için sabit tabloları dışa aç
export const __engineTables = {
  DENSITY_BY_TEXTURE,
  HIDDEN_FAT_BY_METHOD,
  yieldFactor,
};
