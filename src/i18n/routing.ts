import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['it', 'en', 'es'],
  defaultLocale: 'it',
  // The middleware's own hreflang `Link` header is switched off: it cannot
  // know which translations a page has, it answers on 404s and noindex pages
  // alike, and its x-default is the unprefixed URL (`/services`), which only
  // exists as a redirect. Each page.tsx already states its alternates in the
  // HTML, with x-default on /it — two sources that disagree are worse than one.
  alternateLinks: false,
});
