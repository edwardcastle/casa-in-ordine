'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitReview } from '@/actions/reviews';
import TurnstileWidget, { isTurnstileEnabled } from '@/components/TurnstileWidget';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';
import { REVIEW_SERVICES } from '@/lib/reviews/types';

// Mirrors ContactForm: only reasons a real person can act on are explained,
// so a script cannot use the response to work out which layer caught it.
const EXPLAINED_REASONS = new Set([
  'rate-limited',
  'captcha',
  'email-format',
  'email-disposable',
  'email-unreachable',
  'message-too-short',
  'message-too-long',
  'message-spam',
  'message-nonsense',
  'missing-fields',
  'field-too-long',
  'consent-required',
]);

const FIELD =
  'w-full rounded-md border border-secondary/60 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none';

export default function ReviewForm() {
  const t = useTranslations('reviewForm');
  const locale = useLocale();

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reason, setReason] = useState('send-failed');
  const [token, setToken] = useState('');
  const [resetSignal, setResetSignal] = useState(0);
  const [rating, setRating] = useState(5);
  // Controlled so a rejection does not wipe what she wrote — losing a
  // considered review over a mistyped address would be unforgivable.
  const [fields, setFields] = useState({ name: '', email: '', city: '', body: '', service: '' });

  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const consentText = t('consent');

  async function handleSubmit(formData: FormData) {
    setStatus('sending');
    formData.set('cf-turnstile-response', token);
    formData.set(RENDERED_AT_FIELD, String(renderedAt.current));
    formData.set('lang', locale);
    formData.set('rating', String(rating));
    // Stored alongside the answer, because this wording will change over time
    // and the record has to show what she actually agreed to.
    formData.set('consentText', consentText);

    try {
      const result = await submitReview(formData);
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

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-8 text-center">
        <p className="mb-2 font-medium text-primary">{t('successTitle')}</p>
        <p className="text-sm text-gray-600">{t('successBody')}</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="rv-name" className="mb-1 block text-sm font-medium text-gray-700">
          {t('name')} *
        </label>
        <input
          id="rv-name"
          name="name"
          required
          maxLength={80}
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          className={FIELD}
        />
        <p className="mt-1 text-xs text-gray-500">{t('nameHint')}</p>
      </div>

      <div>
        <label htmlFor="rv-email" className="mb-1 block text-sm font-medium text-gray-700">
          {t('email')} *
        </label>
        <input
          id="rv-email"
          name="email"
          type="email"
          required
          value={fields.email}
          onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
          className={FIELD}
        />
        <p className="mt-1 text-xs text-gray-500">{t('emailHint')}</p>
      </div>

      <div>
        <label htmlFor="rv-city" className="mb-1 block text-sm font-medium text-gray-700">
          {t('city')}
        </label>
        <input
          id="rv-city"
          name="city"
          maxLength={60}
          placeholder="Roma"
          value={fields.city}
          onChange={(e) => setFields((f) => ({ ...f, city: e.target.value }))}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="rv-service" className="mb-1 block text-sm font-medium text-gray-700">
          {t('service')}
        </label>
        <select
          id="rv-service"
          name="service"
          value={fields.service}
          onChange={(e) => setFields((f) => ({ ...f, service: e.target.value }))}
          className={FIELD}
        >
          <option value="">{t('servicePlaceholder')}</option>
          {REVIEW_SERVICES.map((s) => (
            <option key={s} value={s}>
              {t(`services.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-gray-700">{t('rating')}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n}/5`}
              aria-pressed={rating === n}
              className={`text-3xl leading-none transition-colors ${
                n <= rating ? 'text-accent' : 'text-secondary'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="rv-body" className="mb-1 block text-sm font-medium text-gray-700">
          {t('body')} *
        </label>
        <p className="mb-2 text-xs text-gray-500">{t('bodyHint')}</p>
        <textarea
          id="rv-body"
          name="body"
          required
          rows={7}
          minLength={40}
          maxLength={1500}
          value={fields.body}
          onChange={(e) => setFields((f) => ({ ...f, body: e.target.value }))}
          className={FIELD}
        />
      </div>

      <label className="flex items-start gap-3 rounded-md border border-secondary/50 bg-secondary-light/60 p-4">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 flex-none" />
        <span className="text-sm text-gray-700">{consentText}</span>
      </label>

      {/* Hidden from real visitors; a form-filler cannot resist it. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {isTurnstileEnabled && <TurnstileWidget onVerify={setToken} resetSignal={resetSignal} />}

      {status === 'error' && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t(`errors.${reason}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-full bg-primary px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-primary-light disabled:opacity-60"
      >
        {status === 'sending' ? t('sending') : t('submit')}
      </button>

      <p className="text-xs text-gray-500">{t('moderationNote')}</p>
    </form>
  );
}
