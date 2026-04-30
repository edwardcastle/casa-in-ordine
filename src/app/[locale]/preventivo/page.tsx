import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Hero from '@/components/Hero';
import QuoteWizard from '@/components/QuoteWizard';

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
      canonical: `https://www.casainordine.com/${locale}/preventivo`,
      languages: {
        it: 'https://www.casainordine.com/it/preventivo',
        en: 'https://www.casainordine.com/en/preventivo',
        es: 'https://www.casainordine.com/es/preventivo',
        'x-default': 'https://www.casainordine.com/it/preventivo',
      },
    },
  };
}

export default function PreventivoPage() {
  const t = useTranslations('preventivo');

  return (
    <>
      <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/gallery/closet-1.jpg" />

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
    </>
  );
}
