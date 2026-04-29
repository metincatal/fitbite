-- Bilimsel besin motoru için food_logs metadata alanları (v2.5).
-- Eski kayıtlar etkilenmez (NULL olarak kalır); yeni fotoğraf akışı bu alanları doldurur.
-- Audit: bir kalori değerinin hangi yöntemle hesaplandığı geri çıkarılabilir.
--
-- Çalıştırmadan önce: zaten eklendiyse hata vermesin diye IF NOT EXISTS kullanıyoruz.

ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS cooking_method TEXT,
  ADD COLUMN IF NOT EXISTS texture TEXT,
  ADD COLUMN IF NOT EXISTS composition_entry_id TEXT,
  ADD COLUMN IF NOT EXISTS engine_confidence TEXT
    CHECK (engine_confidence IN ('high', 'medium', 'low') OR engine_confidence IS NULL),
  ADD COLUMN IF NOT EXISTS engine_factors JSONB;

-- İsteğe bağlı index — düşük güvenli kayıtları audit için filtrelemek isteyenler için.
CREATE INDEX IF NOT EXISTS idx_food_logs_engine_confidence
  ON food_logs (engine_confidence)
  WHERE engine_confidence IS NOT NULL;

COMMENT ON COLUMN food_logs.cooking_method IS
  'Pişirme yöntemi: raw|boiled|grilled|fried|deep_fried|baked|steamed|sauteed|unknown';
COMMENT ON COLUMN food_logs.texture IS
  'Görsel doku: fluffy|dense|granular|liquid|amorphous';
COMMENT ON COLUMN food_logs.composition_entry_id IS
  'lib/foodComposition.ts içindeki entry id''si (örn. rice_white_raw); NULL ise Gemini fallback';
COMMENT ON COLUMN food_logs.engine_confidence IS
  'Motor güven seviyesi: tanıma * eşleşme * (1-occlusion) min''i';
COMMENT ON COLUMN food_logs.engine_factors IS
  'JSON: { density, yield, hidden } — kalori hesabının çarpanları';
