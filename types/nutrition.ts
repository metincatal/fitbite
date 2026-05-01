// Bilimsel besin analiz motorunun ortak tipleri.
// Gemini sadece tanıma + fiziksel metadata üretir; kalori/makro hesabı
// nutritionEngine.ts içinde deterministik olarak yapılır.

export type CookingMethod =
  | 'raw'
  | 'boiled'
  | 'grilled'
  | 'fried'
  | 'deep_fried'
  | 'baked'
  | 'steamed'
  | 'sauteed'
  | 'unknown';

export type Texture =
  | 'fluffy'
  | 'dense'
  | 'granular'
  | 'liquid'
  | 'amorphous';

export type ReferenceObject =
  | 'spoon'
  | 'fork'
  | 'plate'
  | 'card'
  | 'hand'
  | 'none';

export type FoodCategory =
  | 'grain'
  | 'protein'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'fat'
  | 'beverage'
  | 'sweet'
  | 'mixed'
  | 'other';

export interface IngredientRatio {
  name: string;
  ratio?: number;    // 0..1, eski şema (toplam = 1.0)
  grams?: number;    // yeni şema: Gemini'den gelen gram
  calories?: number; // yeni şema: Gemini'den gelen kcal
}

// Gemini'nin döndürdüğü tanıma çıktısı.
// calories/protein/carbs/fat artık birincil kaynak — Gemini her zaman döndürür.
export interface DetectedFoodItem {
  name: string;
  estimatedGrams: number;
  cookingMethod?: CookingMethod;
  texture?: Texture;
  hiddenSauceProb?: number; // 0..1
  referenceObject?: ReferenceObject;
  occlusionRatio?: number; // 0..1
  confidence: number; // 0..1, tanıma güveni
  ingredientBreakdown?: IngredientRatio[];

  // Geriye uyumluluk: eski şema alanları
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface CompositionPer100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export type CompositionForm = 'raw' | 'cooked';

export interface CompositionEntry {
  id: string;
  nameTr: string;
  synonyms: string[];
  category: FoodCategory;
  form: CompositionForm; // raw ise yield uygulanır, cooked ise atlanır
  per100g: CompositionPer100g;
  defaultTexture: Texture;
  source: 'turkomp' | 'usda' | 'mixed';
}

export interface MatchResult {
  entry: CompositionEntry | null;
  score: number; // 0..1
}

export interface EngineFactors {
  density: number;
  yield: number;
  hidden: number;
}

export interface BreakdownStep {
  label: string;
  detail: string;
  value?: string;
}

export type EngineConfidence = 'high' | 'medium' | 'low';

export interface EngineSubResult {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  match: { entryId: string | null; score: number; source: 'composition' | 'gemini_fallback' | 'gemini' };
  factors: EngineFactors;
}

export interface EngineOutput {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  match: { entryId: string | null; score: number; source: 'composition' | 'gemini_fallback' | 'gemini' };
  factors: EngineFactors;
  confidence: EngineConfidence;
  confidenceScore: number;
  breakdown: BreakdownStep[];
  subResults?: EngineSubResult[]; // ingredientBreakdown varsa bileşenler
}

export interface EngineInput {
  detection: DetectedFoodItem;
  userGrams: number;
}
