/**
 * PriceWaze i18n System
 *
 * Centralized internationalization for the application.
 *
 * Quick Start:
 * ```typescript
 * import { useTranslations } from '@/lib/i18n';
 *
 * export function MyComponent() {
 *   const t = useTranslations('common');
 *   return <button>{t.save}</button>;
 * }
 * ```
 *
 * Available namespaces:
 * - common: Generic strings (loading, save, cancel, etc.)
 * - navigation: Sidebar and nav items
 * - properties: Property-related strings
 * - alerts: Alerts page
 * - offers: Offers and negotiations
 * - pricing: Pricing analysis
 * - routes: Visit routes
 * - gamification: Points, badges, achievements
 * - copilot: AI assistant
 * - errors: Error messages
 */

export {
  useTranslations,
  useMultiTranslations,
  useAllTranslations,
  getTranslations,
  getLocale,
} from './useTranslations';

export { translations, type Locale, type TranslationNamespace } from './translations';
