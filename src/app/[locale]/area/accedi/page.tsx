import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import ClientSignInForm from '@/components/ClientSignInForm';
import { currentClient } from '@/lib/area/session';
import { routing } from '@/i18n/routing';

// Depends on the session cookie and on `?error=`, so it is rendered per request.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'area.signin' });

  return {
    title: t('metaTitle'),
    // A sign-in page has nothing for a search engine, and the area behind it
    // is private.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ClientSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Someone who is already in has no use for this page.
  if (await currentClient()) redirect(`/${locale}/area`);

  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'area.signin' });

  return (
    <main id="main" className="mx-auto min-h-screen max-w-xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="mb-3 text-3xl font-semibold text-foreground">{t('title')}</h1>
      <p className="mb-8 text-gray-600">{t('intro')}</p>

      {error === 'link' && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {t('errors.link')}
        </p>
      )}

      <ClientSignInForm />
    </main>
  );
}
