import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';

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
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return {
    title: {
      default: messages.metadata.title,
      template: `%s | Casa in Ordine`,
    },
    description: messages.metadata.description,
    keywords: [
      'decluttering', 'home organizing', 'organizzazione casa', 'Roma',
      'professional organizer', 'riordino', 'casa in ordine',
      'organizzatore professionale', 'consulenza decluttering',
    ],
    authors: [{ name: 'Casa in Ordine' }],
    creator: 'Casa in Ordine',
    metadataBase: new URL('https://www.casainordine.com'),
    icons: {
      icon: [
        { url: '/favicon_32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon_192x192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [
        { url: '/favicon_180x180.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    alternates: {
      canonical: `https://www.casainordine.com/${locale}`,
      languages: {
        it: 'https://www.casainordine.com/it',
        en: 'https://www.casainordine.com/en',
        es: 'https://www.casainordine.com/es',
        'x-default': 'https://www.casainordine.com/it',
      },
    },
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      url: `https://www.casainordine.com/${locale}`,
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
    twitter: {
      card: 'summary_large_image',
      title: messages.metadata.title,
      description: messages.metadata.description,
      images: ['/images/logo/logo_1200x630.png'],
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

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <JsonLd />
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
