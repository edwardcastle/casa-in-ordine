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

      {review ? (
        <>
          <p className="mb-8 text-gray-600">{t('intro')}</p>
          <WithdrawConfirm token={token} authorName={review.authorName} body={review.body} />
        </>
      ) : (
        <p className="rounded-md border border-secondary/60 bg-secondary-light px-5 py-4 text-gray-700">
          {t('errors.gone')}
        </p>
      )}
    </main>
  );
}
