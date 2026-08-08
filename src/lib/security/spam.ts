/**
 * Content heuristics for free-text fields.
 *
 * Tuned to be forgiving. A rejected real customer is a lost job, while a spam
 * message that gets through only costs someone ten seconds in the inbox — so
 * every rule here targets a pattern no genuine enquiry about tidying a house
 * would produce.
 */

const MIN_MESSAGE_LENGTH = 6;
// Counted separately from length: a string of punctuation can be long and
// still say nothing, and "How much?" is a real enquiry at nine characters.
const MIN_MESSAGE_LETTERS = 5;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_LINKS = 2;
const SCORE_THRESHOLD = 3;

import { gibberishScore } from './gibberish';

const URL_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|ru|cn|xyz|top|info|biz|online|site)\b/gi;

// Phrases from the cold-outreach and link-selling spam that hits small
// business contact forms. Matched case-insensitively as whole phrases.
const SPAM_PHRASES = [
  'seo service',
  'seo services',
  'search engine optimi',
  'backlink',
  'link building',
  'guest post',
  'domain authority',
  'first page of google',
  'rank your website',
  'increase your traffic',
  'digital marketing agency',
  'web design service',
  'crypto',
  'bitcoin',
  'forex',
  'binary option',
  'casino',
  'viagra',
  'cialis',
  'payday loan',
  'work from home',
  'make money online',
  'investment opportunity',
  'bulk email',
  'email list',
  'telegram.me',
  't.me/',
  'whatsapp me',
];

export type SpamProblem = 'too-short' | 'too-long' | 'looks-automated';

export type SpamCheck = { ok: true } | { ok: false; problem: SpamProblem };

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/**
 * Signals are additive: one on its own is survivable, several together are
 * not. Nothing here rejects on a single keyword.
 */
function automationScore(name: string, message: string): number {
  const haystack = `${name}\n${message}`.toLowerCase();
  let score = 0;

  const links = countMatches(message, URL_PATTERN);
  if (links > MAX_LINKS) score += 2;
  else if (links > 0) score += 1;

  const phrases = SPAM_PHRASES.filter((phrase) => haystack.includes(phrase)).length;
  score += Math.min(phrases * 2, 4);

  // Shouting for most of the message.
  const letters = message.replace(/[^a-z]/gi, '');
  if (letters.length > 20) {
    const upper = message.replace(/[^A-Z]/g, '').length;
    if (upper / letters.length > 0.6) score += 1;
  }

  // Keyboard mashing: a long run with no vowel inside a single word. Spaces
  // are left in place — stripping them joins ordinary Italian words into
  // consonant runs that read as gibberish when they are not. No language this
  // site serves puts eight consonants together, so this alone is enough.
  if (/[bcdfghjklmnpqrstvwxyz]{8,}/i.test(message)) score += SCORE_THRESHOLD;

  // Shorter mashed tokens slip past that run length — "jkhg kjhg kjhg" never
  // reaches eight in a row — so judge the text as words as well.
  score += gibberishScore(message, SCORE_THRESHOLD);

  // A wall of one repeated letter or digit. Punctuation is excluded on
  // purpose: an excited "Grazie!!!!!!!!!!" is a real message.
  if (/([a-z0-9])\1{9,}/i.test(message)) score += SCORE_THRESHOLD;

  // BBCode or raw anchor tags — a form post has no reason to carry markup.
  if (/\[url[=\]]|<a\s+href=/i.test(message)) score += 3;

  return score;
}

interface CheckMessageOptions {
  /**
   * Set for fields the visitor did not have to fill in. The minimum length is
   * then skipped: a quote wizard note reading "grazie" is a real note, while a
   * contact form whose whole message is six characters tells us nothing.
   */
  optional?: boolean;
}

export function checkMessage(
  name: string,
  message: string,
  { optional = false }: CheckMessageOptions = {},
): SpamCheck {
  const trimmed = message.trim();

  const letterCount = (trimmed.match(/[a-zà-öø-ÿ]/gi) ?? []).length;
  if (!optional && (trimmed.length < MIN_MESSAGE_LENGTH || letterCount < MIN_MESSAGE_LETTERS)) {
    return { ok: false, problem: 'too-short' };
  }
  // Even an optional note has to be words rather than punctuation.
  if (trimmed.length > 0 && letterCount === 0) {
    return { ok: false, problem: 'looks-automated' };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { ok: false, problem: 'too-long' };

  if (automationScore(name, trimmed) >= SCORE_THRESHOLD) {
    return { ok: false, problem: 'looks-automated' };
  }

  return { ok: true };
}

/** Length caps for the short fields, so nothing unbounded reaches the mailer. */
export const FIELD_LIMITS = {
  name: 100,
  phone: 40,
  notes: 2_000,
} as const;

export function withinLimit(value: string | undefined, limit: number): boolean {
  return !value || value.trim().length <= limit;
}
