'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { requestClientSignIn, type SignInState } from '@/actions/area';
import TurnstileWidget, { isTurnstileEnabled } from '@/components/TurnstileWidget';

const FIELD =
  'w-full rounded-md border border-secondary/60 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none';

const IDLE: SignInState = { status: 'idle' };

/** Asks for an email address and reports that a link is on its way. */
export default function ClientSignInForm({ next }: { next?: string | null }) {
  const t = useTranslations('area.signin');
  const [state, action, pending] = useActionState(requestClientSignIn, IDLE);
  const [token, setToken] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

  // Cloudflare spends a token the first time it is verified, so each
  // submission asks the widget for a fresh one, whatever the answer.
  function submit(formData: FormData) {
    setResetSignal((n) => n + 1);
    action(formData);
  }

  if (state.status === 'sent') {
    return (
      <div
        role="status"
        className="rounded-xl border border-primary/20 bg-primary/10 p-8 text-center"
      >
        <p className="mb-2 font-medium text-primary">{t('sentTitle')}</p>
        <p className="text-sm text-gray-600">{t('sentBody')}</p>
      </div>
    );
  }

  const failed =
    state.status === 'invalid' || state.status === 'limited' || state.status === 'unavailable';

  return (
    <form action={submit} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="area-email" className="mb-1 block text-sm font-medium text-gray-700">
          {t('emailLabel')}
        </label>
        <input
          id="area-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          className={FIELD}
        />
      </div>

      {isTurnstileEnabled && (
        <>
          <input type="hidden" name="cf-turnstile-response" value={token} />
          <TurnstileWidget onVerify={setToken} resetSignal={resetSignal} />
        </>
      )}

      {failed && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {t(`errors.${state.status}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (isTurnstileEnabled && !token)}
        className="rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light disabled:opacity-60"
      >
        {pending ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
