import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Hero from '@/components/Hero';
import BeforeAfter from '@/components/BeforeAfter';
import ImpactChart from '@/components/ImpactChart';
import BalanceChart from '@/components/BalanceChart';
import ScrollReveal from '@/components/ScrollReveal';
import OverlayImage from '@/components/OverlayImage';
import CategoryIcon from '@/components/CategoryIcon';
import type { Category } from '@/components/CategoryIcon';

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();

  const serviceCategories: Category[] = ['armadio', 'cucina', 'ufficio', 'bagno', 'garage', 'trasloco'];

  return (
    <>
      {/* Hero Section */}
      <Hero
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
        cta={{ text: t('hero.cta'), href: `/${locale}/contact` }}
        backgroundImages={[
          '/images/backgrounds/hero1.JPG',
          '/images/backgrounds/hero2.JPG',
          '/images/backgrounds/hero3.JPG',
        ]}
        interval={6000}
        large
      />

      {/* Before / After Section */}
      <section className="py-16 md:py-24 bg-white" id="main">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <ScrollReveal animation="fadeInUpShorter">
              <h2 className="text-clamp-section font-normal text-foreground text-center">
                <span dangerouslySetInnerHTML={{ __html: t.raw('home.beforeAfter.title') }} />
              </h2>
            </ScrollReveal>
            <ScrollReveal animation="fadeInUpShorter" delay={150}>
              <BeforeAfter
                beforeSrc="/images/backgrounds/casa-in-ordine-sec2-before.webp"
                afterSrc="/images/backgrounds/casa-in-ordine-sec2-after.webp"
                beforeAlt="Before - spazio disordinato"
                afterAlt="After - spazio organizzato"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Reflection / Impact Section */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="fadeInUpShorter">
              <div>
                <h2 className="text-clamp-section font-normal text-foreground mb-6">
                  <span dangerouslySetInnerHTML={{ __html: t.raw('home.reflection.title') }} />
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8 text-justify">
                  {t('home.reflection.description')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-xl p-6 shadow-sm border border-primary/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-normal text-lg text-foreground">
                      {t('home.reflection.benefit1Title').split(' ')[0]} <strong className="font-extrabold">{t('home.reflection.benefit1Title').split(' ').slice(1).join(' ')}</strong>
                    </h3>
                  </div>
                  <div className="bg-primary/10 rounded-xl p-6 shadow-sm border border-primary/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="font-normal text-lg text-foreground">
                      {t('home.reflection.benefit2Title').split(' ')[0]} <strong className="font-extrabold">{t('home.reflection.benefit2Title').split(' ').slice(1).join(' ')}</strong>
                    </h3>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fadeInUpShorter" delay={150}>
              <div className="bg-white/80 p-6 md:p-8 rounded-2xl shadow-md">
                <div className="w-full max-w-md mx-auto">
                  <ImpactChart
                    labels={[
                      t('home.reflection.chart.mentalPeace'),
                      t('home.reflection.chart.freeTime'),
                      t('home.reflection.chart.productivity'),
                      t('home.reflection.chart.sociality'),
                      t('home.reflection.chart.wellbeing')
                    ]}
                    beforeData={[30, 40, 20, 50, 30]}
                    afterData={[95, 90, 85, 80, 95]}
                    beforeLabel={t('home.reflection.chart.before')}
                    afterLabel={t('home.reflection.chart.after')}
                  />
                </div>
                <p className="text-center text-sm mb-0 mt-4 text-gray-500 italic">
                  {t('home.reflection.chartCaption')}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Services Categories */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fadeInUpShorter">
            <h2 className="text-clamp-section font-normal text-foreground text-center mb-3">
              <span dangerouslySetInnerHTML={{ __html: t.raw('home.services.title') }} />
            </h2>
            <p className="text-base md:text-lg text-foreground/70 text-center mb-12 max-w-3xl mx-auto">
              <span dangerouslySetInnerHTML={{ __html: t.raw('home.services.subtitle') }} />
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {serviceCategories.map((key, i) => (
              <ScrollReveal key={key} animation="fadeInUpShorter" delay={i * 100}>
                <Link
                  href={`/${locale}/preventivo`}
                  className="block bg-white rounded-2xl py-10 px-6 shadow-sm hover:shadow-lg transition-all duration-300 text-center group"
                >
                  <div className="mx-auto mb-4 flex items-center justify-center group-hover:text-accent transition-colors">
                    <CategoryIcon category={key} className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mt-2">
                    {t(`home.services.categories.${key}`)}
                  </h3>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <ScrollReveal animation="fadeInUpShorter">
              <div className="relative">
                <div className="absolute -top-5 -left-5 w-32 h-32 bg-accent/15 rounded-full blur-xl" />
                <OverlayImage
                  src="/images/backgrounds/why-choose-us.JPG"
                  alt="Casa in Ordine team"
                />
                <blockquote className="mt-6 text-center italic text-gray-600">
                  &ldquo;{t('home.whyUs.quote')}&rdquo;
                  <footer className="mt-2 text-sm font-bold text-accent not-italic">
                    &mdash; {t('home.whyUs.quoteAuthor')}
                  </footer>
                </blockquote>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fadeInUpShorter" delay={150}>
              <div>
                <h2 className="text-clamp-section font-normal text-foreground mb-4">
                  <span dangerouslySetInnerHTML={{ __html: t.raw('home.whyUs.title') }} />
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6 text-justify">
                  {t('home.whyUs.description')}
                </p>
                <div className="flex flex-col gap-4 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                        {i}
                      </div>
                      <p className="text-foreground font-semibold mb-0">
                        {t(`home.whyUs.point${i}Title`)}: <span className="font-normal text-gray-600">{t(`home.whyUs.point${i}Desc`)}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-28 h-28 flex-shrink-0">
                    <BalanceChart
                      labels={[t('home.whyUs.chartTechnique'), t('home.whyUs.chartWarmth')]}
                      data={[60, 40]}
                      title={t('home.whyUs.chartTitle')}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{t('home.whyUs.chartTitle')}</h4>
                    <p className="text-sm text-gray-500">60% {t('home.whyUs.chartTechnique')} / 40% {t('home.whyUs.chartWarmth')}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal animation="fadeInUpShorter">
            <h2 className="text-clamp-section font-normal text-white mb-6">
              <span dangerouslySetInnerHTML={{ __html: t.raw('home.finalCta.title') }} />
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              {t('home.finalCta.description')}
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fadeInUpShorter" delay={200}>
            <div className="flex flex-col items-center gap-4">
              <Link
                href={`/${locale}/preventivo`}
                className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-colors duration-200 shadow-lg text-lg"
              >
                {t('home.finalCta.cta')}
              </Link>
              <div className="flex gap-6 mt-3">
                <a href="https://www.instagram.com/casainordine_it/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Facebook">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
