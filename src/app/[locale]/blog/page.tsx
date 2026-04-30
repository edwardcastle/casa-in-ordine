import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Hero from '@/components/Hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: {
      canonical: `https://www.casainordine.com/${locale}/blog`,
      languages: {
        it: 'https://www.casainordine.com/it/blog',
        en: 'https://www.casainordine.com/en/blog',
        es: 'https://www.casainordine.com/es/blog',
        'x-default': 'https://www.casainordine.com/it/blog',
      },
    },
  };
}

export default function BlogPage() {
  const t = useTranslations('blog');

  return (
    <>
      <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/backgrounds/bg-3.jpg" />

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Coming Soon Banner */}
          <div className="bg-secondary-light rounded-2xl p-8 md:p-12 text-center mb-12">
            <svg className="w-16 h-16 text-primary/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('comingSoon')}</h2>
            <p className="text-gray-600 max-w-lg mx-auto">{t('comingSoonDescription')}</p>
          </div>

          {/* Preview Posts */}
          <div className="grid md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <article key={i} className="bg-white rounded-xl shadow-md overflow-hidden border border-secondary/30 opacity-75">
                <div className="bg-secondary h-48 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">{t(`posts.${i}.category`)}</span>
                    <span className="text-xs text-gray-400">{t(`posts.${i}.date`)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`posts.${i}.title`)}</h3>
                  <p className="text-sm text-gray-600">{t(`posts.${i}.excerpt`)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
