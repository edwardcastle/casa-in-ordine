import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Hero from '@/components/Hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('title'),
    description: t('metaDescription'),
  };
}

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <>
      <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/gallery/office-1.jpg" />

      {/* Story Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('story.title')}</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>{t('story.p1')}</p>
                <p>{t('story.p2')}</p>
                <p>{t('story.p3')}</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative">
              <Image
                src="/images/gallery/closet-1.jpg"
                alt="Armadio organizzato da Casa in Ordine"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('mission.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-8 text-center shadow-md">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />}
                    {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />}
                    {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(`mission.values.${i}.title`)}</h3>
                <p className="text-gray-600">{t(`mission.values.${i}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('methodology.title')}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`methodology.steps.${i}.title`)}</h3>
                <p className="text-sm text-gray-600">{t(`methodology.steps.${i}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
