import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { signOutClient } from '@/actions/area';
import AreaNav from '@/components/area/AreaNav';
import AreaTopBand from '@/components/area/AreaTopBand';
import { currentClient } from '@/lib/area/session';
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
  if (!client) redirect(`/${locale}/area/accedi`);

  const t = await getTranslations({ locale, namespace: 'area.shell' });

  return (
    <div className="bg-secondary-light">
      <AreaTopBand />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:flex md:gap-10 md:py-12 lg:px-8">
        <aside className="md:w-56 md:shrink-0">
          <div className="md:sticky md:top-32">
            <p className="mb-4 hidden text-xs font-semibold uppercase tracking-wide text-primary-dark md:block">
              {t('label')}
            </p>
            {/* A top bar on a phone, a sidebar from md up. */}
            <div className="flex items-center justify-between gap-2 border-b border-secondary-dark pb-3 md:flex-col md:items-stretch md:gap-6 md:border-b-0 md:pb-0">
              <AreaNav />
              {/* A POST: a link would be prefetched, and a prefetch must not sign anyone out. */}
              <form action={signOutClient}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-secondary-dark hover:text-primary-dark md:w-full md:text-left"
                >
                  {t('signOut')}
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="mt-6 min-w-0 flex-1 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
