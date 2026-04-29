import { FOOD_COMPOSITION } from './foodComposition';
import type { CompositionEntry, MatchResult } from '../types/nutrition';

// Türkçe karakter normalizasyonu + küçük harf + noktalama temizliği.
function normalize(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  've', 'ile', 'icin', 'bir', 'cigi', 'cig', 'pismis', 'haslanmis',
  'kizarmis', 'izgara', 'tabak', 'tabagi', 'porsiyon', 'parca',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(' ')
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Verilen yemek adını kompozisyon tablosuyla eşleştirir.
// Skor < threshold ise entry null döner; çağıran Gemini fallback'e geçer.
export function matchFood(query: string, threshold = 0.85): MatchResult {
  const queryNorm = normalize(query);
  if (!queryNorm) return { entry: null, score: 0 };

  const queryTokens = tokenize(query);
  let best: { entry: CompositionEntry; score: number } | null = null;

  for (const entry of FOOD_COMPOSITION) {
    // 1) Tam ad eşleşmesi
    if (normalize(entry.nameTr) === queryNorm) {
      return { entry, score: 1.0 };
    }
    // 2) Sinonim eşleşmesi
    for (const syn of entry.synonyms) {
      const synNorm = normalize(syn);
      if (synNorm === queryNorm) {
        if (!best || best.score < 0.97) best = { entry, score: 0.97 };
      }
    }
    // 3) Substring (sorgu sinonimi/adı içeriyor mu)
    const candidates = [normalize(entry.nameTr), ...entry.synonyms.map(normalize)];
    for (const cand of candidates) {
      if (cand && (queryNorm.includes(cand) || cand.includes(queryNorm))) {
        const lengthRatio =
          Math.min(queryNorm.length, cand.length) /
          Math.max(queryNorm.length, cand.length);
        const score = 0.85 + lengthRatio * 0.1; // 0.85..0.95
        if (!best || best.score < score) best = { entry, score };
      }
    }
    // 4) Token Jaccard
    for (const cand of candidates) {
      const candTokens = tokenize(cand);
      const score = jaccard(queryTokens, candTokens);
      if (score > 0 && (!best || best.score < score)) {
        best = { entry, score };
      }
    }
  }

  if (!best || best.score < threshold) return { entry: null, score: best?.score ?? 0 };
  return { entry: best.entry, score: best.score };
}
