import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/Hero';
import { getAllPosts } from '@/lib/blog';

const baseUrl = 'https://casainordine.com';
const locales = ['it', 'en', 'es'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });

  return {
    // `metaTitle` is keyword-bearing for the SERP; `title` stays "Blog" because
    // it's reused as the post-page back-link label.
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `${baseUrl}/${l}/blog`])),
        'x-default': `${baseUrl}/it/blog`,
      },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: `${baseUrl}/${locale}/blog`,
      siteName: 'Casa in Ordine',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/logo/logo_1200x630.png',
          width: 1200,
          height: 630,
          alt: 'Casa in Ordine',
        },
      ],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const posts = getAllPosts(locale);

  return (
    <>
      <Hero
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        backgroundImage="/images/backgrounds/bg-3.jpg"
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-secondary-light p-8 text-center md:p-12">
              <h2 className="mb-3 text-2xl font-bold text-foreground">
                {t('comingSoon')}
              </h2>
              <p className="mx-auto max-w-lg text-foreground/70">
                {t('comingSoonDescription')}
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => {
                const date = new Date(post.date).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <article
                    key={post.slug}
                    className="overflow-hidden rounded-xl border border-secondary/30 bg-white shadow-md transition-shadow hover:shadow-lg"
                  >
                    <Link
                      href={`/${locale}/blog/${post.slug}`}
                      className="group block"
                    >
                      <div className="relative h-48">
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {post.category}
                          </span>
                          <time
                            dateTime={post.date}
                            className="text-xs text-foreground/40"
                          >
                            {date}
                          </time>
                        </div>
                        <h2 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary">
                          {post.title}
                        </h2>
                        <p className="text-sm text-foreground/70">
                          {post.excerpt}
                        </p>
                        <span className="mt-4 inline-block text-sm font-medium text-accent">
                          {t('readMore')} →
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
