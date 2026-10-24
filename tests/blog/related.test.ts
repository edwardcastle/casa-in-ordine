import { describe, expect, it } from 'vitest';
import { getAllPosts, getRelatedPosts } from '@/lib/blog';
import { routing } from '@/i18n/routing';

const related = (slug: string, locale = 'it') =>
  getRelatedPosts(slug, locale, 3).map((p) => p.slug);

describe('getRelatedPosts', () => {
  it('puts guides about the same part of the home first', () => {
    expect(related('organizzare-armadio-perfetto')).toEqual(
      expect.arrayContaining(['cambio-di-stagione-armadio', 'organizzare-camera-da-letto']),
    );
    expect(related('cucina-organizzata-guida-pratica')[0]).toBe('organizzare-la-dispensa');
    expect(related('organizzare-la-dispensa')[0]).toBe('cucina-organizzata-guida-pratica');
    expect(related('organizzare-cantina-e-ripostiglio')[0]).toBe('come-risparmiare-spazio-in-casa');
  });

  it('never returns the post itself, and returns the requested number', () => {
    for (const post of getAllPosts('it')) {
      const slugs = related(post.slug);
      expect(slugs).not.toContain(post.slug);
      expect(slugs).toHaveLength(3);
      expect(new Set(slugs).size).toBe(3);
    }
  });

  // The widget is the main way one guide links to another. When every
  // "Organizzazione" post tied, the same three posts were recommended by
  // almost half the blog and eight posts were recommended by none.
  it.each(routing.locales)('spreads links across the blog (%s)', (locale) => {
    const posts = getAllPosts(locale);
    const inlinks = new Map(posts.map((p) => [p.slug, 0]));
    for (const post of posts) {
      for (const slug of related(post.slug, locale)) {
        inlinks.set(slug, (inlinks.get(slug) ?? 0) + 1);
      }
    }
    const counts = [...inlinks.values()];
    expect(Math.max(...counts)).toBeLessThanOrEqual(6);
    expect(counts.filter((n) => n === 0).length).toBeLessThanOrEqual(1);
  });
});
