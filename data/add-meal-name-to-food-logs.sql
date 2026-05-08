-- Öğün esprit isimlerini food_logs tablosunda kalıcı tut
ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS meal_name text;
