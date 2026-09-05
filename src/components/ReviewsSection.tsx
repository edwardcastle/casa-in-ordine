import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import ReviewCard from '@/components/ReviewCard';
import { getPublishedReviews, MIN_PUBLISHED } from '@/lib/reviews/queries';
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
  const all = await getPublishedReviews(locale as ReviewLang);
  if (all.length < MIN_PUBLISHED) return null;

  const t = await getTranslations({ locale, namespace: 'home.reviews' });
  const featured = all.slice(0, 3);
  // Only worth offering once it leads somewhere the strip does not already
  // show in full.
  const hasMore = all.length > featured.length;

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

        {/* The column count follows the card count, so one or two reviews sit
            centred rather than stranded in the left third of a 3-up grid. */}
        <div className={`mx-auto grid gap-8 ${
          featured.length === 1
            ? 'max-w-xl'
            : featured.length === 2
              ? 'max-w-4xl md:grid-cols-2'
              : 'md:grid-cols-3'
        }`}>
          {featured.map((review, i) => (
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

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={`/${locale}/recensioni`}
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light"
          >
            {hasMore ? t('readAll', { count: all.length }) : t('seeAll')}
          </Link>
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
