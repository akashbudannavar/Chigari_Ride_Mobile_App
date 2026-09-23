import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type Language,
  type LanguageOption,
  SUPPORTED_LANGUAGES,
  translations,
  en,
} from '@/translations';

const STORAGE_KEY = '@chigari_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load persisted language on startup
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'kn' || saved === 'hi')) {
          setLanguageState(saved as Language);
        }
      } catch (err) {
        // Fallback to default 'en'
      }
    })();
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    if (newLang === 'en' || newLang === 'kn' || newLang === 'hi') {
      setLanguageState(newLang);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, newLang);
      } catch (err) {
        // Continue even if storage fails
      }
    }
  }, []);

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      // 1. Try active language dictionary
      let text = getNestedValue(translations[language], keyPath);

      // 2. Fallback to English dictionary
      if (!text && language !== 'en') {
        text = getNestedValue(en, keyPath);
      }

      let resolvedText: string = text || '';

      // 3. Fallback to last segment of key or key itself if missing
      if (!resolvedText) {
        const parts = keyPath.split('.');
        resolvedText = parts[parts.length - 1] || keyPath;
      }

      // 4. Interpolate parameters like {amount}, {distance}, {needed}, etc.
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          resolvedText = resolvedText.split(`{${k}}`).join(String(v));
        });
      }

      return resolvedText;
    },
    [language]
  );

  const currentLanguageOption = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((opt) => opt.code === language) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageOption,
    }),
    [language, setLanguage, t, currentLanguageOption]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
