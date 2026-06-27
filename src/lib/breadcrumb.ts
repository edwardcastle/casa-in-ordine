const baseUrl = 'https://casainordine.com';

/**
 * Build a schema.org BreadcrumbList for a top-level page. `path` is the
 * locale-relative route (e.g. '' for home, '/services'), matching the canonical
 * URL convention used across the site (`${baseUrl}/${locale}${path}`).
 */
export function breadcrumbLd(
  locale: string,
  trail: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${baseUrl}/${locale}${t.path}`,
    })),
  };
}
