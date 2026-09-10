import { defineRouting } from 'next-intl/routing'

export const locales = ['th', 'en'] as const
export type Locale = (typeof locales)[number]

export const localeLabels: Record<Locale, { short: string; full: string }> = {
  th: { short: 'ไทย', full: 'ภาษาไทย' },
  en: { short: 'EN', full: 'English' },
}

export const routing = defineRouting({
  locales,
  defaultLocale: 'th',
  // Thai lives at the root; English uses /en. Legacy /th URLs redirect automatically.
  localePrefix: 'as-needed',
  localeDetection: false,
})

export function localizedPath(locale: Locale, path = ''): string {
  const suffix = path === '/' ? '' : path
  return `${locale === routing.defaultLocale ? '' : `/${locale}`}${suffix}` || '/'
}
