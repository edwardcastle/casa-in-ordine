import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import ReviewCard from '@/components/ReviewCard';
import { getPublishedReviews, MIN_LISTING, MIN_PUBLISHED } from '@/lib/reviews/queries';
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
  // The listing route 404s below its own threshold, so the link only appears
  // once there is a page at the other end of it.
  const hasListing = all.length >= MIN_LISTING;

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

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {hasListing && (
            <Link
              href={`/${locale}/recensioni`}
              className="font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              {t('readAll', { count: all.length })} →
            </Link>
          )}
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
