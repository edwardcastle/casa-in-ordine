'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { routing } from '@/i18n/routing';

const localeNames: Record<string, string> = {
  it: 'IT',
  en: 'EN',
  es: 'ES',
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  // Swap the locale segment, preserving the rest of the path so /en/about ->
  // /it/about (not the homepage). Rendered as real <a> links so the locale
  // variants are crawlable, not just JS-driven router pushes.
  function localeHref(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/') || `/${newLocale}`;
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={localeHref(loc)}
          hrefLang={loc}
          aria-current={locale === loc ? 'true' : undefined}
          className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
            locale === loc
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-secondary-light hover:text-primary'
          }`}
          aria-label={`Switch to ${localeNames[loc]}`}
        >
          {localeNames[loc]}
        </Link>
      ))}
    </div>
  );
}
