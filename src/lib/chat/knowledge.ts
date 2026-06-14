import { routing } from '@/i18n/routing';

type Locale = (typeof routing.locales)[number];

/**
 * Namespaces from the i18n messages that carry no useful business knowledge
 * for the assistant (pure UI chrome, legal boilerplate, error pages).
 */
const EXCLUDED_NAMESPACES = new Set([
  'cookieConsent',
  'notFound',
  'privacyPolicy',
  'nav',
  'footer',
]);

const cache = new Map<Locale, string>();

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

/**
 * Recursively flatten a messages object into readable "Label: value" lines so
 * the model can answer from the exact copy shown on the site.
 */
function flatten(value: unknown, path: string[], lines: string[]): void {
  if (value == null) return;

  if (typeof value === 'string' || typeof value === 'number') {
    const label = path.join(' › ');
    const text = String(value).trim();
    if (text) lines.push(`${label}: ${text}`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flatten(item, [...path, `#${index + 1}`], lines);
    });
    return;
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flatten(child, [...path, key], lines);
    }
  }
}

/**
 * Build (and cache) the business knowledge text for a locale by flattening the
 * site's own i18n content. Editing `messages/<locale>.json` updates what the
 * assistant knows on the next deploy — there is no separate knowledge base.
 */
export async function getKnowledge(locale: string): Promise<string> {
  const resolved: Locale = isLocale(locale) ? locale : routing.defaultLocale;

  const cached = cache.get(resolved);
  if (cached) return cached;

  const messages = (await import(`../../../messages/${resolved}.json`)).default as Record<
    string,
    unknown
  >;

  const lines: string[] = [];
  for (const [namespace, content] of Object.entries(messages)) {
    if (EXCLUDED_NAMESPACES.has(namespace)) continue;
    flatten(content, [namespace], lines);
  }

  const knowledge = lines.join('\n');
  cache.set(resolved, knowledge);
  return knowledge;
}
