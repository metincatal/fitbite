// Bilimsel besin motoru için çalışır demo / smoke test.
// Birim test çerçevesi yok; bunun yerine konsol çıktısı ile manuel doğrulama.
//
// Çalıştır:  npx tsx lib/__demo/engineDemo.ts
//
// Beklenen davranışlar (her senaryo için yorumda):
//  - Kompozisyon eşleşen yemek → 'composition' kaynağı, high/medium güven.
//  - Egzotik yemek (eşleşme yok) → 'gemini_fallback', düşük güven.
//  - Pişirme yöntemi değişince kalori değişir (yield + hidden fat).

import { compute, estimateForManualInput } from '../nutritionEngine';
import type { DetectedFoodItem } from '../../types/nutrition';

interface Scenario {
  title: string;
  detection: DetectedFoodItem;
  userGrams: number;
  note?: string;
}

const scenarios: Scenario[] = [
  {
    title: 'Izgara tavuk göğsü 150g',
    detection: {
      name: 'Izgara tavuk göğsü',
      estimatedGrams: 150,
      cookingMethod: 'grilled',
      texture: 'dense',
      hiddenSauceProb: 0.1,
      referenceObject: 'fork',
      occlusionRatio: 0.05,
      confidence: 0.82,
    },
    userGrams: 150,
    note: 'Beklenti: ~280-340 kcal, high güven, composition source.',
  },
  {
    title: 'Haşlanmış pirinç pilavı 200g',
    detection: {
      name: 'Pirinç pilavı',
      estimatedGrams: 200,
      cookingMethod: 'boiled',
      texture: 'granular',
      hiddenSauceProb: 0.3,
      referenceObject: 'fork',
      occlusionRatio: 0.1,
      confidence: 0.75,
    },
    userGrams: 200,
    note: 'Beklenti: yield ÷2.7 (haşlama tahıl), granüler 0.75, hidden ~+8% → ~200 kcal.',
  },
  {
    title: 'Kızarmış patates 120g (deep_fried)',
    detection: {
      name: 'Patates kızartması',
      estimatedGrams: 120,
      cookingMethod: 'deep_fried',
      texture: 'dense',
      hiddenSauceProb: 0,
      referenceObject: 'none',
      occlusionRatio: 0,
      confidence: 0.7,
    },
    userGrams: 120,
    note: 'Beklenti: hidden +20% → daha yüksek kcal vs aynı patates haşlama.',
  },
  {
    title: 'Aynı patates ama haşlanmış 120g',
    detection: {
      name: 'Patates',
      estimatedGrams: 120,
      cookingMethod: 'boiled',
      texture: 'dense',
      hiddenSauceProb: 0,
      referenceObject: 'none',
      occlusionRatio: 0,
      confidence: 0.85,
    },
    userGrams: 120,
    note: 'Karşılaştırma: kızartmaya göre belirgin daha düşük kcal olmalı.',
  },
  {
    title: 'Mevsim salatası 80g (ingredientBreakdown ile)',
    detection: {
      name: 'Mevsim salatası',
      estimatedGrams: 80,
      cookingMethod: 'raw',
      texture: 'fluffy',
      hiddenSauceProb: 0.4,
      referenceObject: 'fork',
      occlusionRatio: 0.2,
      confidence: 0.65,
      ingredientBreakdown: [
        { name: 'Marul', ratio: 0.5 },
        { name: 'Domates', ratio: 0.3 },
        { name: 'Salatalık', ratio: 0.2 },
      ],
    },
    userGrams: 80,
    note: 'Beklenti: subResults[3], her bileşen composition matched.',
  },
  {
    title: 'Mercimek çorbası 250g',
    detection: {
      name: 'Mercimek çorbası',
      estimatedGrams: 250,
      cookingMethod: 'boiled',
      texture: 'liquid',
      hiddenSauceProb: 0.1,
      referenceObject: 'spoon',
      occlusionRatio: 0,
      confidence: 0.8,
    },
    userGrams: 250,
    note: 'Form=cooked, yield uygulanmaz. Beklenti: ~150 kcal, high güven.',
  },
  {
    title: 'Egzotik: Ekşili köfte 180g (eşleşme yok)',
    detection: {
      name: 'Ekşili köfte tabağı',
      estimatedGrams: 180,
      cookingMethod: 'boiled',
      texture: 'dense',
      hiddenSauceProb: 0.5,
      referenceObject: 'none',
      occlusionRatio: 0.1,
      confidence: 0.5,
      // Gemini'den gelen fallback değerler (kompozisyon eşleşmediği için kullanılır)
      calories: 280,
      protein: 18,
      carbs: 8,
      fat: 18,
    },
    userGrams: 180,
    note: 'Beklenti: source=gemini_fallback, low/medium güven, fallback değerler ölçeklenir.',
  },
  {
    title: 'Yulaf ezmesi 60g (granüler)',
    detection: {
      name: 'Yulaf',
      estimatedGrams: 60,
      cookingMethod: 'raw',
      texture: 'granular',
      hiddenSauceProb: 0,
      referenceObject: 'spoon',
      occlusionRatio: 0,
      confidence: 0.9,
    },
    userGrams: 60,
    note: 'Granüler 0.75, raw → yield 1.0. Beklenti: ~170 kcal.',
  },
];

function fmt(n: number) {
  return n.toFixed(1);
}

function runScenarios() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('FitBite Bilimsel Besin Motoru — Demo Çıktısı');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const s of scenarios) {
    const out = compute({ detection: s.detection, userGrams: s.userGrams });
    console.log(`▸ ${s.title}`);
    if (s.note) console.log(`   not: ${s.note}`);
    console.log(
      `   sonuç: ${out.kcal} kcal · P ${fmt(out.protein)}g · K ${fmt(out.carbs)}g · Y ${fmt(out.fat)}g`
    );
    console.log(
      `   güven: ${out.confidence} (%${Math.round(out.confidenceScore * 100)}) · kaynak: ${out.match.source}` +
        (out.match.entryId ? ` (${out.match.entryId})` : '')
    );
    console.log(
      `   çarpanlar: density=${fmt(out.factors.density)} · yield=${fmt(out.factors.yield)} · hidden=${fmt(out.factors.hidden)}`
    );
    if (out.subResults) {
      out.subResults.forEach((sr) => {
        console.log(
          `      └─ ${sr.name}: ${sr.kcal} kcal (${sr.match.source}${sr.match.entryId ? `, ${sr.match.entryId}` : ''})`
        );
      });
    }
    console.log('');
  }

  // Manuel akış: ad + gram girip motor sonucu alma
  console.log('─── Manuel akış (estimateForManualInput) ───');
  const manualCases: [string, number, string][] = [
    ['tavuk göğsü', 100, 'unknown'],
    ['Beyaz ekmek', 50, 'unknown'],
    ['Var olmayan zırzop', 200, 'unknown'],
  ];
  for (const [name, grams] of manualCases) {
    const r = estimateForManualInput(name, grams);
    if (r) {
      console.log(`✓ ${name} ${grams}g → ${r.kcal} kcal (composition: ${r.match.entryId})`);
    } else {
      console.log(`✗ ${name} ${grams}g → eşleşme yok, Gemini fallback gerekecek`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Demo bitti. Sayıların çevrilmesi: kompozisyon × user_grams × density');
  console.log('× yield × (1 + hidden). Her adım out.breakdown[] içinde okunabilir.');
  console.log('═══════════════════════════════════════════════════════════════');
}

runScenarios();
