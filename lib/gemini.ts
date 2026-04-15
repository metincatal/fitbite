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
 * Fotoğraftaki tüm yiyecek ve içecekleri tespit et
 */
export interface DetectedFoodItem {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export async function recognizeMealFromImage(imageBase64: string, userHint?: string): Promise<DetectedFoodItem[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const hintSection = userHint && userHint.trim()
    ? `\nKullanıcı notu (öncelikli referans al): "${userHint.trim()}"\n`
    : '';

  const prompt = `Bu yemek fotoğrafını dikkatle analiz et. Fotoğraftaki TÜM yiyecek ve içecekleri ayrı ayrı tespit et.
Her biri için tahmini gramaj ve o gramaja göre toplam besin değerlerini hesapla.
${hintSection}
SADECE şu JSON formatında yanıtla (başka hiçbir metin ekleme, açıklama yapma):
[
  {
    "name": "yemek/içecek adı (Türkçe)",
    "estimatedGrams": tahmini gram miktarı (sayı),
    "calories": bu gramaj için toplam kalori (sayı),
    "protein": bu gramaj için toplam protein gram (sayı),
    "carbs": bu gramaj için toplam karbonhidrat gram (sayı),
    "fat": bu gramaj için toplam yağ gram (sayı),
    "confidence": güven skoru 0-1 arası (sayı)
  }
]

Önemli kurallar:
- Tabaktaki her farklı yiyeceği ve içeceği ayrı nesne olarak listele
- Garnitür, sos, ekmek gibi yan ürünleri de dahil et
- Gramaj tahmini için porsiyon büyüklüğünü görsel olarak değerlendir`;

  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } };
  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Yemek tanınamadı');
  return JSON.parse(jsonMatch[0]);
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const currentList = currentItems.map((i) => `- ${i.name} (~${i.estimatedGrams}g)`).join('\n');
  const qaText = qa.filter((q) => q.answer.trim()).map((q) => `S: ${q.question}\nC: ${q.answer}`).join('\n');

  const prompt = `Bu yemek fotoğrafını yeniden analiz et.

Önceki tespitim:
${currentList}

Kullanıcının verdiği ek bilgiler:
${qaText}

Bu bilgilere göre daha doğru bir analiz yap. SADECE şu JSON formatında yanıtla:
[
  {
    "name": "yemek/içecek adı (Türkçe)",
    "estimatedGrams": tahmini gram (sayı),
    "calories": toplam kalori (sayı),
    "protein": toplam protein gram (sayı),
    "carbs": toplam karbonhidrat gram (sayı),
    "fat": toplam yağ gram (sayı),
    "confidence": 0-1 arası güven (sayı)
  }
]`;

  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } };
  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Analiz yenilenemedi');
  return JSON.parse(jsonMatch[0]);
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
    calories: Math.round(first.calories * per100),
    protein: Math.round(first.protein * per100 * 10) / 10,
    carbs: Math.round(first.carbs * per100 * 10) / 10,
    fat: Math.round(first.fat * per100 * 10) / 10,
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
