-- =============================================
-- FitBite: Exercise Logs Table
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =============================================

-- 1. Tablo oluştur
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_type TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('low', 'moderate', 'high')),
    calories_burned INTEGER NOT NULL CHECK (calories_burned >= 0),
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date
    ON exercise_logs (user_id, logged_at DESC);

-- 3. RLS (Row Level Security) Aktifle
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can read own exercise logs"
    ON exercise_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise logs"
    ON exercise_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise logs"
    ON exercise_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise logs"
    ON exercise_logs FOR DELETE
    USING (auth.uid() = user_id);
