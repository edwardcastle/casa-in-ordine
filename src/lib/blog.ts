import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { routing } from '@/i18n/routing';

export type Locale = (typeof routing.locales)[number];

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface PostFrontmatter {
  title: string;
  description: string;
  excerpt: string;
  date: string; // ISO date, e.g. 2026-06-13
  category: string;
  keywords: string[];
  coverImage: string;
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

/** All posts for a locale, newest first. */
export function getAllPosts(locale: string): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostMeta(slug, locale))
    .filter((p): p is PostMeta => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Locales for which a given post exists (drives hreflang alternates). */
export function getPostLocales(slug: string): Locale[] {
  return routing.locales.filter((locale) =>
    fs.existsSync(postFilePath(slug, locale)),
  );
}
