import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import ScrollReveal from '@/components/ScrollReveal';

const BRAND = 'CASA IN ORDINE';

function highlightBrand(text: string): ReactNode {
  const parts = text.split(BRAND);
  if (parts.length === 1) return text;
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i > 0) {
      out.push(
        <span key={`b-${i}`} className="font-bold text-primary">
          {BRAND}
        </span>
      );
    }
    if (part) out.push(<span key={`t-${i}`}>{part}</span>);
  });
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacyPolicy' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: {
      canonical: `https://casainordine.com/${locale}/privacy-policy`,
      languages: {
        it: 'https://casainordine.com/it/privacy-policy',
        en: 'https://casainordine.com/en/privacy-policy',
        es: 'https://casainordine.com/es/privacy-policy',
        'x-default': 'https://casainordine.com/it/privacy-policy',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('metaDescription'),
      url: `https://casainordine.com/${locale}/privacy-policy`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [{ url: '/images/logo/logo_1200x630.png', width: 1200, height: 630, alt: 'Casa in Ordine' }],
    },
    robots: { index: true, follow: true },
  };
}

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacyPolicy');
  const tNotFound = useTranslations('notFound');
  const locale = useLocale();

  return (
    <article className="py-10 md:py-16 bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors mb-8"
          aria-label={tNotFound('backHome')}
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{tNotFound('backHome')}</span>
        </Link>

        <header className="mb-10 md:mb-14">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-primary shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight text-primary">
              {t('heroTitle')}
            </h1>
          </div>
          <p className="text-base md:text-lg text-gray-500 text-justify">{t('heroSubtitle')}</p>
        </header>

        <ScrollReveal animation="fadeInUpShorter">
          <p className="text-gray-700 leading-relaxed text-[1.02rem] text-justify mb-12">
            {highlightBrand(t('intro'))}
          </p>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('dataTypes.title')}
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-[1.02rem] text-justify">
              <p>{highlightBrand(t('dataTypes.lead'))}</p>
              <ul className="space-y-3 pl-5 list-disc marker:text-accent">
                <li>
                  <span className="font-semibold text-foreground">{t('dataTypes.personalLabel')}:</span>{' '}
                  {t('dataTypes.personalText')}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t('dataTypes.marketingLabel')}:</span>{' '}
                  {t('dataTypes.marketingText')}
                </li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('purposes.title')}
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-[1.02rem] text-justify">
              <p>{t('purposes.lead')}</p>
              <ul className="space-y-3 pl-5 list-disc marker:text-accent">
                <li>{t('purposes.service')}</li>
              </ul>
              <p className="font-medium text-foreground pt-2 text-left">{t('purposes.marketingHeading')}</p>
              <ul className="space-y-3 pl-5 list-disc marker:text-accent">
                <li>{highlightBrand(t('purposes.marketing1'))}</li>
                <li>{highlightBrand(t('purposes.marketing2'))}</li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('sources.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed text-[1.02rem] text-justify">{highlightBrand(t('sources.text'))}</p>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('processing.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed text-[1.02rem] text-justify">{highlightBrand(t('processing.text'))}</p>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('retention.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed text-[1.02rem] text-justify">{highlightBrand(t('retention.text'))}</p>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('recipients.title')}
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-[1.02rem] text-justify">
              <p>{t('recipients.lead')}</p>
              <ul className="space-y-3 pl-5 list-disc marker:text-accent">
                <li>{highlightBrand(t('recipients.item1'))}</li>
                <li>{highlightBrand(t('recipients.item2'))}</li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section className="mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('rights.title')}
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-[1.02rem] text-justify">
              <p>{t('rights.lead')}</p>
              <ul className="space-y-3 pl-5 list-disc marker:text-accent">
                <li>{t('rights.item1')}</li>
                <li>{t('rights.item2')}</li>
                <li>{t('rights.item3')}</li>
                <li>{t('rights.item4')}</li>
              </ul>
              <p className="pt-2 text-left">{t('rights.additional')}</p>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <div className="bg-primary/5 border-l-4 border-accent rounded-r-xl p-5 mb-12">
            <p className="text-base md:text-lg font-medium text-foreground italic leading-relaxed text-justify">
              {highlightBrand(t('commitment'))}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUpShorter">
          <section>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              {t('controller.title')}
            </h2>
            <div className="text-gray-700 leading-relaxed text-[1.02rem] space-y-1 text-justify">
              <p className="font-bold text-primary">{t('controller.name')}</p>
              <p>{t('controller.address')}</p>
              <p>
                {t('controller.emailLabel')}:{' '}
                <a
                  href={`mailto:${t('controller.email')}`}
                  className="text-accent hover:underline"
                >
                  {t('controller.email')}
                </a>
              </p>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </article>
  );
}
