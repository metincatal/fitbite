# [CLAUDE.md](http://CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Geliştirme sunucusu başlat (development build üzerinden — Expo Go DEĞİL)
npx expo start

# Telefon farklı ağdaysa tunnel ile bağlan
npx expo start --tunnel
```

Test komutu yok; TypeScript kontrolü için:

```bash
npx tsc --noEmit
```

Smoke testler (birim test çerçevesi yok — doğrulama için bu kullanılır):

```bash
npx tsx lib/__demo/engineDemo.ts     # Besin motoru (8 senaryo)
npx tsx lib/__demo/exerciseDemo.ts   # Egzersiz motoru (5 senaryo, 19 kontrol)
```

## Build Politikası — KRİTİK

**Asla otomatik EAS build alma.** Free tier kotası ve queue süresi yüzünden build pahalı bir işlem. Kullanıcı açıkça **"build al"** demeden `eas build` komutu ÇALIŞTIRILMAZ.

Bunun yerine her değişiklik sonrası kullanıcıya net şekilde bildirilir:

- **🟢 BUILD GEREKMEZ** → `npx expo start` ile Metro üzerinden anında test edilebilir
- **🔴 BUILD GEREKİR** → değişiklik native katmana dokunuyor, yeni APK olmadan etki etmez

### Hangi değişiklik ne gerektirir?


| Değişiklik tipi                                                         | Build?   |
| ----------------------------------------------------------------------- | -------- |
| `app/`, `components/`, `lib/`, `hooks/`, `store/` altındaki .ts/.tsx    | 🟢 Hayır |
| Saf-JS npm paketi eklemek (lodash, date-fns vb.)                        | 🟢 Hayır |
| `assets/sounds/` veya runtime require edilen küçük asset                | 🟢 Hayır |
| `react-native-*` native modül eklemek                                   | 🔴 Evet  |
| Expo plugin gerektiren paket (`expo-camera` vb.) eklemek                | 🔴 Evet  |
| `app.json` `plugins` / `permissions` / `android.*` / `ios.*`            | 🔴 Evet  |
| `plugins/` altındaki custom config plugin değişimi                      | 🔴 Evet  |
| `assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png` | 🔴 Evet  |
| `package.json` `expo`/`react-native`/`react` versiyon değişikliği       | 🔴 Evet  |


Kullanıcı "build al" dediğinde profili açıkça onaylanmadıysa `**eas build -p android --profile preview`** kullanılır (APK çıktı, internal distribution).

## Environment Variables

`.env` dosyasında üç değişken gereklidir (`.env.example`'a bakın):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY`

## Architecture

### Project Layout

```
app/                   # Expo Router (file-based)
  _layout.tsx          # Root layout: auth guard + session + bildirim izni
  (auth)/              # Login / Register
  (tabs)/              # Ana tab navigasyonu (6 tab)
    index.tsx          # Ana sayfa — günlük özet + egzersiz tamponu banner
    food-log.tsx       # Yemek günlüğü
    ai-chat/           # FitBot AI chat (FAB center button placeholder)
    exercise.tsx       # Egzersiz tab — bilimsel motor, Ainsworth katalog
    progress.tsx       # İlerleme grafikleri + vücut ölçüleri
    profile.tsx        # Profil & ayarlar (Health Connect dahil)
  exercise.tsx         # Redirect → (tabs)/exercise (geriye uyumluluk)
  onboarding/          # İlk kurulum sihirbazı
  food/[id].tsx        # Yemek detay sayfası
  recipe.tsx           # AI tarif sayfası
  shopping-list.tsx    # AI alışveriş listesi

plugins/
  withHealthConnectSetup.js  # Custom Expo config plugin — HC için MainActivity ve manifest mod'ları

android/               # gitignored — EAS build prebuild ile sıfırdan üretir
                       # Lokal expo run:android için tutulur, manuel düzenleme yapılırsa
                       # plugins/ tarafına da yansıtılmalı
```

Auth guard `app/_layout.tsx` içinde: oturum yoksa `(auth)/login`'e, oturum varsa `(tabs)`'a yönlendirir.

Tab bar'da merkez slot (`ai-chat`) bir FAB butonu olarak render edilir — gerçek navigasyon yapmaz; `QuickActionSheet` açar. Tab sırası: Anasayfa | Yemek | [FAB] | Egzersiz | İlerleme | Profil.

### State Management (Zustand)

- `store/authStore.ts` — `session`, `user`, `profile`; Supabase auth state'ini dinler
- `store/nutritionStore.ts` — `foodLogs`, `waterLogs`, `selectedDate`; `getExerciseBuffer(goal)` ile egzersiz tamponu hesabı (eat-back mantığı burada)
- `store/exerciseStore.ts` — `todayExercises`; `getEpocRange()`, `getWaterBonus()`, `getEatBackBudget(goal)` getter'ları; loglarda EPOC/su metadata'sı tutulur
- `store/activityStore.ts` — adım sayısı, mesafe, aktif dakika (pedometer'dan)
- `store/chatStore.ts` — FitBot konuşma geçmişi

### Backend (Supabase)

`lib/supabase.ts` — Supabase client'ı. Expo SecureStore'un 2048 byte limitini aşmak için session token'ları chunk'lara bölünür.

Supabase tablolar (`types/database.ts`):

- `profiles` — kullanıcı metrikleri + hedefler. v2 bilimsel alanları: `body_fat_band`, `body_fat_percentage`, `occupational_activity`, `exercise_frequency`, `ttm_stage`, `scoff_answers`, `scoff_score`, `medical_conditions`, `safety_flags`, `bmr_formula`
- `foods` — besin veritabanı (`name_tr` Türkçe isim içerir, `is_turkish` bayrağı var)
- `food_logs` — öğüne göre yemek kayıtları + motor metadata: `cooking_method`, `texture`, `composition_entry_id`, `engine_confidence` (`high|medium|low`), `engine_factors` (jsonb: `{density, yield, hidden}`)
- `exercise_logs` — egzersiz kayıtları + bilimsel metadata (v2): `epoc_min_kcal`, `epoc_max_kcal`, `total_kcal_min`, `total_kcal_max`, `water_bonus_ml`, `electrolytes_warning`, `corrected_met`, `chrono_warning`
- `weight_logs`, `water_logs`, `body_measurements` — takip verileri
- `chat_messages` — FitBot konuşma geçmişi

**Şema değişiklikleri için:** `data/` altında SQL migration dosyaları var. Yeni alan eklerken hem SQL migration'ı yaz hem `types/database.ts`'i elle güncelle (otomatik üretim yok).

### AI (Google Gemini 2.5 Flash)

`lib/gemini.ts` — tüm fonksiyonlar:

- `recognizeMealFromImage(base64, userHint?)` — fotoğraf → `DetectedFoodItem[]`. **Önemli (v2):** Gemini yalnızca tanıma + fiziksel metadata üretir (`cookingMethod`, `texture`, `hiddenSauceProb`, `referenceObject`, `occlusionRatio`, `ingredientBreakdown`). Kalori/makro hesabı `lib/nutritionEngine.ts` içinde yapılır; eski `calories/protein/carbs/fat` alanları opsiyonel olarak tutulur ve **yalnızca kompozisyon eşleşmediğinde fallback** olarak kullanılır.
- `generateAnalysisQuestions(items)`, `refineAnalysisWithAnswers(items, questions, answers)` — QA döngüsü
- `estimateNutritionFromText(params)` — metin açıklamasından besin tahmini (motor fallback'i)
- `generateMealName(foodNames)` — öğün için espritüel Türkçe isim; `AsyncStorage` key `fitbite_meal_names` ile kalıcılaştırılır
- `buildSystemPrompt(profile)` — TTM evresi + safety flags entegre sistem promptu

Tüm AI yanıtları Türkçe. `DIETITIAN_SYSTEM_PROMPT` tüm prompt'lara prefix olarak eklenir. `DetectedFoodItem` tipi `types/nutrition.ts` içinde; `gemini.ts` geriye uyumluluk için re-export eder.

### Bilimsel Besin Motoru (deterministik hesap zinciri)

Fotoğraftan gelen `DetectedFoodItem` → `lib/nutritionEngine.ts` → `EngineOutput`. Hesap formülü:

```
final_kcal = composition_per100g × user_grams × density(texture)
           × yield(cookingMethod, category) × (1 + hidden(cookingMethod, sauceProb))
```

- `lib/foodComposition.ts` — TürKomp + USDA FDC kürasyonu, ~50 yaygın Türk gıdası. `form: 'raw'` ise `yield` uygulanır; `'cooked'` ise atlanır.
- `lib/foodMatcher.ts` — Türkçe normalize → exact → sinonim → substring → token Jaccard. Eşik **0.85**; altı `null` döner ve motor Gemini fallback'ine düşer.
- `lib/nutritionEngine.ts` — `compute({ detection, userGrams })` + `estimateForManualInput(name, grams, cookingMethod?)`. `ingredientBreakdown` varsa her bileşeni ayrı çalıştırıp toplar.
- `lib/nutritionPolicy.ts` — SCOFF positive ise kalori mesajları suppress edilir; `breakdownCopy(tone, ...)` TTM evresine göre tonlu metin üretir.

**Yeni UI akışında kalori tahminlemek gerekirse:** önce `estimateForManualInput(name, grams)` (kompozisyon eşleştirmesi); `null` dönerse Gemini fallback (`estimateNutritionFromText`). Fotoğraftan gelen yemekler için kalori **asla** LLM'den gelmez.

### Bilimsel Egzersiz Motoru

`lib/exerciseEngine.ts` — Ainsworth Kompendiyumu (2011) tabanlı deterministik hesap zinciri:

```
RMR = Harris-Benedict(kg, cm, yaş, cinsiyet)           # bireysel metabolizma
correctedMET = standardMET × (RMR_ml / 3.5)           # Byrne yöntemi
kcalNet = (correctedMET − 1) × kg × (dk / 60)         # Net MET (double-count önleme)
epocRange = kcalNet × EPOC_TABLE[group][intensity]     # Borsheim & Bahr (2003)
waterBonus = 250 + ⌊(dk−30)/30⌋×150 + intensityBonus  # ACSM (2007)
```

- `ExerciseInput` → `ExerciseOutput`: `kcalNet`, `epocRange [min,max]`, `totalKcalRange`, `waterBonusML`, `electrolytesWarning` (60dk+ yoğun), `correctedMet`, `chronoWarning` (20:00+, Vahlhaus 2024)
- EPOC katsayıları cinsiyete göre ayrışan MET eşikleriyle (OT Dude 2024) 18 hücrelik tablo kullanır
- EPOC UI'da tek sayı değil **aralık** gösterilir (+32–46 kcal)

`lib/constants.ts` — `EXERCISE_CATALOG` (32 egzersiz, 6 grup, Ainsworth kodları) + `EXERCISE_GROUP_LABELS`. Eski `EXERCISE_CATEGORIES` hâlâ var — eski kodu bozmamak için silinmedi; yeni kod `EXERCISE_CATALOG` kullanır.

**Egzersiz kalori eat-back stratejisi:**

- Kilo verme hedefi: `totalKcalMin × 0.5` (MET tahmin hatası payı, Jakicic 2019)
- Koruma/alma hedefi: `totalKcalMin × 1.0`
- Gece 20:00+ egzersiz → chrono-nutrition uyarısı (insülin duyarlılığı riski)
- Dashboard'da hedef değişmez; "tampon" ayrı banner olarak gösterilir

`components/exercise/ExerciseBreakdownSheet.tsx` — NutritionBreakdownSheet pattern'i: 5 adımlı hesap zinciri, kaynak referansları (kullanıcı güven için "Nasıl hesaplandı?" butonu).

### Fotoğraf Akışı (food-log → analiz → motor → DB)

1. Kullanıcı fotoğraf seçer → `base64` `pendingBase64` state'ine alınır
2. Hint prompt modal (opsiyonel)
3. `recognizeMealFromImage(base64, hint)` → `DetectedFoodItem[]`
4. `PhotoMealReviewModal` veya `FoodLogFlow` açılır; motor `useMemo` ile cache'lenir
5. Kullanıcı `NutritionBreakdownSheet`'i açabilir; pişirme yöntemi/doku chip'leriyle canlı güncelleme
6. `runBackgroundSave` → `food_logs`'a makrolar + motor metadata yazılır

Bileşenler: `FoodPhotoModal` (eski tekil), `PhotoMealReviewModal` (çoklu review), `FoodLogFlow` (6-adım modal akış), `NutritionBreakdownSheet`, `MealPhotoDetailModal`.

### Diğer Lib Dosyaları

- `lib/nutrition.ts` — günlük düzey: dual BMR, TDEE, AMDR, `calculateScoffScore`, safety flags. Kadın min 1200, erkek min 1500 kcal. Safety copy'leri `lib/safetyCopy.ts`'te.
- `lib/openfoodfacts.ts` — barkod sorgulama
- `lib/storage.ts` — `uploadFoodPhoto(userId, base64)`: Supabase Storage `food-photos` bucket'ı
- `lib/healthConnect.ts` — Android Health Connect entegrasyonu (defansif lazy require, withTimeout sarmalayıcılar — aşağıda detayı)
- `lib/notifications.ts` — Su / öğün / adım / motivasyon / haftalık rapor bildirim zamanlayıcıları. expo-notifications lazy require ile yüklenir (Expo Go'da çakışmasın diye).
- `hooks/usePedometer.ts` — expo-sensors + Health Connect baseline okuma. `requestPermission` ARTIK BURADAN ÇAĞRILMIYOR (crash önlemi); sadece `getHealthConnectStepsToday()` kullanılır. 5dk'da bir Supabase'e yazar.

### Health Connect Entegrasyonu (kritik, dokunurken oku)

`react-native-health-connect` v3 native tarafta `MainActivity.onCreate`'de `**HealthConnectPermissionDelegate.setPermissionDelegate(this)`** çağrısını ZORUNLU kılar. Bu çağrı yoksa `requestPermission` Kotlin coroutine içinden `UninitializedPropertyAccessException` fırlatır ve **JS try/catch'i bypass ederek tüm uygulamayı çökertir**.

Çözüm üç parçalı:

1. `**plugins/withHealthConnectSetup.js`** — custom config plugin:
  - `AndroidManifest.xml`'e `<queries><package healthdata/></queries>` ekler (Android 11+ visibility)
  - `MainActivity.kt`'a `setPermissionDelegate(this)` çağrısı ekler
2. `**app.json` plugins**: `"react-native-health-connect"` (intent-filter için) + `"./plugins/withHealthConnectSetup"` aynı dizide
3. `**lib/healthConnect.ts`** defansif:
  - Lazy `require('react-native-health-connect')` (Platform guard'lı)
  - Tüm async çağrılar `withTimeout` ile sarılı (delegate gelmezse hang etmesin)
  - `**requestHealthConnectPermissions()` SADECE kullanıcı manuel tetikleyince çağrılır** (Profil → Health Connect satırı). Cold-start akışında ASLA otomatik tetiklenmemeli.

Profil sayfasında `hcState: 'checking' | 'unavailable' | 'available' | 'connected'` durumu gösterilir; tıklayınca duruma göre Play Store'a yönlendirir, izin diyaloğu açar veya HC uygulamasına gider.

**Yeni RNHC API'si kullanırken**: önce `isHealthConnectAvailable()` kontrol et, sonra `withTimeout`'lu çağrı yap, asla cold-start akışına ekleme.

### Onboarding

`app/onboarding/` + `components/onboarding/` — 24 adımlı sihirbaz, 4 story screen. Bilimsel veri toplama adımları: `TTMStage`, `BodyFatBand`, `OccupationalActivity`, `ExerciseFrequency`, `MedicalConditions`, `ScoffScreening`, `WeightGoalRate`. `ScientificPlanPreview` final adım — blocker varsa hedef `maintain`'e indirilir.

### Design Tokens

`lib/constants.ts` — `Colors`, `Spacing`, `BorderRadius`, `FontSize`. `StyleSheet.create` + bu tokenlar zorunlu; satır içi stil kullanılmaz.

`Colors.primary` = `#2D6A4F` (yeşil), `Colors.accent` = `#E85D3C` (terracotta). Arka plan: sıcak parşömen (`#F2EFE6`).

## Key Conventions

- Tüm UI metinleri Türkçedir.
- Tip merkezi: domain tipleri `types/index.ts`'den re-export edilir; Supabase şema tipleri `types/database.ts`'te (elle bakımlı); motor/besin tipleri `types/nutrition.ts`'te; egzersiz engine tipleri `lib/exerciseEngine.ts`'ten doğrudan export edilir.
- Şema değişikliğinde: `data/` altına SQL migration yaz + `types/database.ts`'i elle güncelle.
- `store/nutritionStore.ts`'te `addFoodLog` parametresi `Insert` tipinden `Omit` ile opsiyonel alanlar bırakılır; yeni motor alanları eklendikçe aynı pattern izlenir.
- Test çerçevesi yok; saf fonksiyonlar için `lib/__demo/*.ts` altına `tsx` ile çalışan smoke senaryolar yazılır. Tüm değişikliklerden sonra `npx tsc --noEmit` exit 0 olmalı.
- Expo Router'da `useRouter` + `useSegments` ile programatik yönlendirme. `expo-notifications` su hatırlatıcıları için (`lib/notifications.ts`).
- `MealType` = `'breakfast' | 'lunch' | 'dinner' | 'snack'` (`lib/constants.ts`).
- Yeni egzersiz bileşenlerinde `EXERCISE_CATALOG` kullan (eski `EXERCISE_CATEGORIES` değil).
- **Native paket eklerken**: önce `app.plugin.js`'i kontrol et; yetersizse `plugins/` altında custom plugin yaz. `withHealthConnectSetup.js`'i pattern olarak kullan (`withMainActivity` + `withAndroidManifest`).
- **Asset boyutları**: `assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png` 1024×1024'ten büyük olmamalı, `assets/favicon.png` 256×256. Daha büyük PNG'ler splash screen decoding'inde OOM riskine yol açar (canlı örneği: 2048² 5MB icon'lar uygulamayı çökertmişti).
- **Cold-start akışına yeni native paket çağrısı eklerken**: `_layout.tsx`, `(tabs)/index.tsx`, `usePedometer` gibi giriş noktalarına permission istemi koymadan önce paketin native exception handling'ini incele. Coroutine içinde unwrap edilmeyen exception'lar JS try/catch ile yakalanmaz; defansif lazy require + `withTimeout` pattern'i kullan (örnek: `lib/healthConnect.ts`).

