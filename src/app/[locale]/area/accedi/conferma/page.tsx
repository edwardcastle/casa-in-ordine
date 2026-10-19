import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { confirmClientSignIn } from '@/actions/area';
import { routing } from '@/i18n/routing';

// The token is in the URL, so this must never be cached or indexed.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'area.confirm' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * The landing page of the emailed link.
 *
 * Opening it only reads. The token is spent by the form below, because mail
 * scanners and link previews open every URL in an email, and spending it here
 * would leave the client with a link that has already been used.
 */
export default async function ConfirmSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { token = '' } = await searchParams;
  if (!token) redirect(`/${locale}/area/accedi?error=link`);

  const t = await getTranslations({ locale, namespace: 'area.confirm' });

  return (
    <main id="main" className="mx-auto min-h-screen max-w-xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="mb-3 text-3xl font-semibold text-foreground">{t('title')}</h1>
      <p className="mb-8 text-gray-600">{t('body')}</p>

      <form action={confirmClientSignIn}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light"
        >
          {t('submit')}
        </button>
      </form>
    </main>
  );
}
