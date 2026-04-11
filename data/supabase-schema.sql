-- FitBite Supabase Veritabanı Şeması
-- Supabase SQL Editor'de çalıştır

-- ================================================================
-- 1. PROFIL TABLOSU
-- ================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  birth_date DATE NOT NULL,
  height_cm NUMERIC(5,1) NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) NOT NULL DEFAULT 'moderate',
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')) NOT NULL DEFAULT 'maintain',
  diet_type TEXT CHECK (diet_type IN ('normal', 'vegetarian', 'vegan', 'gluten_free', 'lactose_free')) NOT NULL DEFAULT 'normal',
  allergies TEXT[] DEFAULT '{}',
  daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
  daily_protein_goal INTEGER NOT NULL DEFAULT 100,
  daily_carbs_goal INTEGER NOT NULL DEFAULT 250,
  daily_fat_goal INTEGER NOT NULL DEFAULT 65,
  daily_water_goal_ml INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- 2. YEMEK VERİTABANI
-- ================================================================
CREATE TABLE IF NOT EXISTS foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  category TEXT NOT NULL,
  calories_per_100g NUMERIC(7,2) NOT NULL,
  protein NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber NUMERIC(6,2) NOT NULL DEFAULT 0,
  serving_size NUMERIC(6,1) NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  is_turkish BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Arama için index
CREATE INDEX IF NOT EXISTS foods_name_tr_idx ON foods USING gin(to_tsvector('turkish', name_tr));
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods USING gin(to_tsvector('english', name));

-- ================================================================
-- 3. GÜNLÜK YEMEk KAYDI
-- ================================================================
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_id UUID REFERENCES foods(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
  serving_amount NUMERIC(7,1) NOT NULL,
  calories NUMERIC(8,2) NOT NULL,
  protein NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat NUMERIC(7,2) NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON food_logs(user_id, logged_at);

-- ================================================================
-- 4. KİLO TAKİBİ
-- ================================================================
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weight_logs_user_idx ON weight_logs(user_id, logged_at);

-- ================================================================
-- 5. SU TAKİBİ
-- ================================================================
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_logs_user_date_idx ON water_logs(user_id, logged_at);

-- ================================================================
-- 6. AI SOHBET GEÇMİŞİ
-- ================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id, created_at);

-- ================================================================
-- 7. VÜCUT ÖLÇÜLERİ
-- ================================================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  chest_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ================================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Foods (herkes okuyabilir, sadece oluşturan düzenleyebilir)
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view foods" ON foods FOR SELECT USING (true);
CREATE POLICY "Users can insert custom foods" ON foods FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Food Logs
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own food logs" ON food_logs FOR ALL USING (auth.uid() = user_id);

-- Weight Logs
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own weight logs" ON weight_logs FOR ALL USING (auth.uid() = user_id);

-- Water Logs
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own water logs" ON water_logs FOR ALL USING (auth.uid() = user_id);

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- Body Measurements
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own measurements" ON body_measurements FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- 9. OTOMATİK updated_at TRİGGER
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
