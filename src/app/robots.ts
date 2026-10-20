import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The client area is behind a sign-in, so there is nothing for a crawler
      // there; its pages also say noindex, for the ones reached by a link.
      disallow: ['/api/', '/it/area', '/en/area', '/es/area'],
    },
    sitemap: 'https://casainordine.com/sitemap.xml',
  };
}
