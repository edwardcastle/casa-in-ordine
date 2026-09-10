import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ReviewLang } from '@/lib/reviews/types';

/**
 * The services catalogue.
 *
 * One PDF per language, because the request email is localised and sending an
 * Italian brochure to someone who asked in English undoes the point of having
 * three locales. They are generated from messages/<locale>.json by
 * `pnpm build:catalog`, so the catalogue cannot drift from the site.
 *
 * The download section renders only where the file for that language actually
 * exists, so this ships safely before the PDFs do and switches itself on the
 * deploy after they land — a button that emails a link to a 404 is worse than
 * no button.
 */

export function catalogFile(locale: string): string {
  return `casa-in-ordine-catalogo-${locale}.pdf`;
}

export function catalogPath(locale: string): string {
  return `/catalogo/${catalogFile(locale)}`;
}

// Checked once per language per server instance: the files cannot appear
// without a deploy, and a deploy is a new instance.
const checked = new Map<string, boolean>();

export function isCatalogAvailable(locale: string): boolean {
  let available = checked.get(locale);

  if (available === undefined) {
    available = existsSync(join(process.cwd(), 'public', 'catalogo', catalogFile(locale)));
    checked.set(locale, available);

    if (!available) {
      console.warn(
        `The catalogue download is hidden for "${locale}": ` +
          `public/catalogo/${catalogFile(locale)} does not exist. ` +
          'Run `pnpm build:catalog` and redeploy.',
      );
    }
  }

  return available;
}

export function catalogUrl(origin: string, locale: ReviewLang): string {
  return `${origin}${catalogPath(locale)}`;
}
