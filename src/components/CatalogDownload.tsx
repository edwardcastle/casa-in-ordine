'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { requestCatalog } from '@/actions/catalog';
import TurnstileWidget, { isTurnstileEnabled } from '@/components/TurnstileWidget';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';

const EXPLAINED_REASONS = new Set([
  'rate-limited',
  'captcha',
  'email-format',
  'email-disposable',
  'email-unreachable',
  'missing-fields',
  'field-too-long',
  'unavailable',
]);

export default function CatalogDownload() {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reason, setReason] = useState('send-failed');
  const [token, setToken] = useState('');
  const [resetSignal, setResetSignal] = useState(0);
  const [fields, setFields] = useState({ email: '', name: '' });

  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const consentText = t('marketingConsent');

  function open() {
    setStatus('idle');
    // showModal, not the open attribute: it is what gives the focus trap, Esc
    // to close, an inert background and focus returning to this button after.
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(formData: FormData) {
    setStatus('sending');
    formData.set('cf-turnstile-response', token);
    formData.set(RENDERED_AT_FIELD, String(renderedAt.current));
    formData.set('lang', locale);
    formData.set('consentText', consentText);

    try {
      const result = await requestCatalog(formData);
      if (result.success) {
        setStatus('success');
        return;
      }
      setReason(EXPLAINED_REASONS.has(result.reason) ? result.reason : 'send-failed');
      setStatus('error');
      setResetSignal((n) => n + 1);
    } catch {
      setReason('send-failed');
      setStatus('error');
      setResetSignal((n) => n + 1);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        {t('button')}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="catalog-title"
        onClose={() => setStatus('idle')}
        // Clicking the backdrop lands on the dialog itself, never on its
        // children, so this closes on backdrop clicks without a second overlay.
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6 sm:p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h2 id="catalog-title" className="mb-2 text-xl font-semibold">
                {t('successTitle')}
              </h2>
              <p className="mb-6 text-sm text-gray-600">{t('successBody')}</p>
              <button
                type="button"
                onClick={close}
                className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-light"
              >
                {t('close')}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="catalog-title" className="text-xl font-semibold">
                    {t('modalTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{t('modalBody')}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t('close')}
                  className="-mr-1 -mt-1 flex-none rounded-full p-1.5 text-gray-400 transition-colors hover:bg-secondary-light hover:text-foreground"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form action={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="cat-email" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('email')} *
                  </label>
                  <input
                    id="cat-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={fields.email}
                    onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-md border border-secondary/60 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cat-name" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('name')}
                  </label>
                  <input
                    id="cat-name"
                    name="name"
                    maxLength={80}
                    autoComplete="given-name"
                    value={fields.name}
                    onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-md border border-secondary/60 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Unticked by default and never required: the catalogue is sent
                    either way, so this only ever buys permission to follow up. */}
                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{consentText}</span>
                </label>

                <input
                  type="text"
                  name={HONEYPOT_FIELD}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />

                {isTurnstileEnabled && (
                  <TurnstileWidget onVerify={setToken} resetSignal={resetSignal} className="flex justify-center" />
                )}

                {status === 'error' && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {t(`errors.${reason}`)}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="mt-1 rounded-full bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
                >
                  {status === 'sending' ? t('sending') : t('submit')}
                </button>

                <p className="text-xs text-gray-500">{t('privacyNote')}</p>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
