import type { Metadata } from 'next';
import { useTranslations, useLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Hero from '@/components/Hero';
import ScrollReveal from '@/components/ScrollReveal';
import OverlayImage from '@/components/OverlayImage';

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
  const tNav = useTranslations();
  const locale = useLocale();

  return (
    <>
      <Hero title={t('heroTitle')} subtitle={t('heroSubtitle')} backgroundImage="/images/gallery/office-1.jpg" />

      {/* ── Chi Siamo + Intro — text left, image right ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <ScrollReveal animation="fadeInLeft">
              <div>
                <h2 className="text-clamp-section font-normal text-foreground mb-2">Chi Siamo</h2>
                <p className="text-accent font-medium mb-6">{t('heroSubtitle')}</p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {t('intro')}
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fadeInRight" delay={150}>
              <OverlayImage
                src="/images/backgrounds/our-story.JPG"
                alt="Dalia e Surinay - Fondatrici Casa in Ordine"
                objectPosition="object-[center_17%]"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Story — image left, text right ── */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <ScrollReveal animation="fadeInRight" className="order-2 md:order-1">
              <OverlayImage
                src="/images/backgrounds/come-nasce.JPG"
                alt="Casa in Ordine - Come nasce"
              />
            </ScrollReveal>
            <ScrollReveal animation="fadeInLeft" delay={150} className="order-1 md:order-2">
              <div>
                <h2 className="text-clamp-section font-normal text-foreground mb-6">
                  {t('story.title')}
                </h2>
                <div className="space-y-5 text-gray-600 leading-relaxed text-[1.05rem]">
                  <p>{t('story.p1')}</p>
                  <p>{t('story.p2')}</p>
                  <p className="font-medium text-foreground/80">{t('story.p3')}</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── What We Offer — text left, image right ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <ScrollReveal animation="fadeInLeft">
              <div>
                <h2 className="text-clamp-section font-normal text-foreground mb-6">
                  {t('offer.title')}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  {t('offer.description')}
                </p>
                <div className="bg-primary/5 border-l-4 border-accent rounded-r-xl p-5">
                  <p className="text-base md:text-lg font-medium text-foreground italic leading-relaxed">
                    &ldquo;{t('offer.highlight')}&rdquo;
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="fadeInRight" delay={150}>
              <OverlayImage
                src="/images/backgrounds/cosa-offriamo.JPG"
                alt="Casa in Ordine - Cosa offriamo"
                objectPosition="object-[center_1%]"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fadeInUpShorter">
            <h2 className="text-clamp-section font-normal text-foreground text-center mb-12">
              {t('mission.title')}
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <ScrollReveal key={i} animation="fadeInUpShorter" delay={i * 120}>
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />}
                      {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
                      {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{t(`mission.values.${i}.title`)}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{t(`mission.values.${i}.description`)}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="fadeInUpShorter">
            <h2 className="text-clamp-section font-normal text-foreground text-center mb-14">
              {t('methodology.title')}
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            {[0, 1, 2, 3].map((i) => (
              <ScrollReveal key={i} animation="fadeInUpShorter" delay={i * 100}>
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mb-4 text-lg font-bold shadow-md">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{t(`methodology.steps.${i}.title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`methodology.steps.${i}.description`)}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Goal / CTA ── */}
      <section className="py-16 md:py-24 bg-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal animation="fadeInUpShorter">
            <h2 className="text-clamp-section font-normal text-white mb-6">{t('goal.title')}</h2>
            <p className="text-lg text-white/75 leading-relaxed mb-8">
              {t('goal.description')}
            </p>
            <p className="text-xl md:text-2xl font-medium text-accent italic mb-10">
              {t('goal.motto')}
            </p>
            <Link
              href={`/${locale}/contact`}
              className="btn-slice group inline-flex"
            >
              <span className="btn-slice__label">{tNav('home.finalCta.cta')}</span>
              <svg className="btn-slice__arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
