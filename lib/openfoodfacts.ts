export interface BarcodeFoodResult {
  name: string;
  brand: string;
  calories: number;   // 100g başına
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeFoodResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: { 'User-Agent': 'FitBite/1.0' },
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const n = p.nutriments ?? {};

    // Kaloriyi kcal olarak al (API bazen kJ cinsinden verebilir)
    const caloriesPer100 =
      n['energy-kcal_100g'] ??
      n['energy-kcal'] ??
      (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0);

    const calories = Math.round(caloriesPer100 ?? 0);
    const protein = Math.round((n.proteins_100g ?? 0) * 10) / 10;
    const carbs = Math.round((n.carbohydrates_100g ?? 0) * 10) / 10;
    const fat = Math.round((n.fat_100g ?? 0) * 10) / 10;
    const fiber = Math.round((n.fiber_100g ?? 0) * 10) / 10;

    const name =
      p.product_name_tr ||
      p.product_name_en ||
      p.product_name ||
      'Bilinmeyen Ürün';

    const brand =
      typeof p.brands === 'string'
        ? p.brands.split(',')[0].trim()
        : '';

    return { name, brand, calories, protein, carbs, fat, fiber };
  } catch {
    return null;
  }
}
