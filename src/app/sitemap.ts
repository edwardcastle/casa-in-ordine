import type { MetadataRoute } from 'next';
import { getAllPosts, getPostLocales } from '@/lib/blog';
import { getPublishedReviews, MIN_LISTING_INDEXED } from '@/lib/reviews/queries';

/**
 * Rendered per request rather than prerendered at build time.
 *
 * The /recensioni entry depends on how many reviews are published, which
 * changes when a founder approves one — not when the site is deployed. A static
 * sitemap would keep claiming the page does not exist until the next unrelated
 * deploy. Crawlers fetch this a handful of times a day, so the query is free.
 */
export const dynamic = 'force-dynamic';

const baseUrl = 'https://casainordine.com';
const locales = ['it', 'en', 'es'];
const defaultLocale = 'it';

const pages = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.7 },
  { path: '/preventivo', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Newest post date drives /blog's lastmod (it's the only static page whose
  // content genuinely changes). Other static pages omit lastModified rather than
  // stamp the build time, which would be a false "everything changed" signal on
  // every deploy and gets lastmod discounted site-wide.
  const defaultPosts = getAllPosts(defaultLocale);
  const blogLastModified = defaultPosts.length
    ? new Date(
        Math.max(
          ...defaultPosts.map((p) => new Date(p.updated ?? p.date).getTime())
        )
      )
    : undefined;

  // /recensioni resolves from the first review, but is noindex until it has
  // enough to be worth a page in three languages — so it is only listed here
  // once it is actually indexable. Submitting a noindex URL is a self-inflicted
  // coverage warning in Search Console.
  const reviewCount = (await getPublishedReviews(defaultLocale as 'it')).length;
  const routes =
    reviewCount >= MIN_LISTING_INDEXED
      ? [
          ...pages,
          { path: '/recensioni', changeFrequency: 'weekly' as const, priority: 0.6 },
        ]
      : pages;

  for (const page of routes) {
    for (const locale of locales) {
      const lastModified = page.path === '/blog' ? blogLastModified : undefined;
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: {
            ...Object.fromEntries(
              locales.map((l) => [l, `${baseUrl}/${l}${page.path}`])
            ),
            'x-default': `${baseUrl}/${defaultLocale}${page.path}`,
          },
        },
      });
    }
  }

  // Blog posts: one entry per locale, with hreflang to every locale the post
  // exists in. x-default points at the default locale only when that translation
  // exists, otherwise at the first available locale (no broken alternate).
  for (const locale of locales) {
    for (const post of getAllPosts(locale)) {
      const postLocales = getPostLocales(post.slug);
      const xDefaultLocale = postLocales.includes(defaultLocale)
        ? defaultLocale
        : postLocales[0];
      entries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.updated ?? post.date),
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: {
            ...Object.fromEntries(
              postLocales.map((l) => [l, `${baseUrl}/${l}/blog/${post.slug}`])
            ),
            'x-default': `${baseUrl}/${xDefaultLocale}/blog/${post.slug}`,
          },
        },
      });
    }
  }

  return entries;
}
