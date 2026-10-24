import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import PdfDocument from '@/components/area/PdfDocument';
import RichText from '@/components/area/RichText';
import StatusBadge from '@/components/area/StatusBadge';
import ZoneLabel from '@/components/area/ZoneLabel';
import { formatAddedDate, formatFileSize, formatVisitDate, isHttpUrl } from '@/lib/area/format';
import { getProject, type Material } from '@/lib/area/queries';
import { signInPath } from '@/lib/area/next-path';
import { currentClient } from '@/lib/area/session';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';
// Project ids are not known at build time; the locale layout's
// `dynamicParams = false` must not turn them into 404s.
export const dynamicParams = true;

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

const isPdf = (m: Material) => m.kind === 'file' && m.fileType === 'application/pdf';
const isImage = (m: Material) => m.kind === 'file' && Boolean(m.fileType?.startsWith('image/'));
/** Shown in full on the page: notes, PDFs and photos. Links go in a list at the end. */
const isDocument = (m: Material) => m.kind === 'note' || isPdf(m) || isImage(m);

const fileUrl = (m: Material) => `/api/area/files/${m.id}`;

export default async function AreaProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const client = await currentClient();
  if (!client) redirect(signInPath(locale, `/${locale}/area/progetti/${id}`));

  // Scoped to the client inside the query: someone else's project, a project
  // that does not exist and a malformed id all come back null, and all get
  // the same 404.
  const project = await getProject(client.id, id);
  if (!project) notFound();

  const t = await getTranslations({ locale, namespace: 'area.project' });
  const documents = project.materials.filter(isDocument);
  const others = project.materials.filter((m) => !isDocument(m));

  const downloadLink = (m: Material) => (
    <a
      href={fileUrl(m)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary-dark underline-offset-4 hover:underline"
    >
      {t('download')}
    </a>
  );

  return (
    <article>
      <header className="border-b border-secondary-dark pb-8">
        <Link
          href={`/${locale}/area`}
          prefetch={false}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
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
        <h1 className="min-w-0 [overflow-wrap:anywhere] text-3xl font-bold text-foreground md:text-4xl">{project.title}</h1>
        {project.visitDate && (
          <p className="mt-2 text-gray-600">{t('visit', { date: formatVisitDate(project.visitDate, locale) })}</p>
        )}
        {project.summary ? (
          <p className="mt-6 max-w-prose whitespace-pre-line break-words text-lg leading-relaxed text-foreground/85">
            {project.summary}
          </p>
        ) : (
          <p className="mt-6 text-gray-600">{t('noSummary')}</p>
        )}
      </header>

      {project.materials.length === 0 ? (
        <p className="pt-8 text-gray-600">{t('noMaterials')}</p>
      ) : (
        <div className="divide-y divide-secondary-dark">
          {documents.map((m) => (
            <section key={m.id} aria-labelledby={`doc-${m.id}`} className="py-10">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id={`doc-${m.id}`} className="min-w-0 [overflow-wrap:anywhere] text-2xl font-bold text-foreground">
                  {m.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('added', { date: formatAddedDate(m.createdAt, locale) })}
                  {m.kind === 'file' && (
                    <>
                      <span aria-hidden="true"> · </span>
                      {downloadLink(m)}
                    </>
                  )}
                </p>
              </div>

              {/* Notes are never rendered as HTML: a formatted note is built
                  element by element from its cleaned document. */}
              {m.kind === 'note' &&
                (m.doc ? (
                  <RichText doc={m.doc} className="!space-y-4 !text-base md:!text-[17px]" />
                ) : (
                  <p className="whitespace-pre-line break-words leading-relaxed text-foreground/90">{m.body}</p>
                ))}

              {isPdf(m) && (
                <PdfDocument
                  src={fileUrl(m)}
                  labels={{ loading: t('loadingDocument'), error: t('documentError'), page: t('pageOf', { n: '{n}', total: '{total}' }) }}
                />
              )}

              {isImage(m) && (
                // A plain img: the source is a redirect to a short-lived signed
                // address, which the image optimizer cannot follow or cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(m)}
                  alt={m.title}
                  loading="lazy"
                  className="w-full rounded-lg bg-secondary-light object-contain"
                />
              )}
            </section>
          ))}

          {others.length > 0 && (
            <section aria-labelledby="links-title" className="py-10">
              <h2 id="links-title" className="mb-4 text-xl font-bold text-foreground">
                {t('linksTitle')}
              </h2>
              <ul className="space-y-3">
                {others.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <span className="min-w-0 [overflow-wrap:anywhere] font-medium text-foreground">{m.title}</span>
                    {m.kind === 'link' && m.body && isHttpUrl(m.body) ? (
                      <a
                        href={m.body.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary-dark underline-offset-4 hover:underline"
                      >
                        {t('openLink')}
                      </a>
                    ) : m.kind === 'link' ? (
                      <span className="break-all text-sm text-gray-600">{m.body}</span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {m.fileSize != null && `${formatFileSize(m.fileSize)} · `}
                        {downloadLink(m)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
