import { GoogleGenerativeAI } from '@google/generative-ai';

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
