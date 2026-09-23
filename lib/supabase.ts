import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Warning: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined. Initialized with fallback credentials.'
  );
}

/**
 * Expo SecureStore storage adapter for Supabase session persistence.
 * Uses hardware-backed encrypted storage on Android and iOS Keychain.
 * Safely falls back to localStorage on Web.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch {
        return null;
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('[SecureStore] Failed to retrieve key:', key, err);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('[SecureStore] Failed to store key:', key, err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('[SecureStore] Failed to delete key:', key, err);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

