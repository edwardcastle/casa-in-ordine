import type { MetadataRoute } from 'next';
import { getAllPosts, getPostLocales } from '@/lib/blog';

const baseUrl = 'https://casainordine.com';
const locales = ['it', 'en', 'es'];

const pages = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.7 },
  { path: '/preventivo', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority:
          locale === 'it'
            ? page.priority
            : Math.round(page.priority * 0.9 * 100) / 100,
        alternates: {
          languages: {
            ...Object.fromEntries(
              locales.map((l) => [l, `${baseUrl}/${l}${page.path}`])
            ),
            'x-default': `${baseUrl}/it${page.path}`,
          },
        },
      });
    }
  }

  // Blog posts: one entry per locale, with hreflang to every locale the post exists in.
  for (const locale of locales) {
    for (const post of getAllPosts(locale)) {
      const postLocales = getPostLocales(post.slug);
      entries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: locale === 'it' ? 0.7 : 0.63,
        alternates: {
          languages: {
            ...Object.fromEntries(
              postLocales.map((l) => [l, `${baseUrl}/${l}/blog/${post.slug}`])
            ),
            'x-default': `${baseUrl}/it/blog/${post.slug}`,
          },
        },
      });
    }
  }

  return entries;
}