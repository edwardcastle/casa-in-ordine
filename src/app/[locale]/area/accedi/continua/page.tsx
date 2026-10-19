import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { confirmClientSignIn } from '@/actions/area';
import AreaTopBand from '@/components/area/AreaTopBand';
import { routing } from '@/i18n/routing';
import { SIGNIN_TOKEN_COOKIE } from '@/lib/area/signin-cookie';

// Depends on the sign-in cookie, so it is rendered per request and never indexed.
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
 * The page the emailed link continues to, after the route at `../conferma`
 * has moved the token into a cookie.
 *
 * Opening it only reads, and its URL and HTML carry no token. The token is
 * spent by the form below (which reads the cookie on the server), because mail
 * scanners and link previews open every URL in an email, and spending it
 * earlier would leave the client with a link that has already been used.
 */
export default async function ConfirmSignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Only checks that a link was opened in this browser; the value stays out of the page.
  if (!(await cookies()).get(SIGNIN_TOKEN_COOKIE)?.value) redirect(`/${locale}/area/accedi?error=link`);

  const t = await getTranslations({ locale, namespace: 'area.confirm' });

  return (
    <>
      <AreaTopBand />
      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <h1 className="mb-3 text-3xl font-semibold text-foreground">{t('title')}</h1>
        <p className="mb-8 text-gray-600">{t('body')}</p>

        <form action={confirmClientSignIn}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light"
          >
            {t('submit')}
          </button>
        </form>
      </section>
    </>
  );
}
