-- FitBite Egzersiz Motoru v2 — Bilimsel Metadata Kolonları
-- Ainsworth Kompendiyumu (2011) · EPOC: Borsheim & Bahr (2003) · Su: ACSM (2007)
-- Migration: exercise_logs tablosuna yeni kolonlar ekle

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS epoc_min_kcal INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS epoc_max_kcal INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS total_kcal_min INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS total_kcal_max INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS water_bonus_ml INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS electrolytes_warning BOOLEAN DEFAULT FALSE;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS corrected_met NUMERIC(4,2);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS chrono_warning BOOLEAN DEFAULT FALSE;

-- Geriye dönük: eski kayıtlar için total_kcal alanlarını calories_burned ile doldur
UPDATE exercise_logs
SET
  total_kcal_min = calories_burned,
  total_kcal_max = calories_burned
WHERE total_kcal_min IS NULL;

-- Index: kullanıcı bazlı egzersiz motoru sorguları için
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date
  ON exercise_logs (user_id, logged_at DESC);

-- RLS: Mevcut politikalar korunur (ayrıca eklemek gerekmez)
-- Yeni kolonlar mevcut RLS kapsamına dahil olur.
