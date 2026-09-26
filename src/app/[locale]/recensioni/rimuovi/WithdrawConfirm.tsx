'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { withdrawOwnReview, type WithdrawResult } from '@/actions/withdraw';

export default function WithdrawConfirm({
  token,
  authorName,
  body,
}: {
  token: string;
  authorName: string;
  body: string;
}) {
  const t = useTranslations('withdrawReview');
  const [state, action, pending] = useActionState<WithdrawResult | null, FormData>(
    async (_prev, formData) => withdrawOwnReview(formData),
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-8 text-center">
        <p className="mb-2 text-lg font-medium text-primary">{t('doneTitle')}</p>
        <p className="text-sm text-gray-600">{t('doneBody')}</p>
      </div>
    );
  }

  return (
    <>
      <blockquote className="mb-8 border-l-2 border-secondary pl-5 text-gray-600 italic">
        &ldquo;{body}&rdquo;
        <footer className="mt-3 text-sm font-semibold text-gray-900 not-italic">
          {authorName}
        </footer>
      </blockquote>

      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="authorName" value={authorName} />

        {state?.reason === 'rate-limited' && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('errors.rate-limited')}
          </p>
        )}
        {state?.reason === 'gone' && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('errors.gone')}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-red-700 px-8 py-3 font-bold text-white transition-colors hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? t('removing') : t('confirm')}
        </button>
        <p className="mt-4 text-sm text-gray-500">{t('keepNote')}</p>
      </form>
    </>
  );
}
