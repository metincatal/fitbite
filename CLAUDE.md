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

`lib/gemini.ts` — dört fonksiyon:
- `recognizeFoodFromImage` — base64 görsel → besin değerleri (JSON)
- `analyzeWeeklyNutrition` — haftalık beslenme raporu (metin)
- `generateShoppingList` — alışveriş listesi (JSON dizisi)
- `generateRecipe` — tarif (JSON)

Tüm AI yanıtları Türkçe. `DIETITIAN_SYSTEM_PROMPT` tüm prompt'lara prefix olarak eklenir. AI yanıtlarından JSON parse ederken regex (`/\{[\s\S]*\}/` veya `/\[[\s\S]*\]/`) kullanılır.

### Barcode

`lib/openfoodfacts.ts` — Open Food Facts API ile barkod sorgulama.

### Nutrition Hesapları

`lib/nutrition.ts` — Mifflin-St Jeor (BMR), TDEE, makro hesapları, BMI. Güvenlik sınırları: kadın min 1200 kcal, erkek min 1500 kcal.

### Design Tokens

`lib/constants.ts` — `Colors`, `Spacing`, `BorderRadius`, `FontSize` sabitleri. Yeni component yazarken `StyleSheet.create` ile bu sabitler kullanılmalıdır. Satır içi stil kullanılmaz.

`Colors.primary` = `#2D6A4F` (yeşil), `Colors.accent` = `#F4845F` (turuncu).

## Key Conventions

- Tüm UI metinleri Türkçedir.
- `foods` tablosunda besinler `calories_per_100g` bazında tutulur; `food_logs`'a kaydedilirken `serving_amount` ile çarpılarak güncel kalori/makro hesaplanır.
- Expo Router'da `useRouter` + `useSegments` ile programatik yönlendirme yapılır.
- `expo-notifications` su hatırlatıcıları için kullanılır (`lib/notifications.ts`).
