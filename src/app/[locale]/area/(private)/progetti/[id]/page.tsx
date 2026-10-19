import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import StatusBadge from '@/components/area/StatusBadge';
import ZoneLabel from '@/components/area/ZoneLabel';
import { formatAddedDate, formatFileSize, formatVisitDate, isHttpUrl } from '@/lib/area/format';
import { getProject, type Material } from '@/lib/area/queries';
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

  const t = await getTranslations({ locale, namespace: 'area.project' });
  return { title: t('metaTitle') };
}

const ACTION =
  'inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-light';

function MaterialItem({ material, locale }: { material: Material; locale: string }) {
  const t = useTranslations('area.project');
  const meta = [
    material.kind === 'file' && material.fileType ? material.fileType.split('/').pop()?.toUpperCase() : null,
    material.kind === 'file' && material.fileSize != null ? formatFileSize(material.fileSize) : null,
    t('added', { date: formatAddedDate(material.createdAt, locale) }),
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-secondary-dark bg-white p-5">
      <h3 className="mb-1 break-words text-base font-semibold text-foreground">{material.title}</h3>
      <p className="mb-3 text-xs text-gray-500">{meta.join(' · ')}</p>

      {material.kind === 'file' && (
        <a
          href={`/api/area/files/${material.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={ACTION}
        >
          {t('openFile')}
        </a>
      )}

      {/* Notes are text. They are never rendered as HTML. */}
      {material.kind === 'note' && material.body && (
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
          {material.body}
        </p>
      )}

      {material.kind === 'link' &&
        material.body &&
        (isHttpUrl(material.body) ? (
          <a
            href={material.body.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className={ACTION}
          >
            {t('openLink')}
          </a>
        ) : (
          <p className="break-all text-sm text-gray-700">{material.body}</p>
        ))}
    </li>
  );
}

export default async function AreaProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const client = await currentClient();
  if (!client) redirect(`/${locale}/area/accedi`);

  // Scoped to the client inside the query: someone else's project, a project
  // that does not exist and a malformed id all come back null, and all get
  // the same 404.
  const project = await getProject(client.id, id);
  if (!project) notFound();

  const t = await getTranslations({ locale, namespace: 'area.project' });

  return (
    <div className="space-y-10">
      <header>
        <Link
          href={`/${locale}/area`}
          prefetch={false}
          className="mb-4 inline-block text-sm font-semibold text-primary-dark underline-offset-4 hover:underline"
        >
          &larr; {t('back')}
        </Link>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          {project.zone && (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary-dark">
              <ZoneLabel zone={project.zone} />
            </span>
          )}
        </div>
        <h1 className="mb-2 break-words text-3xl font-semibold text-foreground">{project.title}</h1>
        {project.visitDate && (
          <p className="text-gray-600">
            {t('visit', { date: formatVisitDate(project.visitDate, locale) })}
          </p>
        )}
      </header>

      <section aria-labelledby="summary-title">
        <h2 id="summary-title" className="mb-3 text-xl font-semibold text-foreground">
          {t('summaryTitle')}
        </h2>
        {project.summary ? (
          <p className="whitespace-pre-line break-words leading-relaxed text-gray-700">
            {project.summary}
          </p>
        ) : (
          <p className="text-gray-600">{t('noSummary')}</p>
        )}
      </section>

      <section aria-labelledby="materials-title">
        <h2 id="materials-title" className="mb-4 text-xl font-semibold text-foreground">
          {t('materialsTitle')}
        </h2>
        {project.materials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary-dark bg-white p-6">
            <p className="text-gray-600">{t('noMaterials')}</p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {project.materials.map((material) => (
              <MaterialItem key={material.id} material={material} locale={locale} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
