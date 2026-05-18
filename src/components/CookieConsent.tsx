'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useTranslations, useLocale } from 'next-intl';

const CONSENT_KEY = 'ga-consent';

export default function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const locale = useLocale();
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'granted' || stored === 'denied') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage; value is unknown during SSR
      setConsent(stored);
      return;
    }
    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
  }, []);

  const dismiss = (value: 'granted' | 'denied') => {
    localStorage.setItem(CONSENT_KEY, value);
    setEntered(false);
    setTimeout(() => {
      setConsent(value);
      setVisible(false);
    }, 250);
  };

  return (
    <>
      {consent === 'granted' && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-02MP1BR6W6"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-02MP1BR6W6');
            `}
          </Script>
        </>
      )}

      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={t('title')}
          className={`fixed inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:right-6 md:max-w-md z-50 transition-all duration-300 ease-out ${
            entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12h.01M12 16h.01M15 9h.01M16 13.5h.01" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground mb-1.5">
                  {t('title')}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t.rich('message', {
                    link: (chunks) => (
                      <Link
                        href={`/${locale}/privacy-policy`}
                        className="text-primary font-medium underline underline-offset-2 hover:text-primary-dark transition-colors"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => dismiss('denied')}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('reject')}
              </button>
              <button
                type="button"
                onClick={() => dismiss('granted')}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
