import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR/translation.json';
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';

export type SupportedLanguage = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; flag: string; label: string }[] = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', label: 'Português (Brasil)' },
  { code: 'en', name: 'English', flag: '🇺🇸', label: 'English' },
  { code: 'es', name: 'Español', flag: '🇪🇸', label: 'Español' },
];

export const LANGUAGE_STORAGE_KEY = 'labprox_language';

/**
 * Resolves the initial language based on:
 * 1. Saved localStorage preference
 * 2. Browser/Device language
 * 3. Default fallback 'pt-BR'
 */
export function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'pt-BR' || saved === 'en' || saved === 'es') {
      return saved as SupportedLanguage;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('pt')) return 'pt-BR';
      if (browserLang.startsWith('en')) return 'en';
      if (browserLang.startsWith('es')) return 'es';
    }
  } catch {
    // Fallback in case of sandboxed localStorage issues
  }

  return 'pt-BR';
}

const resources = {
  'pt-BR': { translation: ptBR },
  'en': { translation: en },
  'es': { translation: es },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Silent catch
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
