import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { routing } from '@/i18n/routing';
import { getAllPosts, getPost, getPostLocales, getPostSlugs } from '@/lib/blog';
import { mdxComponents } from '@/components/MdxContent';

const baseUrl = 'https://casainordine.com';

export function generateStaticParams() {
  return getPostSlugs().flatMap((slug) =>
    getPostLocales(slug).map((locale) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(slug, locale);
  if (!post) return {};

  const localesWithPost = getPostLocales(slug);
  const languages: Record<string, string> = Object.fromEntries(
    localesWithPost.map((l) => [l, `${baseUrl}/${l}/blog/${slug}`]),
  );
  languages['x-default'] = `${baseUrl}/${routing.defaultLocale}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/${slug}`,
      languages,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `${baseUrl}/${locale}/blog/${slug}`,
      siteName: 'Casa in Ordine',
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: post.coverImage, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPost(slug, locale);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'blog' });

  const formattedDate = new Date(post.date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: `${baseUrl}${post.coverImage}`,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: locale,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Casa in Ordine',
      url: `${baseUrl}/${locale}`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/${locale}/blog/${slug}`,
    },
  };

  // Up to three related posts (same locale, excluding current).
  const related = getAllPosts(locale)
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  return (
    <article className="pb-16 md:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Cover header */}
      <header
        className="relative flex min-h-[18rem] flex-col justify-end bg-cover bg-center px-4 py-10 text-white sm:px-6 md:min-h-[24rem] lg:px-8"
        style={{ backgroundImage: `url(${post.coverImage})` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto w-full max-w-3xl">
          <Link
            href={`/${locale}/blog`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/80 transition-colors hover:text-white"
          >
            ← {t('title')}
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded bg-white/15 px-2 py-1 font-medium backdrop-blur">
              {post.category}
            </span>
            <time dateTime={post.date} className="text-white/80">
              {formattedDate}
            </time>
            {post.readingMinutes ? (
              <span className="text-white/80">· {post.readingMinutes} min</span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            {post.title}
          </h1>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 border-l-4 border-accent pl-4 text-lg italic text-foreground/70">
          {post.excerpt}
        </p>
        <div className="space-y-5 text-base leading-relaxed text-foreground/90">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>

        {/* Lead-in CTA to the quote flow */}
        <div className="mt-12 rounded-2xl bg-secondary-light p-8 text-center">
          <p className="mb-4 text-lg font-semibold text-foreground">
            {t('cta.title')}
          </p>
          <Link
            href={`/${locale}/preventivo`}
            className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            {t('cta.button')}
          </Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">
            {t('relatedTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/blog/${p.slug}`}
                className="group overflow-hidden rounded-xl border border-secondary/40 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="h-36 bg-cover bg-center"
                  style={{ backgroundImage: `url(${p.coverImage})` }}
                />
                <div className="p-4">
                  <span className="text-xs font-medium text-primary">
                    {p.category}
                  </span>
                  <h3 className="mt-1 font-semibold text-foreground group-hover:text-primary">
                    {p.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
