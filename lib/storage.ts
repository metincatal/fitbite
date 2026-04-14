import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'food-photos';

export async function uploadFoodPhoto(userId: string, base64: string): Promise<string | null> {
  const fileName = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Fotograf yukleme hatasi:', error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
