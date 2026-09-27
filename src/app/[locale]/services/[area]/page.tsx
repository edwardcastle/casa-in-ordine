import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Hero from '@/components/Hero';
import OverlayImage from '@/components/OverlayImage';
import { routing } from '@/i18n/routing';
import { AREAS, getArea } from '@/lib/areas';
import { breadcrumbLd } from '@/lib/breadcrumb';
import { getPostMeta } from '@/lib/blog';
import type { PostMeta } from '@/lib/blog';

const baseUrl = 'https://casainordine.com';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    AREAS.map((area) => ({ locale, area: area.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}): Promise<Metadata> {
  const { locale, area: slug } = await params;
  const area = getArea(slug);
  if (!area) return {};

  const t = await getTranslations({ locale, namespace: `areas.${area.zone}` });
  const path = `/services/${area.slug}`;

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}${path}`,
      languages: {
        ...Object.fromEntries(
          routing.locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
        ),
        'x-default': `${baseUrl}/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `${baseUrl}/${locale}${path}`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [{ url: '/images/logo/logo_1200x630.png', width: 1200, height: 630, alt: 'Casa in Ordine' }],
    },
  };
}

function Check() {
  return (
    <svg className="w-5 h-5 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale, area: slug } = await params;
  // Lets the page be prerendered instead of rendered on every request.
  setRequestLocale(locale);

  const area = getArea(slug);
  if (!area) notFound();

  const t = await getTranslations({ locale, namespace: `areas.${area.zone}` });
  const tAreas = await getTranslations({ locale, namespace: 'areas' });
  const tCommon = await getTranslations({ locale, namespace: 'areas.common' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tMethod = await getTranslations({ locale, namespace: 'about.methodology' });

  const path = `/services/${area.slug}`;
  const faq = t.raw('faq') as { question: string; answer: string }[];

  const guides = area.guides
    .map((guide) => getPostMeta(guide, locale))
    .filter((post): post is PostMeta => post !== null)
    .slice(0, 3);

  const others = AREAS.filter((other) => other.zone !== area.zone);

  const breadcrumbSchema = breadcrumbLd(locale, [
    { name: tNav('home'), path: '' },
    { name: tNav('services'), path: '/services' },
    { name: t('name'), path },
  ]);

  // Describes the service and nothing else: no price, because the only figure
  // there is comes out of the quote wizard and depends on the answers given to
  // it, and no rating, for the reasons set out on the reviews page.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('heroTitle'),
    description: t('metaDescription'),
    serviceType: t('name'),
    url: `${baseUrl}/${locale}${path}`,
    inLanguage: locale === 'it' ? 'it-IT' : locale === 'es' ? 'es-ES' : 'en-US',
    provider: { '@id': `${baseUrl}/#organization` },
    areaServed: { '@type': 'City', name: 'Roma' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        cta={{ text: tCommon('ctaButton'), href: `/${locale}/preventivo` }}
        backgroundImage={area.hero}
      />

      {/* Introduction */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-10 text-sm text-gray-500">
            <Link href={`/${locale}`} className="hover:text-primary transition-colors">{tNav('home')}</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={`/${locale}/services`} className="hover:text-primary transition-colors">{tNav('services')}</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-foreground">{t('name')}</span>
          </nav>
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{t('introTitle')}</h2>
              <div className="space-y-5 text-lg text-gray-600 leading-relaxed">
                {(t.raw('intro') as string[]).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
            <OverlayImage src={area.image} alt={t('imageAlt')} />
          </div>
        </div>
      </section>

      {/* When to call / what it covers */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{tCommon('signsTitle')}</h2>
              <ul className="space-y-4">
                {(t.raw('signs') as string[]).map((sign, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span className="text-gray-600 leading-relaxed">{sign}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{tCommon('includesTitle')}</h2>
              <ul className="space-y-4">
                {(t.raw('includes') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check />
                    <span className="text-gray-600 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Method — the same four steps as the About page, in the same words */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-14">
            {tMethod('title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mb-4 text-lg font-bold shadow-md">
                  {i + 1}
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">{tMethod(`steps.${i}.title`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tMethod(`steps.${i}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="py-16 md:py-24 bg-secondary-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">{tCommon('faqTitle')}</h2>
          <div className="space-y-8">
            {faq.map((item, i) => (
              <div key={i}>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.question}</h3>
                <p className="text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      {guides.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">{tCommon('guidesTitle')}</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {guides.map((post) => (
                <Link
                  key={post.slug}
                  href={`/${locale}/blog/${post.slug}`}
                  className="group block h-full overflow-hidden rounded-xl border border-secondary/30 bg-white shadow-md transition-shadow hover:shadow-lg"
                >
                  <div className="relative h-44">
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt ?? post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="text-sm text-foreground/70">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other areas */}
      <section className="py-12 md:py-16 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">{tCommon('othersTitle')}</h2>
          <ul className="flex flex-wrap gap-3">
            {others.map((other) => (
              <li key={other.zone}>
                <Link
                  href={`/${locale}/services/${other.slug}`}
                  className="inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:text-primary"
                >
                  {tAreas(`${other.zone}.name`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{tCommon('ctaTitle')}</h2>
          <p className="text-lg text-white/90 mb-8">{tCommon('ctaBody')}</p>
          <Link
            href={`/${locale}/preventivo`}
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-secondary-light transition-colors duration-200 shadow-lg"
          >
            {tCommon('ctaButton')}
          </Link>
        </div>
      </section>
    </>
  );
}
