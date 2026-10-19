import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import StatusBadge from '@/components/area/StatusBadge';
import TipList from '@/components/area/TipList';
import ZoneLabel from '@/components/area/ZoneLabel';
import { formatVisitDate } from '@/lib/area/format';
import { listProjects, listTips } from '@/lib/area/queries';
import { currentClient } from '@/lib/area/session';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'area.dashboard' });
  return { title: t('metaTitle') };
}

export default async function AreaDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The layout checks too, but a layout is not re-run on every in-app
  // navigation, and this page cannot show anything without a client.
  const client = await currentClient();
  if (!client) redirect(`/${locale}/area/accedi`);

  const t = await getTranslations({ locale, namespace: 'area.dashboard' });
  const [projects, tips] = await Promise.all([listProjects(client.id), listTips(locale as 'it' | 'en' | 'es', 3)]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="mb-2 text-3xl font-semibold text-foreground">
          {t('greeting', { name: client.name })}
        </h1>
        <p className="text-gray-600">{t('intro')}</p>
      </header>

      <section aria-labelledby="projects-title">
        <h2 id="projects-title" className="mb-4 text-xl font-semibold text-foreground">
          {t('projectsTitle')}
        </h2>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary-dark bg-white p-6">
            <p className="mb-4 text-gray-600">{t('noProjects')}</p>
            <Link
              href={`/${locale}/contact`}
              className="inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-light"
            >
              {t('contactCta')}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/${locale}/area/progetti/${project.id}`}
                  prefetch={false}
                  className="flex h-full flex-col rounded-xl border border-secondary-dark bg-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={project.status} />
                    {project.zone && (
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary-dark">
                        <ZoneLabel zone={project.zone} />
                      </span>
                    )}
                  </div>
                  <h3 className="mb-2 break-words text-lg font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {project.visitDate
                      ? t('visit', { date: formatVisitDate(project.visitDate, locale) })
                      : t('noVisit')}
                  </p>
                  <p className="mt-auto pt-4 text-sm text-gray-500">
                    {t('materials', { count: project.materialCount })}
                    <span className="sr-only"> — {t('open')}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tips-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tips-title" className="text-xl font-semibold text-foreground">
            {t('tipsTitle')}
          </h2>
          {tips.length > 0 && (
            <Link
              href={`/${locale}/area/consigli`}
              prefetch={false}
              className="text-sm font-semibold text-primary-dark underline-offset-4 hover:underline"
            >
              {t('allTips')} &rarr;
            </Link>
          )}
        </div>

        {tips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary-dark bg-white p-6">
            <p className="mb-4 text-gray-600">{t('noTips')}</p>
            <Link
              href={`/${locale}/blog`}
              className="text-sm font-semibold text-primary-dark underline-offset-4 hover:underline"
            >
              {t('blogCta')} &rarr;
            </Link>
          </div>
        ) : (
          <TipList tips={tips} locale={locale} />
        )}
      </section>
    </div>
  );
}
