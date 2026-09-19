import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // The moderation pages are behind a session, but a blanket
      // `index, follow` on every route would still invite a crawler to try.
      source: '/admin/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    },
    {
      // All content routes except the /api namespace (POST-only JSON endpoints
      // that should not be tagged indexable) and /admin, handled above.
      // `_next/` is excluded because this header was telling Google to index
      // the build output: every chunk and stylesheet was served
      // `index, follow`, and Search Console duly reported .js and .css files
      // as crawled-not-indexed, on a site where real pages are going
      // uncrawled. They must still not be blocked in robots.txt — Google needs
      // them to render — they simply should not be advertised as pages.
      source: '/((?!api/|admin|_next/).*)',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
