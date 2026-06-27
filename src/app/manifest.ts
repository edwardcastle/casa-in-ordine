import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest (Next injects <link rel="manifest">). The
// proxy matcher excludes dotted paths, so this bypasses the locale middleware.
// start_url '/it' avoids the root->/it redirect on launch (localePrefix 'always').
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Casa in Ordine',
    short_name: 'Casa in Ordine',
    description: 'Decluttering e Home Organizing a Roma',
    start_url: '/it',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7B8F7A',
    icons: [
      { src: '/favicon_192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon_512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
