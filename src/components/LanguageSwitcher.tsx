'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';

const localeNames: Record<string, string> = {
  it: 'IT',
  en: 'EN',
  es: 'ES',
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
            locale === loc
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-secondary-light hover:text-primary'
          }`}
          aria-label={`Switch to ${localeNames[loc]}`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
