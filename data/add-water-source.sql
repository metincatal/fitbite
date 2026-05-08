-- Öğün fotoğrafından otomatik eklenen su kayıtlarını işaretlemek için source kolonu
ALTER TABLE water_logs ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
