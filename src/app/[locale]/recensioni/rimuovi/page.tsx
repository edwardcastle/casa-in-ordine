import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { findByWithdrawToken } from '@/lib/reviews/queries';
import WithdrawConfirm from './WithdrawConfirm';

// The token is in the URL, so this must never be cached or indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function WithdrawReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token = '' } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'withdrawReview' });

  // Looked up, never spent: a mail client that prefetches this link must not
  // remove anything. Only the button on this page does.
  const review = await findByWithdrawToken(token);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="mb-3 text-3xl font-semibold text-foreground">{t('title')}</h1>

      {review ? <p className="mb-8 text-gray-600">{t('intro')}</p> : null}

      {/* Rendered whether or not the review was found, and always in the same
          place. Withdrawing clears the cached homepage, which makes Next
          render this page again inside the same response — by which time the
          review is gone. Were the component swapped out for a "not found"
          message here, the client who had just removed her review would be
          told her link was invalid instead of that it worked. Kept mounted, it
          still remembers that it succeeded. */}
      <WithdrawConfirm
        token={token}
        review={review ? { authorName: review.authorName, body: review.body } : null}
      />
    </main>
  );
}
