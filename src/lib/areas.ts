import type { Zone } from '@/lib/quote/config';

/**
 * The pages under /services, one per area of the home.
 *
 * They follow the zones of the quote wizard rather than the four services on
 * /services, because that is how people look for this work — "organizzare
 * l'armadio", not "home organizing" — and how the business already prices it.
 * Their copy lives in messages/<locale>.json under `areas`, and says nothing
 * the wizard and the services page do not already say.
 *
 * The slug is Italian in every language, like the blog's: one URL per page per
 * locale, and no redirects to maintain if a translation is reworded.
 */
export interface Area {
  zone: Zone;
  slug: string;
  /** Background of the page's hero. */
  hero: string;
  /** The photograph beside the introduction; described by `areas.<zone>.imageAlt`. */
  image: string;
  /**
   * Blog posts on the same subject. The first three are shown on the area's
   * page; every one of them links back to it.
   */
  guides: string[];
}

export const AREAS: Area[] = [
  {
    zone: 'armadio',
    slug: 'organizzazione-armadio',
    hero: '/images/backgrounds/hero3.webp',
    image: '/images/gallery/closet-1.jpg',
    guides: [
      'organizzare-armadio-perfetto',
      'cambio-di-stagione-armadio',
      'organizzare-camera-da-letto',
    ],
  },
  {
    zone: 'cucina',
    slug: 'organizzazione-cucina-dispensa',
    hero: '/images/gallery/kitchen-2.jpg',
    image: '/images/gallery/kitchen-1.jpg',
    guides: ['cucina-organizzata-guida-pratica', 'organizzare-la-dispensa'],
  },
  {
    zone: 'bagno',
    slug: 'organizzazione-bagno',
    hero: '/images/gallery/living-4.jpg',
    image: '/images/gallery/bathroom-1.jpg',
    guides: ['organizzare-il-bagno'],
  },
  {
    zone: 'living',
    slug: 'organizzazione-soggiorno-home-office',
    hero: '/images/gallery/living-1.jpg',
    image: '/images/gallery/office-1.jpg',
    guides: [
      'organizzare-home-office',
      'organizzare-cameretta-bambini',
      'organizzare-documenti-di-casa',
      'organizzare-ingresso-di-casa',
    ],
  },
  {
    zone: 'trasloco',
    slug: 'decluttering-trasloco',
    hero: '/images/backgrounds/hero1.webp',
    image: '/images/gallery/living-2.jpg',
    guides: ['decluttering-prima-di-un-trasloco', 'come-iniziare-il-decluttering'],
  },
  {
    zone: 'garage',
    slug: 'organizzazione-garage-cantina',
    hero: '/images/backgrounds/bg-2.jpg',
    image: '/images/gallery/living-3.jpg',
    guides: ['organizzare-cantina-e-ripostiglio', 'come-risparmiare-spazio-in-casa'],
  },
];

/**
 * The quote page, opened on this area's first question. See QuoteWizard for
 * why the zone is a fragment and not a query string.
 */
export function quoteHref(locale: string, area?: Area): string {
  return `/${locale}/preventivo${area ? `#zona-${area.zone}` : ''}`;
}

export function getArea(slug: string): Area | undefined {
  return AREAS.find((area) => area.slug === slug);
}

/** The area a blog post belongs to, if any — for the link from post to service. */
export function getAreaForPost(postSlug: string): Area | undefined {
  return AREAS.find((area) => area.guides.includes(postSlug));
}
