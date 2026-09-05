import { useTranslations } from 'next-intl';
import type { PublicReview } from '@/lib/reviews/types';

const LANG_LABEL = { it: 'languages.it', en: 'languages.en', es: 'languages.es' } as const;

function Stars({ rating }: { rating: number }) {
  return (
    <p className="mb-3 text-accent" aria-label={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-secondary">{'★'.repeat(5 - rating)}</span>
    </p>
  );
}

export default function ReviewCard({
  review,
  locale,
}: {
  review: PublicReview;
  locale: string;
}) {
  const t = useTranslations('home.reviews');

  // Month granularity only: a first name, a neighbourhood and a datable home
  // visit is realistically re-identifiable when you have a handful of clients.
  const when = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(review.submittedAt);

  const foreign = review.lang !== locale;

  return (
    <figure className="flex h-full flex-col rounded-xl border border-secondary/30 bg-white p-6 shadow-md">
      {review.rating ? <Stars rating={review.rating} /> : null}

      <blockquote lang={review.lang} className="mb-4 flex-1 leading-relaxed text-gray-600 italic">
        &ldquo;{review.body}&rdquo;
      </blockquote>

      <figcaption className="border-t border-secondary/30 pt-4">
        <p className="font-semibold text-gray-900">{review.authorName}</p>
        <p className="text-sm text-gray-500">
          {review.city ? <>{review.city} · </> : null}
          {when}
        </p>

        <p className="mt-2 text-xs text-gray-500">
          {review.source === 'google' && review.googleUrl ? (
            <a
              href={review.googleUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2 hover:text-primary-dark"
            >
              {t('fromGoogle')}
            </a>
          ) : (
            <span>{t('fromClient')}</span>
          )}
          {foreign ? <> · {t('originalIn', { language: t(LANG_LABEL[review.lang]) })}</> : null}
        </p>
      </figcaption>
    </figure>
  );
}
