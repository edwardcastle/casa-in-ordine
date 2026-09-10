import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The services catalogue.
 *
 * The download section renders only when the PDF is actually present, so this
 * can ship before the file exists and switches itself on the deploy after it
 * lands — the same pattern as the reviews listing. The alternative is a button
 * that emails a link to a 404, which is worse than no button.
 */

export const CATALOG_FILE = 'casa-in-ordine-catalogo.pdf';
export const CATALOG_PATH = `/catalogo/${CATALOG_FILE}`;

// Checked once per server instance rather than per request: the file cannot
// appear without a deploy, and a deploy is a new instance.
let available: boolean | undefined;

export function isCatalogAvailable(): boolean {
  if (available === undefined) {
    available = existsSync(join(process.cwd(), 'public', 'catalogo', CATALOG_FILE));

    if (!available) {
      console.warn(
        `The catalogue download is hidden: public/catalogo/${CATALOG_FILE} does ` +
          'not exist. Add the PDF and redeploy.',
      );
    }
  }

  return available;
}

export function catalogUrl(origin: string): string {
  return `${origin}${CATALOG_PATH}`;
}
