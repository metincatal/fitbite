import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Expo SecureStore — 2048 byte limitini aşmak için chunked storage
const CHUNK_SIZE = 1900;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const numChunksStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (!numChunksStr) return SecureStore.getItemAsync(key);
    const numChunks = parseInt(numChunksStr, 10);
    let value = '';
    for (let i = 0; i < numChunks; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}.chunk.${i}`);
      value += chunk ?? '';
    }
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(`${key}.chunks`);
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}.chunk.${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(`${key}.chunks`, chunks.length.toString());
    await SecureStore.deleteItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    const numChunksStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (numChunksStr) {
      const numChunks = parseInt(numChunksStr, 10);
      for (let i = 0; i < numChunks; i++) {
        await SecureStore.deleteItemAsync(`${key}.chunk.${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}.chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
