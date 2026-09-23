import { en, type TranslationSchema } from './en';
import { kn } from './kn';
import { hi } from './hi';

export type Language = 'en' | 'kn' | 'hi';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'kn', label: 'ಕನ್ನಡ', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const translations: Record<Language, any> = {
  en,
  kn,
  hi,
};

export { en, kn, hi, type TranslationSchema };
