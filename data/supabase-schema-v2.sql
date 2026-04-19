-- =============================================================================
-- FitBite — Bilimsel Yeniden Yapılandırma (v2 şema eklentileri)
-- =============================================================================
-- Supabase SQL Editor'de çalıştır. İlk şemadan (supabase-schema.sql) sonra.
-- Idempotent — güvenle tekrar çalıştırılabilir.
--
-- Eklenen alanlar:
--  • body_fat_band / body_fat_percentage  → Katch-McArdle BMR için
--  • occupational_activity / exercise_frequency → combined PAL matrix için
--  • ttm_stage → Transtheoretical Model (AI tonu)
--  • scoff_answers / scoff_score → yeme bozukluğu taraması
--  • medical_conditions → kronik hastalık / hamilelik / emzirme
--  • safety_flags → hesaplanmış güvenlik durumu (denormalize)
--  • bmr_formula → hangi BMR formülü kullanıldı (audit)
-- =============================================================================

-- Vücut kompozisyonu
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_fat_band TEXT
  CHECK (body_fat_band IS NULL OR body_fat_band IN ('lean','athletic','average','high'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_fat_percentage NUMERIC(4,1)
  CHECK (body_fat_percentage IS NULL OR (body_fat_percentage > 3 AND body_fat_percentage < 60));

-- Combined PAL girdileri (eski activity_level korunuyor — fallback için)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupational_activity TEXT
  CHECK (occupational_activity IS NULL OR occupational_activity IN ('desk','light','moderate','heavy'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exercise_frequency TEXT
  CHECK (exercise_frequency IS NULL OR exercise_frequency IN ('none','low','moderate','high','athlete'));

-- Transtheoretical Model aşaması
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ttm_stage TEXT
  CHECK (ttm_stage IS NULL OR ttm_stage IN ('precontemplation','contemplation','preparation','action','maintenance'));

-- SCOFF taraması (yeme bozukluğu)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scoff_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scoff_score SMALLINT
  CHECK (scoff_score IS NULL OR (scoff_score >= 0 AND scoff_score <= 5));

-- Tıbbi durum (liste)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions TEXT[] DEFAULT '{}';

-- Güvenlik bayrakları (AI promptu ve dashboard için hızlı erişim)
-- Şekil: { canProceed: boolean, blockers: string[], warnings: string[] }
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS safety_flags JSONB DEFAULT '{}'::jsonb;

-- BMR formül denetim alanı
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bmr_formula TEXT
  CHECK (bmr_formula IS NULL OR bmr_formula IN ('mifflin','katch_mcardle'));

-- Mevcut kayıtlarda NULL olan jsonb/array alanları boş default'a taşı
UPDATE profiles SET medical_conditions = '{}' WHERE medical_conditions IS NULL;
UPDATE profiles SET scoff_answers = '{}'::jsonb WHERE scoff_answers IS NULL;
UPDATE profiles SET safety_flags = '{}'::jsonb WHERE safety_flags IS NULL;

-- diet_type constraint genişletmesi
-- Orijinal şemada sadece 5 değer vardı; uygulama 10 değerli DIET_TYPES kullanıyor.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_diet_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_diet_type_check
  CHECK (diet_type IN (
    'normal', 'vegetarian', 'vegan', 'gluten_free', 'lactose_free',
    'pescatarian', 'keto', 'paleo', 'mediterranean', 'flexitarian'
  ));
