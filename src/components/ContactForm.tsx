'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitContactForm } from '@/actions/contact';
import TurnstileWidget, { isTurnstileEnabled } from '@/components/TurnstileWidget';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';

// Reasons worth explaining. Anything else collapses into the generic error so
// a script cannot use the response to work out which check caught it.
const EXPLAINED_REASONS = new Set([
  'rate-limited',
  'captcha',
  'email-format',
  'email-disposable',
  'email-unreachable',
  'message-too-short',
  'message-too-long',
]);

export default function ContactForm() {
  const t = useTranslations('contact.form');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reason, setReason] = useState<string>('send-failed');
  const [token, setToken] = useState('');
  // Stamped on mount, so a submission arriving milliseconds later is visibly
  // not a person filling in a form. Set in an effect rather than during
  // render: the clock would otherwise differ between server and hydration.
  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function handleSubmit(formData: FormData) {
    setStatus('sending');
    formData.set('cf-turnstile-response', token);
    formData.set(RENDERED_AT_FIELD, String(renderedAt.current));
    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        setStatus('success');
        return;
      }
      setReason(EXPLAINED_REASONS.has(result.reason) ? result.reason : 'send-failed');
      setStatus('error');
    } catch {
      setReason('send-failed');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center">
        <svg className="w-12 h-12 text-primary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-primary font-medium">{t('success')}</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('name')} *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('email')} *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          {t('phone')}
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          {t('message')} *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors resize-vertical"
        />
      </div>

      {/* Hidden from people, tempting to form-fillers. Positioned off-screen
          rather than display:none, which some bots check for. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          type="text"
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {isTurnstileEnabled && <TurnstileWidget onVerify={setToken} className="flex justify-center" />}

      {status === 'error' && (
        <p className="text-red-600 text-sm">{t(`errors.${reason}`)}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
