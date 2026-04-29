/**
 * Egzersiz Motoru Smoke Test — 5 senaryo
 * Çalıştır: npx tsx lib/__demo/exerciseDemo.ts
 */
import { compute, computeRMR } from '../exerciseEngine';

const SEP = '─'.repeat(60);

interface Scenario {
  label: string;
  input: Parameters<typeof compute>[0];
  checks: {
    desc: string;
    pass: (out: ReturnType<typeof compute>) => boolean;
  }[];
}

const scenarios: Scenario[] = [
  {
    label: '70kg Erkek · Koşu 30dk Orta',
    input: { categoryId: 'running', durationMinutes: 30, intensity: 'moderate', weightKg: 70, heightCm: 178, age: 32, sex: 'male' },
    checks: [
      { desc: 'kcalNet > 0', pass: (o) => o.kcalNet > 0 },
      { desc: 'correctedMet farklı standardMet', pass: (o) => o.correctedMet !== o.standardMet },
      { desc: 'epocRange[0] < epocRange[1]', pass: (o) => o.epocRange[0] < o.epocRange[1] },
      { desc: 'waterBonusML = 250 (30dk, orta)', pass: (o) => o.waterBonusML === 250 },
      { desc: 'electrolytesWarning = false', pass: (o) => !o.electrolytesWarning },
    ],
  },
  {
    label: '60kg Kadın · HIIT 20dk Yoğun',
    input: { categoryId: 'hiit', durationMinutes: 20, intensity: 'high', weightKg: 60, heightCm: 162, age: 27, sex: 'female' },
    checks: [
      { desc: 'kcalNet > 0', pass: (o) => o.kcalNet > 0 },
      { desc: 'EPOC oranı %15-20 aralığında', pass: (o) => {
        const lo = o.epocRange[0] / o.kcalNet;
        const hi = o.epocRange[1] / o.kcalNet;
        return lo >= 0.14 && hi <= 0.25;
      }},
      { desc: 'electrolytesWarning = false (20dk)', pass: (o) => !o.electrolytesWarning },
    ],
  },
  {
    label: '55kg Kadın · Yoga 60dk Hafif',
    input: { categoryId: 'yoga', durationMinutes: 60, intensity: 'low', weightKg: 55, heightCm: 158, age: 35, sex: 'female' },
    checks: [
      { desc: 'kcalNet > 0', pass: (o) => o.kcalNet > 0 },
      { desc: 'EPOC küçük (mindBody low)', pass: (o) => o.epocRange[1] / o.kcalNet <= 0.05 },
      { desc: 'waterBonusML = 400 (60dk, hafif)', pass: (o) => o.waterBonusML === 400 },
      { desc: 'chronoWarning = false (varsayılan)', pass: (o) => typeof o.chronoWarning === 'boolean' },
    ],
  },
  {
    label: '80kg Erkek · Kettlebell 45dk Ağır',
    input: { categoryId: 'kettlebell', durationMinutes: 45, intensity: 'high', weightKg: 80, heightCm: 182, age: 28, sex: 'male' },
    checks: [
      { desc: 'kcalNet > 0', pass: (o) => o.kcalNet > 0 },
      { desc: 'electrolytesWarning = false (45dk)', pass: (o) => !o.electrolytesWarning },
      { desc: 'EPOC aralığı geniş (strength high)', pass: (o) => (o.epocRange[1] - o.epocRange[0]) >= 5 },
      { desc: 'sourceNote Ainsworth içeriyor', pass: (o) => o.sourceNote.includes('Ainsworth') },
    ],
  },
  {
    label: '70kg Erkek · Koşu 90dk Yoğun (elektrolit uyarısı)',
    input: { categoryId: 'running', durationMinutes: 90, intensity: 'high', weightKg: 70, heightCm: 178, age: 32, sex: 'male' },
    checks: [
      { desc: 'electrolytesWarning = true (90dk yoğun)', pass: (o) => o.electrolytesWarning },
      { desc: 'waterBonusML ≥ 750', pass: (o) => o.waterBonusML >= 750 },
      { desc: 'totalKcalRange[0] < totalKcalRange[1]', pass: (o) => o.totalKcalRange[0] < o.totalKcalRange[1] },
    ],
  },
];

let passed = 0;
let failed = 0;

for (const sc of scenarios) {
  console.log(`\n${SEP}`);
  console.log(`📋 ${sc.label}`);
  const out = compute(sc.input);
  console.log(`   RMR: ${out.rmr} kcal/gün`);
  console.log(`   stdMET: ${out.standardMet} → correctedMET: ${out.correctedMet}`);
  console.log(`   kcalNet: ${out.kcalNet} | EPOC: +${out.epocRange[0]}–${out.epocRange[1]} | Total: ${out.totalKcalRange[0]}–${out.totalKcalRange[1]}`);
  console.log(`   Su: +${out.waterBonusML}ml | Elektrolit uyarısı: ${out.electrolytesWarning}`);
  console.log(`   Chrono: ${out.chronoWarning} | Kaynak: ${out.sourceNote}`);
  console.log(`   MET aşaması: ${out.metStage}`);

  for (const check of sc.checks) {
    const ok = check.pass(out);
    if (ok) {
      passed++;
      console.log(`   ✅ ${check.desc}`);
    } else {
      failed++;
      console.log(`   ❌ BAŞARISIZ: ${check.desc}`);
    }
  }
}

console.log(`\n${SEP}`);
console.log(`\nSonuç: ${passed} geçti, ${failed} başarısız\n`);
if (failed > 0) process.exit(1);
