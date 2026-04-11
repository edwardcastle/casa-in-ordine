import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.casainordine.com';
const locales = ['it', 'en', 'es'];

const pages = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date('2026-03-25'),
        changeFrequency: page.changeFrequency,
        priority: locale === 'it' ? page.priority : page.priority * 0.9,
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

  return entries;
}
