import { routing } from '@/i18n/routing';

type Locale = (typeof routing.locales)[number];

/**
 * The supported locale an `Accept-Language` header prefers, else the default.
 *
 * Used where there is no locale in the URL (the file download route, which
 * lives under /api). Honours q-values, matches on the primary subtag
 * ("es-MX" is Spanish), and ignores `q=0` and anything we do not serve.
 */
export function bestLocale(header: string | null | undefined): Locale {
  if (!header) return routing.defaultLocale;

  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;
      return { primary: tag.trim().toLowerCase().split('-')[0], weight, index };
    })
    .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const { primary } of ranked) {
    const match = routing.locales.find((locale) => locale === primary);
    if (match) return match;
  }
  return routing.defaultLocale;
}
