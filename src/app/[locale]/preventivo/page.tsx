import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations, useLocale } from 'next-intl';
import Hero from '@/components/Hero';
import QuoteWizard from '@/components/QuoteWizard';
import { breadcrumbLd } from '@/lib/breadcrumb';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'preventivo' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: {
      canonical: `https://casainordine.com/${locale}/preventivo`,
      languages: {
        it: 'https://casainordine.com/it/preventivo',
        en: 'https://casainordine.com/en/preventivo',
        es: 'https://casainordine.com/es/preventivo',
        'x-default': 'https://casainordine.com/it/preventivo',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('metaDescription'),
      url: `https://casainordine.com/${locale}/preventivo`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [{ url: '/images/logo/logo_1200x630.png', width: 1200, height: 630, alt: 'Casa in Ordine' }],
    },
  };
}

export default function PreventivoPage() {
  const t = useTranslations('preventivo');
  const tNav = useTranslations('nav');
  const locale = useLocale();

  const breadcrumbSchema = breadcrumbLd(locale, [
    { name: tNav('home'), path: '' },
    { name: tNav('preventivo'), path: '/preventivo' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="print:hidden">
        <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/gallery/closet-1.jpg" />
      </div>

      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('wizardTitle')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('wizardSubtitle')}
            </p>
          </div>
          <QuoteWizard />
        </div>
      </section>

      <section className="py-16 md:py-24 print:hidden">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">
            {t('seo.title')}
          </h2>
          <div className="space-y-4 leading-relaxed text-gray-600">
            {(t.raw('seo.paragraphs') as string[]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
