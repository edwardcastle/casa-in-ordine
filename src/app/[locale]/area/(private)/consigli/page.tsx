import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import TipList from '@/components/area/TipList';
import { listTips } from '@/lib/area/queries';
import { signInPath } from '@/lib/area/next-path';
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

  const t = await getTranslations({ locale, namespace: 'area.tips' });
  return { title: t('metaTitle') };
}

export default async function AreaTipsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const client = await currentClient();
  if (!client) redirect(signInPath(locale, `/${locale}/area/consigli`));

  const t = await getTranslations({ locale, namespace: 'area.tips' });
  const tips = await listTips(locale, 50);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold text-foreground">{t('title')}</h1>
      <p className="mb-8 text-gray-600">{t('intro')}</p>

      {tips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-secondary-dark bg-white p-6">
          <p className="mb-4 text-gray-600">{t('empty')}</p>
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
    </div>
  );
}
