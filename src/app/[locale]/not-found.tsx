import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

// Locale-aware 404. Rendered inside [locale]/layout.tsx (which supplies
// <html lang={locale}> + NextIntlClientProvider) when a route under a locale
// calls notFound() — e.g. an unknown /en or /es blog slug — so the copy and
// home link match the visitor's locale instead of the Italian root fallback.
// Kept as a Server Component (next-intl's useTranslations/useLocale read the
// request locale) per the next-intl error-files guidance; the root
// app/not-found.tsx still handles truly locale-less paths.
export default function LocaleNotFound() {
  const locale = useLocale();
  const t = useTranslations('notFound');

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl font-semibold text-foreground mb-2">{t('title')}</p>
        <p className="text-gray-600 mb-8">{t('description')}</p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
