import { GoogleGenerativeAI } from '@google/generative-ai';
import { Profile } from '../types';
import {
  DIET_TYPES,
  MOTIVATIONS,
  OBSTACLES,
  ALLERGIES,
  MEDICAL_CONDITIONS,
  TTMStage,
} from './constants';
import type { SafetyFlags } from '../types/database';
import type { DetectedFoodItem } from '../types/nutrition';

// Bilimsel motor tipini geriye uyumlu olarak buradan da export ediyoruz —
// PhotoMealReviewModal vb. eski importlar kırılmasın diye.
export type { DetectedFoodItem } from '../types/nutrition';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});

export const DIETITIAN_SYSTEM_PROMPT = `Sen FitBite uygulamasının yapay zeka diyetisyeni FitBot'sun.
Türkiye Diyetisyenler Derneği standartlarına ve WHO beslenme rehberlerine uygun,
bilimsel temelli ve kişiselleştirilmiş beslenme tavsiyeleri veriyorsun.

KURALLAR:
- Her zaman Türkçe yanıt ver
- Kısa, net ve pratik öneriler sun
- Kesinlikle tehlikeli diyet önerileri verme (1200 kcal altı, tek gıda diyeti vb.)
- Tıbbi durumlar için mutlaka doktora yönlendir
- Pozitif ve motive edici bir dil kullan
- Türk mutfağından örnekler ver

BİLİMSEL ZEMİN:
- Protein tok tutar ve ~%20 termik etki (TEF) ile metabolizmayı artırır — her öğünde yeterli protein öner.
- Son öğünü uykudan en az 2-3 saat önce bitirmesini hatırlat (sirkadiyen uyum).

Kullanıcı profili aşağıda verilecek.`;

// Transtheoretical Model — aşamaya göre konuşma tonu
const TTM_PROMPTS: Record<TTMStage, string> = {
  precontemplation: `
## KULLANICI DEĞİŞİM AŞAMASI: Farkındalık Öncesi
Yaklaşım: EĞİTİCİ — yargısız, baskısız.
- "Yapmalısın" dili kullanma; fayda bilgisi ve farkındalık tetikleyicilerle sınırla.
- Somut plan dayatma; kullanıcı henüz istemiyor.
- Nötr, bilgi-odaklı ton kullan.`.trim(),
  contemplation: `
## KULLANICI DEĞİŞİM AŞAMASI: Düşünme
Yaklaşım: FAYDA ODAKLI.
- "Başladığında neler olabilir" senaryolarını çiz.
- Ambivalansa saygı göster, küçük test-adımları öner.
- Engelleri birlikte tartış.`.trim(),
  preparation: `
## KULLANICI DEĞİŞİM AŞAMASI: Hazırlık
Yaklaşım: SOMUT HEDEF.
- "Bu hafta şunu yap" formatı kullan.
- Ölçülebilir 7 günlük mini-plan öner.
- Rutin kurma pratikleri paylaş.`.trim(),
  action: `
## KULLANICI DEĞİŞİM AŞAMASI: Aktif Eylem
Yaklaşım: TEKNİK & TAKİP.
- Makro ve kalori detayına gir.
- "Geçen hafta %X hedefi tutturdun" gibi veri-dili kullan.
- Motivasyon azal, analiz artır.`.trim(),
  maintenance: `
## KULLANICI DEĞİŞİM AŞAMASI: Sürdürme
Yaklaşım: KAYMA ÖNLEME.
- Tatil/düğün/stres gibi bozucu faktörlere hazırlık yap.
- Mini-plato stratejileri paylaş.
- Başarıyı kutlama dilini koru.`.trim(),
};

/**
 * Profil verilerini kullanarak kişiselleştirilmiş sistem promptu oluşturur.
 * Tüm AI fonksiyonlarında DIETITIAN_SYSTEM_PROMPT yerine kullanılabilir.
 */
export function buildSystemPrompt(profile: Partial<Profile>): string {
  const lines: string[] = [DIETITIAN_SYSTEM_PROMPT];

  // TTM aşaması — tüm tonu belirler
  const ttm = profile.ttm_stage as TTMStage | null | undefined;
  if (ttm && TTM_PROMPTS[ttm]) {
    lines.push('\n' + TTM_PROMPTS[ttm]);
  }

  // Güvenlik bayrakları — AI'ın kırmızı çizgileri
  const flags = profile.safety_flags as SafetyFlags | undefined;
  const safetyLines: string[] = [];
  if (flags?.blockers?.includes('scoff_positive')) {
    safetyLines.push(
      '- ⚠️ Kullanıcıda yeme bozukluğu riski var. Kilo verme, kalori kısıtlama, tartı-odaklı dil KULLANMA. Sağlıklı ilişki ve profesyonel destek odaklı kal.'
    );
  }
  if (flags?.blockers?.includes('underweight_bmi')) {
    safetyLines.push(
      '- ⚠️ Kullanıcı zayıf kategoride (BMI<18.5). Kilo verme önerisi verme. Sağlıklı dengeleme/kilo alma odaklı ol.'
    );
  }
  if (flags?.warnings?.includes('pregnancy')) {
    safetyLines.push(
      '- ⚠️ Kullanıcı hamile. Kalori kısıtlama YOK. Folik asit, demir, kalsiyum önerilerini rehbere uygun ver.'
    );
  }
  if (flags?.warnings?.includes('lactation')) {
    safetyLines.push(
      '- ⚠️ Kullanıcı emziriyor. 300-500 kcal ek enerji gerekli; kalori kısıtlama verme.'
    );
  }
  if (flags?.warnings?.includes('chronic_disease')) {
    safetyLines.push(
      '- ⚠️ Kullanıcıda kronik hastalık var. Her ciddi öneriyi "doktorunla teyit et" ile kapat.'
    );
  }
  if (flags?.warnings?.includes('rate_too_aggressive')) {
    safetyLines.push(
      '- ⚠️ Kullanıcının haftalık hedefi agresif. Sürdürülebilir tempo (≤ %1 vücut ağırlığı/hafta) öner.'
    );
  }
  if (flags?.warnings?.includes('protein_over_amdr')) {
    safetyLines.push(
      '- ℹ️ Protein hedefi AMDR üst sınırında. Uzun vadede dengeyi gözeten öneriler sun.'
    );
  }
  if (safetyLines.length > 0) {
    lines.push('\n## GÜVENLİK KISITLARI (sıkı uy):');
    lines.push(...safetyLines);
  }

  // Tıbbi durum detayları (safety flag'ten ayrı bilgi)
  const conditions = profile.medical_conditions as string[] | null | undefined;
  if (conditions && conditions.length > 0 && !conditions.includes('none')) {
    const labels = conditions
      .map((k) => MEDICAL_CONDITIONS.find((m) => m.key === k)?.label ?? k)
      .join(', ');
    lines.push(`\nTıbbi durumlar: ${labels}`);
    lines.push('→ Öneriler bu durumları gözetmeli; doktor/diyetisyen kontrolüne yönlendir.');
  }

  // Motivasyonlar
  if (profile.motivations && profile.motivations.length > 0) {
    const motivationLabels = profile.motivations
      .map((key) => MOTIVATIONS.find((m) => m.key === key)?.label ?? key)
      .join(', ');
    lines.push(`\nKullanıcının motivasyonları: ${motivationLabels}`);
    lines.push('→ Yanıtlarını bu motivasyonlara göre odakla, ilgili hedeflere değin.');
  }

  // Geçmiş engeller
  if (profile.past_obstacles && profile.past_obstacles.length > 0) {
    const obstacleLabels = profile.past_obstacles
      .map((key) => OBSTACLES.find((o) => o.key === key)?.label ?? key)
      .join(', ');
    lines.push(`\nGeçmişteki zorluklar: ${obstacleLabels}`);
    lines.push('→ Bu engelleri göz önünde bulundurarak pratik ve gerçekçi öneriler sun.');
  }

  // Diyet tercihi
  if (profile.diet_type && profile.diet_type !== 'normal') {
    const diet = DIET_TYPES[profile.diet_type as keyof typeof DIET_TYPES];
    if (diet) {
      lines.push(`\nDiyet tercihi: ${diet.emoji} ${diet.label} (${diet.description})`);
      lines.push('→ Tarif ve besin önerilerinde bu diyete uygun seçenekler sun.');
    }
  }

  // Alerjiler / intoleranslar
  if (profile.allergies && profile.allergies.length > 0) {
    const allergyLabels = profile.allergies
      .map((key) => ALLERGIES.find((a) => a.key === key)?.label ?? key)
      .join(', ');
    lines.push(`\n⚠️ Alerjiler / intoleranslar: ${allergyLabels}`);
    lines.push('→ Bu içerikleri kesinlikle önerme; içerebilecek yemeklerde uyar.');
  }

  // Öğün sayısı
  if (profile.meal_count) {
    lines.push(`\nGünlük öğün sayısı: ${profile.meal_count}`);
    if (profile.first_meal_time && profile.last_meal_time) {
      lines.push(`İlk öğün: ${profile.first_meal_time}, Son öğün: ${profile.last_meal_time}`);
    }
    lines.push('→ Önerileri bu öğün ritmine uygun planla.');
  }

  return lines.join('\n');
}

/**
 * Sohbet basligi uretme
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const prompt = `Bu kullanici mesajindan 30 karakteri gecmeyen kisa bir sohbet basligi olustur.
SADECE basligi yaz, baska bir sey ekleme. Tirnak isareti kullanma.
Mesaj: "${firstMessage}"`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text().trim().slice(0, 30);
}

/**
 * Fotoğraftaki tüm yiyecek ve içecekleri tespit et.
 *
 * v2: Gemini sadece TANIMA ve FİZİKSEL METADATA üretir.
 * Kalori/makro hesabı `lib/nutritionEngine.ts` içinde deterministik olarak
 * (kompozisyon × gram × yoğunluk × yield × gizli yağ) yapılır.
 * Eski `calories/protein/carbs/fat` alanları sadece kompozisyonda eşleşme
 * bulunamayan egzotik yemekler için fallback amacıyla istenir.
 */
export async function recognizeMealFromImage(imageBase64: string, userHint?: string): Promise<DetectedFoodItem[]> {
  if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY tanımlı değil (.env eksik)');
  }
  // Yeni v2 şeması nested ve uzun — Gemini bazen markdown code fence ile sarıyor
  // veya thinking-mode bütçesini tüketip boş döndürüyor. responseMimeType ile
  // saf JSON garanti, maxOutputTokens ile yeterli alan.
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.4,
    },
  });

  const hintSection = userHint && userHint.trim()
    ? `\nKullanıcı notu (öncelikli referans al): "${userHint.trim()}"\n`
    : '';

  const prompt = `Bu yemek fotoğrafını dikkatle analiz et. Fotoğraftaki TÜM yiyecek ve içecekleri ayrı ayrı tespit et.
${hintSection}
GÖREVİN: Her yiyecek için fiziksel/görsel METADATA çıkar. Kalori veya makro besin tahmini yapma — bunlar sonradan deterministik bir motorda hesaplanacak. Sadece kompozisyon eşleşmesi bulunamazsa diye yaklaşık makroları da yaz; ana çıktı metadata'dır.

REFERANS NESNE: Fotoğrafta kaşık, çatal, tabak, kart, el gibi referans nesnesi varsa tespit et — porsiyon ölçüsü için kritik.

SADECE şu JSON formatında yanıtla (başka hiçbir metin ekleme):
[
  {
    "name": "yemek/içecek adı (Türkçe)",
    "estimatedGrams": <gram, sayı>,
    "cookingMethod": "raw" | "boiled" | "grilled" | "fried" | "deep_fried" | "baked" | "steamed" | "sauteed" | "unknown",
    "texture": "fluffy" | "dense" | "granular" | "liquid" | "amorphous",
    "hiddenSauceProb": <0..1, görünmeyen sos/yağ olasılığı>,
    "referenceObject": "spoon" | "fork" | "plate" | "card" | "hand" | "none",
    "occlusionRatio": <0..1, üst üste bindiyse ne kadarı kapalı>,
    "confidence": <0..1, tanıma güveni>,
    "ingredientBreakdown": [{"name":"...","ratio":0.x}],   // karışık tabak için, toplam=1.0; tekil yemekte boş bırak
    "calories": <yaklaşık kcal — sadece fallback için>,
    "protein": <yaklaşık g — sadece fallback için>,
    "carbs": <yaklaşık g — sadece fallback için>,
    "fat": <yaklaşık g — sadece fallback için>
  }
]

Kurallar:
- Granüler/sıvı/amorf gıdalarda (pirinç, çorba, püre) confidence ≤ 0.6
- Karışık tabakta (örn. pilav+tavuk+salata) ingredientBreakdown ile bileşen oranı ver
- Garnitür, sos, ekmek gibi yan ürünleri ayrı item olarak listele
- Pişirme yöntemi belirsizse "unknown"
- referenceObject yoksa "none"`;

  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } };
  const text = await withGeminiRetry(async () => {
    const result = await model.generateContent([prompt, imagePart]);
    const t = result.response.text();
    console.log('[gemini:recognizeMealFromImage] raw response length:', t.length);
    if (!t || !t.trim()) {
      console.warn(
        '[gemini:recognizeMealFromImage] empty text — finishReason:',
        result.response.candidates?.[0]?.finishReason,
        '— promptFeedback:', result.response.promptFeedback
      );
      throw new Error(
        `Gemini boş cevap döndü (finishReason: ${result.response.candidates?.[0]?.finishReason ?? 'bilinmiyor'})`
      );
    }
    return t;
  }, 'recognizeMealFromImage');
  const parsed = parseJsonArray(text, 'recognizeMealFromImage');
  return parsed.map(normalizeDetection);
}

// Gemini cevabı bazen markdown code fence ile sarılı (```json ... ```) ya da
// boşluk/açıklama metnine sarılı geliyor. Birden fazla strateji dener.
function parseJsonArray(text: string, ctx: string): unknown[] {
  if (!text || !text.trim()) {
    console.warn(`[gemini:${ctx}] empty response`);
    throw new Error('Yemek tanınamadı');
  }
  // 1) markdown fence'leri kaldır
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  // 2) doğrudan parse dene (responseMimeType=application/json varsa bu çalışır)
  try {
    const direct = JSON.parse(stripped);
    if (Array.isArray(direct)) return direct;
    // model bazen tek nesne döndürüyor — diziye çevir
    if (direct && typeof direct === 'object') return [direct];
  } catch {
    // 3) regex fallback: ilk [...] bloğunu yakala
  }
  const arrMatch = stripped.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const fromArr = JSON.parse(arrMatch[0]);
      if (Array.isArray(fromArr)) return fromArr;
    } catch (e) {
      console.warn(`[gemini:${ctx}] array regex parse failed`, e);
    }
  }
  // 4) tek nesne {...} olarak kaldıysa
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (obj && typeof obj === 'object') return [obj];
    } catch (e) {
      console.warn(`[gemini:${ctx}] object regex parse failed`, e);
    }
  }
  console.warn(`[gemini:${ctx}] could not parse — raw text:`, stripped.slice(0, 500));
  throw new Error('Yemek tanınamadı');
}

// Gemini bazen alanları atlar; motor için minimum guarantilemeli alanları doldur.
function normalizeDetection(raw: unknown): DetectedFoodItem {
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number) => (typeof v === 'number' && !Number.isNaN(v) ? v : fb);
  const str = (v: unknown, fb: string) => (typeof v === 'string' && v.length > 0 ? v : fb);
  return {
    name: str(r.name, 'Bilinmeyen'),
    estimatedGrams: Math.max(1, num(r.estimatedGrams, 100)),
    cookingMethod: str(r.cookingMethod, 'unknown') as DetectedFoodItem['cookingMethod'],
    texture: str(r.texture, 'dense') as DetectedFoodItem['texture'],
    hiddenSauceProb: clamp01(num(r.hiddenSauceProb, 0)),
    referenceObject: str(r.referenceObject, 'none') as DetectedFoodItem['referenceObject'],
    occlusionRatio: clamp01(num(r.occlusionRatio, 0)),
    confidence: clamp01(num(r.confidence, 0.5)),
    ingredientBreakdown: Array.isArray(r.ingredientBreakdown)
      ? (r.ingredientBreakdown as Array<Record<string, unknown>>)
          .map((i) => ({ name: String(i.name ?? ''), ratio: clamp01(Number(i.ratio) || 0) }))
          .filter((i) => i.name && i.ratio > 0)
      : undefined,
    calories: num(r.calories, 0),
    protein: num(r.protein, 0),
    carbs: num(r.carbs, 0),
    fat: num(r.fat, 0),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Gemini API'sı zaman zaman 503 (yüksek talep) veya 429 (rate limit) döndürür.
// Geçici hatalar için exponential backoff ile retry; kalıcı hatalar (4xx, parse) için
// tekrar deneme yok — anında throw.
function isTransientGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('[503') ||
    msg.includes('[429') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  ctx: string,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 900;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientGeminiError(err) || attempt === retries) break;
      const wait = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(
        `[gemini:${ctx}] geçici hata, ${Math.round(wait)}ms sonra tekrar deneniyor (attempt ${attempt + 1}/${retries})`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  // Kullanıcıya gösterilen son mesajı insanlaştır
  if (isTransientGeminiError(lastErr)) {
    throw new Error(
      'Gemini şu an yoğun, birkaç saniye sonra tekrar dene. (Sorun bizde değil; Google sunucularında geçici talep yoğunluğu var.)'
    );
  }
  throw lastErr;
}

/**
 * Analizi iyileştirmek için soru üret
 */
export async function generateAnalysisQuestions(items: DetectedFoodItem[]): Promise<string[]> {
  const itemList = items.map((i) => i.name).join(', ');
  const prompt = `Bir yemek fotoğrafında şu yiyecekler tespit edildi: ${itemList}

Analizi iyileştirmek için kullanıcıya sorulacak 3 kısa, pratik soru üret.
SADECE şu JSON formatında yanıtla:
["Soru 1?", "Soru 2?", "Soru 3?"]

Sorular pişirme yöntemi, porsiyon büyüklüğü, eklenen malzemeler veya gözden kaçan yiyecekler hakkında olsun.`;

  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

/**
 * Kullanıcı cevaplarıyla analizi yenile
 */
export async function refineAnalysisWithAnswers(
  imageBase64: string,
  currentItems: DetectedFoodItem[],
  qa: { question: string; answer: string }[]
): Promise<DetectedFoodItem[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      temperature: 0.4,
    },
  });
  const currentList = currentItems.map((i) => `- ${i.name} (~${i.estimatedGrams}g)`).join('\n');
  const qaText = qa.filter((q) => q.answer.trim()).map((q) => `S: ${q.question}\nC: ${q.answer}`).join('\n');

  const prompt = `Bu yemek fotoğrafını yeniden analiz et.

Önceki tespitim:
${currentList}

Kullanıcının verdiği ek bilgiler:
${qaText}

Bu bilgilere göre daha doğru bir TANIMA + METADATA çıktısı üret. Kalori/makro hesabı motorda yapılacak; sen sadece fiziksel parametreleri netleştir.
SADECE şu JSON formatında yanıtla:
[
  {
    "name": "yemek/içecek adı (Türkçe)",
    "estimatedGrams": <gram, sayı>,
    "cookingMethod": "raw" | "boiled" | "grilled" | "fried" | "deep_fried" | "baked" | "steamed" | "sauteed" | "unknown",
    "texture": "fluffy" | "dense" | "granular" | "liquid" | "amorphous",
    "hiddenSauceProb": <0..1>,
    "referenceObject": "spoon" | "fork" | "plate" | "card" | "hand" | "none",
    "occlusionRatio": <0..1>,
    "confidence": <0..1>,
    "ingredientBreakdown": [{"name":"...","ratio":0.x}],
    "calories": <fallback kcal>,
    "protein": <fallback g>,
    "carbs": <fallback g>,
    "fat": <fallback g>
  }
]`;

  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } };
  const text = await withGeminiRetry(async () => {
    const result = await model.generateContent([prompt, imagePart]);
    const t = result.response.text();
    if (!t || !t.trim()) {
      throw new Error(
        `Gemini boş cevap döndü (finishReason: ${result.response.candidates?.[0]?.finishReason ?? 'bilinmiyor'})`
      );
    }
    return t;
  }, 'refineAnalysisWithAnswers');
  let parsed: unknown[];
  try {
    parsed = parseJsonArray(text, 'refineAnalysisWithAnswers');
  } catch {
    throw new Error('Analiz yenilenemedi');
  }
  return parsed.map(normalizeDetection);
}

/**
 * Fotoğraftan yemek tanıma (tek yemek - geriye dönük uyumluluk)
 */
export async function recognizeFoodFromImage(imageBase64: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}> {
  const items = await recognizeMealFromImage(imageBase64);
  if (items.length === 0) throw new Error('Yemek tanınamadı');
  const first = items[0];
  const per100 = first.estimatedGrams > 0 ? 100 / first.estimatedGrams : 1;
  return {
    name: first.name,
    calories: Math.round((first.calories ?? 0) * per100),
    protein: Math.round((first.protein ?? 0) * per100 * 10) / 10,
    carbs: Math.round((first.carbs ?? 0) * per100 * 10) / 10,
    fat: Math.round((first.fat ?? 0) * per100 * 10) / 10,
    confidence: first.confidence,
  };
}

/**
 * Haftalık beslenme analizi
 */
export async function analyzeWeeklyNutrition(params: {
  profile: Profile;
  dailyData: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}): Promise<string> {
  const { profile, dailyData, goals } = params;

  const avgCalories = dailyData.reduce((s, d) => s + d.calories, 0) / (dailyData.length || 1);
  const avgProtein = dailyData.reduce((s, d) => s + d.protein, 0) / (dailyData.length || 1);
  const daysLogged = dailyData.filter((d) => d.calories > 0).length;

  const age = new Date().getFullYear() - new Date(profile.birth_date ?? '').getFullYear();

  const profileText = `
- İsim: ${profile.name}
- Yaş: ${age} yaş
- Hedef: ${profile.goal === 'lose' ? 'Kilo vermek' : profile.goal === 'gain' ? 'Kilo almak' : 'Kiloyu korumak'}
- Günlük kalori hedefi: ${goals.calories} kcal
- Protein hedefi: ${goals.protein_g}g`;

  const dataText = dailyData
    .filter((d) => d.calories > 0)
    .map((d) => `  ${d.date}: ${d.calories} kcal, ${d.protein}g protein, ${d.carbs}g karb, ${d.fat}g yağ`)
    .join('\n') || '  (Bu hafta kayıt yok)';

  const prompt = `${buildSystemPrompt(profile)}

Kullanıcı profili:
${profileText}

Hedefler:
- Kalori: ${goals.calories} kcal/gün
- Protein: ${goals.protein_g}g/gün
- Karbonhidrat: ${goals.carbs_g}g/gün
- Yağ: ${goals.fat_g}g/gün

Son 7 günün beslenme verileri:
${dataText}

Özet:
- Takip edilen gün sayısı: ${daysLogged}/7
- Ortalama kalori: ${Math.round(avgCalories)} kcal
- Ortalama protein: ${Math.round(avgProtein)}g

Lütfen bu kullanıcıya kişiselleştirilmiş haftalık beslenme analizi yap. Şunları içer:
1. Genel değerlendirme (2-3 cümle)
2. Güçlü yönler (1-2 madde)
3. İyileştirilecek alanlar (1-2 madde)
4. Bu hafta için 2-3 pratik öneri

Kısa ve motive edici tut. Türkçe yaz.`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}

/**
 * AI ile alışveriş listesi önerisi
 */
export async function generateShoppingList(params: {
  profile: Profile;
  goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  dietType?: string;
}): Promise<string[]> {
  const { profile, goals, dietType } = params;

  const prompt = `${buildSystemPrompt(profile)}

Kullanıcı profili:
- Hedef: ${profile.goal === 'lose' ? 'Kilo vermek' : profile.goal === 'gain' ? 'Kilo almak' : 'Kiloyu korumak'}
- Günlük kalori hedefi: ${goals.calories} kcal
- Diyet tipi: ${dietType ?? 'Normal'}

Bir haftalık beslenme planı için alışveriş listesi oluştur.
SADECE şu JSON formatında yanıtla (başka metin ekleme):
["ürün 1", "ürün 2", "ürün 3", ...]

Türk marketi ürünleri kullan, 20-25 madde ekle. Kategorilere göre sırala (önce sebze/meyve, sonra protein kaynakları, tahıllar, süt ürünleri, vb.).`;

  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

/**
 * AI tarif önerisi
 */
export interface RecipeResult {
  name: string;
  description: string;
  servings: number;
  prepTime: string;
  ingredients: string[];
  steps: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
}

/**
 * Yiyecek adı ve gramaja göre besin değerlerini tahmin eder
 */
/**
 * Fotoğraf öğünü için espritüel Türkçe isim üret
 */
export async function generateMealName(foodNames: string[]): Promise<string> {
  const list = foodNames.join(', ');
  const prompt = `Şu yiyecekleri içeren bir öğün için kısa, espritüel, yaratıcı ve Türkçe bir isim üret: ${list}
SADECE ismi yaz, başka hiçbir şey ekleme. 3-5 kelimelik, eğlenceli ve akılda kalıcı olsun.
Örnek stiller: "Karbonhidrat Festivali", "Proteinin Şafağı", "Gece Yarısı Keşfi", "Kahramanlık Öğünü"`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text().trim().slice(0, 40);
}

export async function estimateNutritionFromText(params: {
  foodName: string;
  grams: number;
}): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  const { foodName, grams } = params;
  const prompt = `"${foodName}" adlı yiyeceğin ${grams} gram için besin değerlerini tahmin et.

SADECE şu JSON formatında yanıtla (başka metin ekleme):
{
  "calories": toplam kalori (sayı),
  "protein": toplam protein gram (sayı),
  "carbs": toplam karbonhidrat gram (sayı),
  "fat": toplam yağ gram (sayı)
}

Gerçekçi ve bilimsel değerler kullan. Türk mutfağı referans al.`;

  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Besin değerleri hesaplanamadı');
  return JSON.parse(jsonMatch[0]);
}

export async function generateRecipe(params: {
  request: string;
  profile: Profile;
}): Promise<RecipeResult> {
  const { request, profile } = params;
  const age = new Date().getFullYear() - new Date(profile.birth_date ?? '').getFullYear();

  const prompt = `${buildSystemPrompt(profile)}

Kullanıcı profili:
- Hedef: ${profile.goal === 'lose' ? 'Kilo vermek' : profile.goal === 'gain' ? 'Kilo almak' : 'Kiloyu korumak'}
- Diyet tipi: ${profile.diet_type ?? 'Normal'}
- Günlük kalori hedefi: ${profile.daily_calorie_goal ?? 2000} kcal
- Yaş: ${age}

Tarif isteği: "${request}"

SADECE şu JSON formatında yanıtla (başka metin ekleme):
{
  "name": "Tarif adı",
  "description": "Kısa açıklama (1-2 cümle)",
  "servings": 2,
  "prepTime": "20 dakika",
  "ingredients": ["500g tavuk göğsü", "2 diş sarımsak", ...],
  "steps": ["Tavuğu küp küp doğrayın.", "..."],
  "nutrition": {
    "calories": 350,
    "protein": 35,
    "carbs": 20,
    "fat": 12
  }
}

Tarif kişi başı değerleri için nutrition hesapla. Türk mutfağına uygun malzemeler kullan.`;

  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Tarif oluşturulamadı');
  return JSON.parse(jsonMatch[0]);
}
