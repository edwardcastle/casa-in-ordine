import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { routing } from '@/i18n/routing';
import { getAreaForPost } from '@/lib/areas';

export type Locale = (typeof routing.locales)[number];

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface PostFrontmatter {
  title: string;
  description: string;
  excerpt: string;
  date: string; // ISO date, e.g. 2026-06-13
  updated?: string; // ISO date; bump when editing an existing post so lastmod/dateModified reflect the edit
  category: string;
  keywords: string[];
  coverImage: string;
  coverAlt?: string; // what the cover shows, in the post's language; falls back to the title
  author: string;
  readingMinutes?: number;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  locale: Locale;
}

export interface Post extends PostMeta {
  content: string; // MDX body with frontmatter stripped
}

function postFilePath(slug: string, locale: string): string {
  return path.join(BLOG_DIR, slug, `${locale}.mdx`);
}

/** All post slugs (one directory per post). */
export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/** Read a single post (frontmatter + MDX body) for a locale, or null if absent. */
export function getPost(slug: string, locale: string): Post | null {
  const file = postFilePath(slug, locale);
  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  return {
    slug,
    locale: locale as Locale,
    content,
    ...(data as PostFrontmatter),
  };
}

/** Read only the metadata for a post/locale (no MDX body), or null if absent. */
export function getPostMeta(slug: string, locale: string): PostMeta | null {
  const post = getPost(slug, locale);
  if (!post) return null;
  const { content: _content, ...meta } = post;
  void _content;
  return meta;
}

/** All posts for a locale, newest first (slug as a stable tiebreak). */
export function getAllPosts(locale: string): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostMeta(slug, locale))
    .filter((p): p is PostMeta => p !== null)
    // Total-order comparator: equal dates fall back to slug so the listing
    // order is deterministic across builds/filesystems (10+ posts share a date).
    .sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug),
    );
}

/**
 * Posts most related to `slug`, for the "related" cards under a post.
 *
 * Scored, highest first:
 *   +4  both are guides for the same area of the home (AREAS in lib/areas),
 *       the closest thing to "same subject" the content has;
 *   +2  same category;
 *   +1  per shared keyword, ignoring keywords on more than a third of the
 *       posts ("home organizing Roma" is on nearly all of them, so it said
 *       nothing and made every post tie).
 * Ties go to the posts that follow this one in the listing, wrapping round.
 * With newest-first as the tiebreak instead, eleven "Organizzazione" posts
 * share a date and all recommended the same three, while eight posts were
 * recommended by none: the cards are the main post-to-post link, so the
 * tiebreak decides which guides get crawled from the rest of the blog.
 */
export function getRelatedPosts(
  slug: string,
  locale: string,
  limit = 3,
): PostMeta[] {
  const all = getAllPosts(locale);
  const index = all.findIndex((p) => p.slug === slug);
  if (index === -1) return all.slice(0, limit);
  const current = all[index];

  const postsWith = new Map<string, number>();
  for (const post of all) {
    for (const keyword of new Set(post.keywords ?? [])) {
      postsWith.set(keyword, (postsWith.get(keyword) ?? 0) + 1);
    }
  }
  const keywords = new Set(
    (current.keywords ?? []).filter((k) => (postsWith.get(k) ?? 0) <= all.length / 3),
  );
  const area = getAreaForPost(slug);

  return all
    .map((post, i) => {
      let score = area?.guides.includes(post.slug) ? 4 : 0;
      if (post.category === current.category) score += 2;
      score += (post.keywords ?? []).filter((k) => keywords.has(k)).length;
      return { post, score, distance: (i - index + all.length) % all.length };
    })
    .filter(({ post }) => post.slug !== slug)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, limit)
    .map(({ post }) => post);
}

// Covers cut by scripts/build-covers.mjs are all this size, so it can be stated
// for them. A cover from anywhere else has its size left out rather than
// guessed: a wrong og:image:width is worse than none.
const GENERATED_COVERS = '/images/blog/';
const COVER_SIZE = { width: 1600, height: 840 };

/** A post's cover, as an Open Graph image. */
export function coverOgImage(post: PostMeta) {
  return {
    url: post.coverImage,
    alt: post.coverAlt ?? post.title,
    ...(post.coverImage.startsWith(GENERATED_COVERS) ? COVER_SIZE : {}),
  };
}

/** Locales for which a given post exists (drives hreflang alternates). */
export function getPostLocales(slug: string): Locale[] {
  return routing.locales.filter((locale) =>
    fs.existsSync(postFilePath(slug, locale)),
  );
}
