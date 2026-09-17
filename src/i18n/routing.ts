/**
 * OPF — next-intl routing stub
 * Minimal config — kept for compatibility with existing imports.
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'es', 'en'],
  defaultLocale: 'fr',
  localeDetection: false,
});
