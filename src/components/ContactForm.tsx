'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { submitContactForm } from '@/actions/contact';

export default function ContactForm() {
  const t = useTranslations('contact.form');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  async function handleSubmit(formData: FormData) {
    setStatus('sending');
    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
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
        <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
          {t('service')}
        </label>
        <select
          id="service"
          name="service"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors bg-white"
        >
          <option value="">{t('serviceOptions.placeholder')}</option>
          <option value="decluttering">{t('serviceOptions.decluttering')}</option>
          <option value="organizing">{t('serviceOptions.organizing')}</option>
          <option value="consulting">{t('serviceOptions.consulting')}</option>
          <option value="maintenance">{t('serviceOptions.maintenance')}</option>
          <option value="other">{t('serviceOptions.other')}</option>
        </select>
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

      {status === 'error' && (
        <p className="text-red-600 text-sm">{t('error')}</p>
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
