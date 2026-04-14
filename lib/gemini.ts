import { GoogleGenerativeAI } from '@google/generative-ai';
import { Profile } from '../types';
import { DIET_TYPES, MOTIVATIONS, OBSTACLES, ALLERGIES } from './constants';

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

Kullanıcı profili aşağıda verilecek.`;

/**
 * Profil verilerini kullanarak kişiselleştirilmiş sistem promptu oluşturur.
 * Tüm AI fonksiyonlarında DIETITIAN_SYSTEM_PROMPT yerine kullanılabilir.
 */
export function buildSystemPrompt(profile: Partial<Profile>): string {
  const lines: string[] = [DIETITIAN_SYSTEM_PROMPT];

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
 * Fotoğraftan yemek tanıma
 */
export async function recognizeFoodFromImage(imageBase64: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Bu yemek fotoğrafını analiz et. Yemeği tanı ve tahmini besin değerlerini ver.

  SADECE şu JSON formatında yanıtla (başka metin ekleme):
  {
    "name": "yemek adı (Türkçe)",
    "calories": 100g için kalori miktarı (sayı),
    "protein": 100g için protein (g, sayı),
    "carbs": 100g için karbonhidrat (g, sayı),
    "fat": 100g için yağ (g, sayı),
    "confidence": güven skoru 0-1 arası (sayı)
  }`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg',
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Yemek tanınamadı');

  return JSON.parse(jsonMatch[0]);
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

  const prompt = `${DIETITIAN_SYSTEM_PROMPT}

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

  const prompt = `${DIETITIAN_SYSTEM_PROMPT}

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

export async function generateRecipe(params: {
  request: string;
  profile: Profile;
}): Promise<RecipeResult> {
  const { request, profile } = params;
  const age = new Date().getFullYear() - new Date(profile.birth_date ?? '').getFullYear();

  const prompt = `${DIETITIAN_SYSTEM_PROMPT}

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
