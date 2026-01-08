/**
 * useTranslations hook for PriceWaze i18n
 *
 * Usage:
 *   const t = useTranslations('common');
 *   return <p>{t.loading}</p>;
 *
 * Or with multiple namespaces:
 *   const { common, properties } = useTranslations(['common', 'properties']);
 */

import { useMemo } from 'react';
import { getMarketConfig } from '@/config/market';
import { translations, type Locale, type TranslationNamespace } from './translations';

/**
 * Get current locale from market configuration
 * Returns 'es' for Spanish locales, 'en' for others
 */
export function getLocale(): Locale {
  const market = getMarketConfig();
  const locale = market.currency.locale;
  // Spanish locales: es-DO, es-MX, es-ES, es-CO
  if (locale.startsWith('es')) return 'es';
  return 'en';
}

/**
 * Get translations for a single namespace
 */
export function useTranslations<T extends TranslationNamespace>(namespace: T) {
  const locale = getLocale();
  return useMemo(() => translations[locale][namespace], [locale, namespace]);
}

/**
 * Get translations for multiple namespaces
 */
export function useMultiTranslations<T extends TranslationNamespace>(
  namespaces: T[]
): Record<T, (typeof translations)['en'][T]> {
  const locale = getLocale();
  return useMemo(() => {
    const result = {} as Record<T, (typeof translations)['en'][T]>;
    for (const ns of namespaces) {
      result[ns] = translations[locale][ns];
    }
    return result;
  }, [locale, namespaces]);
}

/**
 * Get all translations for current locale (use sparingly)
 */
export function useAllTranslations() {
  const locale = getLocale();
  return useMemo(() => translations[locale], [locale]);
}

/**
 * Type-safe translation getter function (non-hook version for server components or utilities)
 */
export function getTranslations<T extends TranslationNamespace>(namespace: T) {
  const locale = getLocale();
  return translations[locale][namespace];
}

export default useTranslations;
