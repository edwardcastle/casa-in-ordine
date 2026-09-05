import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import ReviewCard from '@/components/ReviewCard';
import { getFeaturedReviews } from '@/lib/reviews/queries';
import type { ReviewLang } from '@/lib/reviews/types';

/**
 * The homepage reviews strip.
 *
 * Renders nothing until there are enough published reviews — two testimonials
 * read worse than none, and an empty state advertises that nobody has reviewed
 * you. The heading deliberately says "what our clients said" rather than
 * "reviews": a heading implying an open, unfiltered corpus is itself a claim
 * under art. 23 of the Codice del Consumo, and this list is curated.
 */
export default async function ReviewsSection({ locale }: { locale: string }) {
  const reviews = await getFeaturedReviews(locale as ReviewLang);
  if (reviews.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.reviews' });

  return (
    <section className="bg-secondary py-16 md:py-24" id="recensioni">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fadeInUpShorter">
          <h2 className="text-clamp-section mb-3 text-center font-normal text-foreground">
            {t('title')}
          </h2>
          <p className="mx-auto mb-12 max-w-3xl text-center text-base text-foreground/70 md:text-lg">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-3">
          {reviews.map((review, i) => (
            <ScrollReveal key={review.id} animation="fadeInUpShorter" delay={i * 100}>
              <ReviewCard review={review} locale={locale} />
            </ScrollReveal>
          ))}
        </div>

        {/* Art. 22 c. 5-bis Cod. Cons.: say whether and how the reviews are
            checked. Kept next to the reviews, not buried in the footer. */}
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-foreground/60">
          {t('disclosure')}
        </p>

        <div className="mt-6 text-center">
          <Link
            href={`/${locale}/recensioni/nuova`}
            className="font-semibold text-primary transition-colors hover:text-primary-dark"
          >
            {t('cta')} →
          </Link>
        </div>
      </div>
    </section>
  );
}
