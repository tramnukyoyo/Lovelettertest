/**
 * Translation Utilities
 * Simple translation system for i18n support
 */

import { en } from '../locales/en';
import type { Translations } from '../locales/en';
import { de } from '../locales/de';
import { es } from '../locales/es';
import { ptBR } from '../locales/pt-BR';
import { ptPT } from '../locales/pt-PT';
import { zhHant } from '../locales/zh-Hant';
import { STORAGE_KEYS } from '../config/storageKeys';

export type Language = 'en' | 'de' | 'es' | 'pt-BR' | 'pt-PT' | 'zh-Hant';

const translations: Record<Language, Translations> = {
  en,
  de,
  es,
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'zh-Hant': zhHant,
};

// ---------------------------------------------------------------------------
// Shared language storage keys.
//
// Prime Suspect ships TWO translation systems (this shell util + the in-game
// `gameTranslations.ts`). They previously read/wrote DIFFERENT localStorage
// keys, so changing the language in one half of the UI left the other half in
// the old language. Both utils now read the SAME precedence and write ALL of
// these keys so the whole UI switches together.
//   - `gamebuddies-language`  : shared GameBuddies.io platform language
//   - `heartsgambit-language` : legacy in-game key (gameTranslations.ts)
//   - primesuspect_language   : this shell's key (STORAGE_KEYS.LOCAL.LANGUAGE)
// ---------------------------------------------------------------------------
const GAMEBUDDIES_LANGUAGE_KEY = 'gamebuddies-language';
const HEARTSGAMBIT_LANGUAGE_KEY = 'heartsgambit-language';
const SHELL_LANGUAGE_KEY = STORAGE_KEYS.LOCAL.LANGUAGE; // 'primesuspect_language'

const SUPPORTED_LANGUAGES: Language[] = ['en', 'de', 'es', 'pt-BR', 'pt-PT', 'zh-Hant'];
function isSupportedLanguage(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

/**
 * Get current language from localStorage.
 * Precedence matches gameTranslations.getCurrentLanguage() so both systems
 * always resolve to the same language regardless of which key was set last.
 */
export function getCurrentLanguage(): Language {
  // 1. Shared GameBuddies.io platform language
  const platformLang = localStorage.getItem(GAMEBUDDIES_LANGUAGE_KEY);
  if (isSupportedLanguage(platformLang)) {
    return platformLang;
  }
  // 2. Legacy in-game key
  const heartsLang = localStorage.getItem(HEARTSGAMBIT_LANGUAGE_KEY);
  if (isSupportedLanguage(heartsLang)) {
    return heartsLang;
  }
  // 3. This shell's key
  const shellLang = localStorage.getItem(SHELL_LANGUAGE_KEY);
  if (isSupportedLanguage(shellLang)) {
    return shellLang;
  }

  // 4. Detect browser language
  const browserLang = navigator.language;
  const lower = browserLang.toLowerCase();
  if (lower.includes('hant') || lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo')) {
    return 'zh-Hant';
  }
  if (browserLang === 'pt-BR' || browserLang.startsWith('pt-BR')) {
    return 'pt-BR';
  }
  if (browserLang === 'pt-PT' || browserLang === 'pt' || browserLang.startsWith('pt-')) {
    return 'pt-PT';
  }
  const langBase = browserLang.split('-')[0];
  if (langBase === 'de') {
    return 'de';
  }
  if (langBase === 'es') {
    return 'es';
  }

  return 'en';
}

/**
 * Set current language. Writes ALL three language keys so both the shell and
 * the in-game translation systems pick up the change, then dispatches the
 * `languagechange` event the components listen to.
 */
export function setCurrentLanguage(lang: Language): void {
  const previous = getCurrentLanguage();
  localStorage.setItem(SHELL_LANGUAGE_KEY, lang);
  localStorage.setItem(HEARTSGAMBIT_LANGUAGE_KEY, lang);
  localStorage.setItem(GAMEBUDDIES_LANGUAGE_KEY, lang);
  if (previous !== lang) {
    window.dispatchEvent(new Event('languagechange'));
  }
}

/**
 * Get translations for current language
 */
export function getTranslations(): Translations {
  return translations[getCurrentLanguage()];
}

/**
 * Translate a key with optional interpolation
 * Usage: t('lobby.minPlayersRequired', { min: 2 })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const trans = getTranslations();
  const keys = key.split('.');

  let value: unknown = trans;
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key is not a string: ${key}`);
    return key;
  }

  // Interpolate params
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`;
    });
  }

  return value;
}
