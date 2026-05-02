import type { Metadata } from 'next';
import { useTranslations, useLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import Hero from '@/components/Hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'services' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: {
      canonical: `https://casainordine.com/${locale}/services`,
      languages: {
        it: 'https://casainordine.com/it/services',
        en: 'https://casainordine.com/en/services',
        es: 'https://casainordine.com/es/services',
        'x-default': 'https://casainordine.com/it/services',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('metaDescription'),
      url: `https://casainordine.com/${locale}/services`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [{ url: '/images/logo/logo_1200x630.png', width: 1200, height: 630, alt: 'Casa in Ordine' }],
    },
  };
}

const serviceIcons = [
  // Decluttering - trash icon
  <svg key="declutter" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>,
  // Organizing - grid icon
  <svg key="organize" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>,
  // Consulting - chat icon
  <svg key="consult" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>,
  // Maintenance - refresh icon
  <svg key="maintain" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>,
];

export default function ServicesPage() {
  const t = useTranslations('services');
  const locale = useLocale();

  return (
    <>
      <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/backgrounds/kitchen-bg.jpg" />

      {/* Services */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`grid md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'md:[direction:rtl]' : ''}`}
              >
                <div className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      {serviceIcons[i]}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t(`items.${i}.title`)}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">{t(`items.${i}.description`)}</p>
                  <ul className="space-y-3 mb-8">
                    {[0, 1, 2, 3].map((j) => (
                      <li key={j} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{t(`items.${i}.features.${j}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/${locale}/preventivo`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-colors duration-200 shadow-md shadow-primary/20"
                  >
                    {t('cta.serviceButton')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className={`rounded-2xl overflow-hidden aspect-[4/3] relative ${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                  <Image
                    src={['/images/gallery/closet-1.jpg', '/images/gallery/kitchen-1.jpg', '/images/gallery/office-1.jpg', '/images/gallery/living-3.jpg'][i]}
                    alt={t(`items.${i}.title`)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{t('cta.title')}</h2>
          <p className="text-lg text-white/90 mb-8">{t('cta.description')}</p>
          <Link
            href={`/${locale}/preventivo`}
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-secondary-light transition-colors duration-200 shadow-lg"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </>
  );
}
