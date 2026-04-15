# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Geliştirme sunucusu başlat
npx expo start

# Platform bazlı başlatma
npx expo start --ios
npx expo start --android
npx expo start --web
```

Test komutu yok; TypeScript kontrolü için:
```bash
npx tsc --noEmit
```

## Environment Variables

`.env` dosyasında üç değişken gereklidir (`.env.example`'a bakın):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY`

## Architecture

### Routing (Expo Router — file-based)

```
app/
  _layout.tsx          # Root layout: auth guard + session yönetimi
  (auth)/              # Login / Register — oturum yoksa buraya yönlendirilir
  (tabs)/              # Ana tab navigasyonu (5 tab)
    index.tsx          # Ana sayfa — günlük özet
    food-log.tsx       # Yemek günlüğü
    ai-chat.tsx        # FitBot AI chat
    progress.tsx       # İlerleme grafikleri + vücut ölçüleri
    profile.tsx        # Profil & ayarlar
  onboarding/          # İlk kurulum sihirbazı
  food/[id].tsx        # Yemek detay sayfası
  recipe.tsx           # AI tarif sayfası
  shopping-list.tsx    # AI alışveriş listesi
```

Auth guard `app/_layout.tsx` içinde: oturum yoksa `(auth)/login`'e, oturum varsa `(tabs)`'a yönlendirir.

### State Management (Zustand)

İki store vardır:
- `store/authStore.ts` — `session`, `user`, `profile`; Supabase auth state'ini dinler
- `store/nutritionStore.ts` — `foodLogs`, `waterLogs`, `selectedDate`; günlük Supabase sorguları

### Backend (Supabase)

`lib/supabase.ts` — Supabase client'ı. Expo SecureStore'un 2048 byte limitini aşmak için session token'ları chunk'lara bölünür.

Supabase tablolar (`types/database.ts`):
- `profiles` — kullanıcı metrikleri + hedefler (kalori, makro, su)
- `foods` — besin veritabanı (`name_tr` Türkçe isim içerir, `is_turkish` bayrağı var)
- `food_logs` — öğüne göre (breakfast/lunch/dinner/snack) yemek kayıtları
- `weight_logs`, `water_logs`, `body_measurements` — takip verileri
- `chat_messages` — FitBot konuşma geçmişi

### AI (Google Gemini 2.5 Flash)

`lib/gemini.ts` — tüm fonksiyonlar:
- `recognizeMealFromImage(base64, userHint?)` — fotoğraf → `DetectedFoodItem[]` (çoklu yemek)
- `generateAnalysisQuestions(items)` — tespit edilen yemekler için soru üretir
- `refineAnalysisWithAnswers(items, questions, answers)` — cevaplara göre analizi günceller
- `estimateNutritionFromText(params)` — metin açıklamasından besin tahmini
- `recognizeFoodFromImage(base64)` — tekil yemek, eski akış için
- `analyzeWeeklyNutrition(params)` — haftalık rapor (metin)
- `generateShoppingList(params)` — alışveriş listesi (JSON dizisi)
- `generateRecipe(params)` — tarif (JSON)
- `generateMealName(foodNames)` — öğün için espritüel Türkçe isim üretir
- `buildSystemPrompt(profile)` — profil verisiyle kişiselleştirilmiş sistem promptu

Tüm AI yanıtları Türkçe. `DIETITIAN_SYSTEM_PROMPT` tüm prompt'lara prefix olarak eklenir. AI yanıtlarından JSON parse ederken regex (`/\{[\s\S]*\}/` veya `/\[[\s\S]*\]/`) kullanılır.

### Fotoğraf Akışı (food-log → analiz)

1. Kullanıcı fotoğraf seçer → `base64` `pendingBase64` state'ine alınır
2. Hint prompt modal açılır (opsiyonel kullanıcı notu)
3. `startAnalysis(hint)` → `recognizeMealFromImage(base64, hint)` → `DetectedFoodItem[]`
4. `generateMealName(foodNames)` ile öğün ismi üretilir, `AsyncStorage` key `fitbite_meal_names` ile kalıcılaştırılır
5. `PhotoMealReviewModal` açılır: kullanıcı her item'ın porsiyonunu slider ile ayarlar
6. Kayıt: `uploadFoodPhoto` → Supabase `food-photos` bucket → `addFoodLog` store action

### Fotoğraf Analiz Bileşenleri

- `components/food/FoodPhotoModal.tsx` — eski tekil yemek akışı
- `components/food/PhotoMealReviewModal.tsx` — çoklu yemek review; `SliderControl` (PanResponder + `pageX` bazlı, throttled) ile porsiyon ayarı; "AI ile Makroları Hesapla" butonu `estimateNutritionFromText` çağırır
- `components/food/MealPhotoDetailModal.tsx` — kayıtlı fotoğraf detayı; öğün adı inline düzenlenebilir

### Barcode

`lib/openfoodfacts.ts` — Open Food Facts API ile barkod sorgulama.

### Fotoğraf Depolama

`lib/storage.ts` — `uploadFoodPhoto(userId, base64)`: Supabase Storage `food-photos` bucket'ına yükler, public URL döner. `base64-arraybuffer` ile decode gerektirir.

### Nutrition Hesapları

`lib/nutrition.ts` — Mifflin-St Jeor (BMR), TDEE, makro hesapları, BMI. Güvenlik sınırları: kadın min 1200 kcal, erkek min 1500 kcal.

### Design Tokens

`lib/constants.ts` — `Colors`, `Spacing`, `BorderRadius`, `FontSize` sabitleri. Yeni component yazarken `StyleSheet.create` ile bu sabitler kullanılmalıdır. Satır içi stil kullanılmaz.

`Colors.primary` = `#2D6A4F` (yeşil), `Colors.accent` = `#F4845F` (turuncu).

### Onboarding

`app/onboarding/` + `components/onboarding/` — çok adımlı sihirbaz. Tamamlanınca profil Supabase'e kaydedilir, ardından `(tabs)`'a yönlendirilir. `PhotoDemo` adımı fotoğraf analizi özelliğini gösterir.

### Dashboard Bileşenleri

- `components/charts/CalorieRing.tsx` — SVG halka grafiği
- `components/charts/ActivityRing.tsx` — adım/aktivite halkası
- `components/dashboard/ActivitySection.tsx` — `expo-sensors` ile adım izleme

## Key Conventions

- Tüm UI metinleri Türkçedir.
- `foods` tablosunda besinler `calories_per_100g` bazında tutulur; `food_logs`'a kaydedilirken `serving_amount` ile çarpılarak güncel kalori/makro hesaplanır.
- Expo Router'da `useRouter` + `useSegments` ile programatik yönlendirme yapılır.
- `expo-notifications` su hatırlatıcıları için kullanılır (`lib/notifications.ts`).
- Tüm tipler `types/index.ts`'den re-export edilir; Supabase şema tipleri `types/database.ts` tarafından üretilir (doğrudan düzenleme yapma).
- `lib/constants.ts` içindeki `MealType` = `'breakfast' | 'lunch' | 'dinner' | 'snack'`.
- Satır içi stil kullanılmaz; `StyleSheet.create` + design token'lar zorunlu.
