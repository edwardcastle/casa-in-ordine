import { headers } from 'next/headers';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { signOutClient } from '@/actions/area';
import AreaTopBand from '@/components/area/AreaTopBand';
import { currentClient } from '@/lib/area/session';
import { PATH_HEADER, signInPath } from '@/lib/area/next-path';
import { routing } from '@/i18n/routing';

// The guard and the shell read the session cookie.
export const dynamic = 'force-dynamic';

/**
 * The guard and the shell of the signed-in area.
 *
 * Sign-in, confirmation and sign-out live outside this group so the guard
 * never wraps the pages that exist to get past it. Every page below is checked
 * here, once, rather than each one remembering to check.
 */
export default async function PrivateAreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const client = await currentClient();
  // The layout cannot see the page's path, so the proxy passes it along.
  if (!client) redirect(signInPath(locale, (await headers()).get(PATH_HEADER)));

  const t = await getTranslations({ locale, namespace: 'area.shell' });

  return (
    <div className="bg-secondary-light">
      <AreaTopBand />
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 md:pt-10">
        <div className="mb-6 flex justify-end">
          {/* A POST: a link would be prefetched, and a prefetch must not sign anyone out. */}
          <form action={signOutClient}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-full border border-secondary-dark bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
        {children}
      </div>
    </div>
  );
}
