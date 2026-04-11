import { createClient } from '@supabase/supabase-js';
import { turkishFoods } from './turkish-foods';

const supabaseUrl = 'https://yjnmiklitzfciirxvukk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log(`🌱 ${turkishFoods.length} yemek yükleniyor...`);

  const { error } = await supabase.from('foods').insert(
    turkishFoods.map((f) => ({ ...f, created_by: null }))
  );

  if (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }

  console.log('✅ Seed tamamlandı!');
}

seed();
