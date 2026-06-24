import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // All content routes except the /api namespace (POST-only JSON endpoints
      // that should not be tagged indexable).
      source: '/((?!api/).*)',
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
