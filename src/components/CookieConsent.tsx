'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useTranslations } from 'next-intl';

const CONSENT_KEY = 'ga-consent';

export default function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'granted' || stored === 'denied') {
      setConsent(stored);
    } else {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    setConsent('granted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'denied');
    setConsent('denied');
    setVisible(false);
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:flex md:items-center md:justify-between md:px-8">
          <p className="text-sm text-gray-700 mb-3 md:mb-0 md:mr-4">
            {t('message')}
          </p>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('reject')}
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm bg-green-800 text-white rounded-md hover:bg-green-900 transition-colors"
            >
              {t('accept')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}