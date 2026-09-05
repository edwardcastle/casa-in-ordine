import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/Hero';
import ReviewCard from '@/components/ReviewCard';
import ScrollReveal from '@/components/ScrollReveal';
import { breadcrumbLd } from '@/lib/breadcrumb';
import { getPublishedReviews, MIN_LISTING } from '@/lib/reviews/queries';
import type { ReviewLang } from '@/lib/reviews/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reviewsPage' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `https://casainordine.com/${locale}/recensioni`,
      languages: {
        it: 'https://casainordine.com/it/recensioni',
        en: 'https://casainordine.com/en/recensioni',
        es: 'https://casainordine.com/es/recensioni',
        'x-default': 'https://casainordine.com/it/recensioni',
      },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `https://casainordine.com/${locale}/recensioni`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/logo/logo_1200x630.png',
          width: 1200,
          height: 630,
          alt: 'Casa in Ordine',
        },
      ],
    },
  };
}

/**
 * Every published review.
 *
 * 404s below MIN_LISTING rather than rendering a short page. Three reviews
 * across three locales is a thin near-duplicate, and a page that exists but has
 * nothing on it is worse for the site than no page at all — the route simply
 * starts working the day the corpus justifies it.
 *
 * No Review or AggregateRating JSON-LD here, deliberately, and not because it
 * was forgotten: review markup on an entity that controls its own reviews is
 * ineligible for the star rich result on any URL. The Rich Results Test
 * validates it anyway, which is exactly how sites ship it — and a structured
 * data manual action would strip the BreadcrumbList and Article markup that
 * currently works across the rest of the site.
 */
export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const reviews = await getPublishedReviews(locale as ReviewLang);

  if (reviews.length < MIN_LISTING) notFound();

  const t = await getTranslations({ locale, namespace: 'reviewsPage' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  const breadcrumbSchema = breadcrumbLd(locale, [
    { name: tNav('home'), path: '' },
    { name: t('breadcrumb'), path: '/recensioni' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        backgroundImage="/images/gallery/living-1.jpg"
      />

      <section className="bg-secondary-light py-16 md:py-24" id="main">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mx-auto mb-12 max-w-2xl text-center text-base text-foreground/70 md:text-lg">
            {t('intro', { count: reviews.length })}
          </p>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <ScrollReveal key={review.id} animation="fadeInUpShorter" delay={(i % 3) * 100}>
                <ReviewCard review={review} locale={locale} />
              </ScrollReveal>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-foreground/60">
            {t('disclosure')}
          </p>

          <div className="mt-8 text-center">
            <Link
              href={`/${locale}/recensioni/nuova`}
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light"
            >
              {t('cta')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
