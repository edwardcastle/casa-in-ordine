import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Script from 'next/script';
import CookieConsent from '@/components/CookieConsent';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import ChatWidgetLazy from '@/components/ChatWidgetLazy';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return {
    title: {
      default: messages.metadata.title,
      template: `%s | Casa in Ordine`,
    },
    description: messages.metadata.description,
    keywords: messages.metadata.keywords.split(', '),
    authors: [{ name: 'Casa in Ordine' }],
    creator: 'Casa in Ordine',
    metadataBase: new URL('https://casainordine.com'),
    icons: {
      icon: [
        { url: '/favicon_32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon_192x192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [
        { url: '/favicon_180x180.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    // No `alternates` here: canonical + hreflang are page-specific, so each
    // page.tsx supplies its own. Putting the homepage's values in this shared
    // layout would make every child route that forgets to override inherit the
    // homepage canonical.
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      url: `https://casainordine.com/${locale}`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/logo/logo_1200x630.png',
          width: 1200,
          height: 630,
          alt: 'Casa in Ordine - Decluttering e Home Organizing a Roma',
        },
      ],
    },
    // Only the card type is set site-wide; title/description/image are left to
    // each page's own openGraph (pages that set neither fall back to og here).
    // Hardcoding the homepage title/description made every subpage's X card
    // show the homepage copy.
    twitter: {
      card: 'summary_large_image',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Client components receive everything EXCEPT privacyPolicy.
  //
  // NextIntlClientProvider serialises whatever it is given into the payload of
  // every route, so the GDPR notice — which must name the registered office —
  // was putting the street address into the HTML of the homepage, the blog and
  // every service page. The privacy page renders on the server and reads the
  // namespace there; no client component touches it (Header/nav,
  // CookieConsent, ChatWidget, ContactForm, QuoteWizard and ReviewForm are the
  // only ones, and none of them do).
  const CLIENT_EXCLUDED = ['privacyPolicy'];
  const messages = Object.fromEntries(
    Object.entries(await getMessages()).filter(([ns]) => !CLIENT_EXCLUDED.includes(ns)),
  );

  return (
    <html lang={locale}>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="1e5f6664-a355-4022-b92e-ed44f83ec536"
          strategy="afterInteractive"
        />
        <JsonLd locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <CookieConsent />
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <ChatWidgetLazy />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
