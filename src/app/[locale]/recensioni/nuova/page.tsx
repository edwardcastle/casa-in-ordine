import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Hero from '@/components/Hero';
import ReviewForm from '@/components/ReviewForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reviewForm' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // Deliberately not indexed. It is a utility form with no content of its
    // own, and three near-identical locale copies of it is exactly the thin
    // duplication the rest of the site has been kept clear of. `follow` so the
    // links out of it still count.
    robots: { index: false, follow: true },
    alternates: {
      canonical: `https://casainordine.com/${locale}/recensioni/nuova`,
      languages: {
        it: 'https://casainordine.com/it/recensioni/nuova',
        en: 'https://casainordine.com/en/recensioni/nuova',
        es: 'https://casainordine.com/es/recensioni/nuova',
        'x-default': 'https://casainordine.com/it/recensioni/nuova',
      },
    },
  };
}

export default function NewReviewPage() {
  const t = useTranslations('reviewForm');

  return (
    <>
      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        backgroundImage="/images/gallery/living-3.jpg"
      />

      <section className="bg-white py-16 md:py-24" id="main">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <p className="mb-8 text-lg leading-relaxed text-gray-600">{t('intro')}</p>
          <ReviewForm />
        </div>
      </section>
    </>
  );
}
