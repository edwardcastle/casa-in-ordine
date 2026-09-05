import { db, isReviewsConfigured } from './db';
import type {
  AdminReview,
  PublicReview,
  ReviewLang,
  ReviewService,
  ReviewSource,
} from './types';

/** Below this the section renders nothing: two testimonials read worse than none. */
export const MIN_PUBLISHED = 3;

interface PublicRow {
  id: string;
  author_name: string;
  city: string | null;
  rating: number | null;
  body: string;
  lang: ReviewLang;
  services: ReviewService[];
  source: ReviewSource;
  google_url: string | null;
  submitted_at: Date;
}

function toPublic(row: PublicRow): PublicReview {
  return {
    id: row.id,
    authorName: row.author_name,
    city: row.city,
    rating: row.rating,
    body: row.body,
    lang: row.lang,
    services: row.services,
    source: row.source,
    googleUrl: row.google_url,
    submittedAt: row.submitted_at,
  };
}

/**
 * Approved reviews, ordered so the reader's own language comes first.
 *
 * Deliberately uncached. The obvious move is `unstable_cache` with a tag
 * invalidated on approval — but in Next 16 `revalidateTag` takes a cache
 * profile and drives the `'use cache'` tag system, and it does not invalidate
 * `unstable_cache` entries at all. Verified against a production build: after
 * an approval, the page kept serving the old list indefinitely. The `'use
 * cache'` directive would fix that, at the price of turning on
 * `cacheComponents` for the entire site — far too much blast radius for one
 * section.
 *
 * So it queries every render. That is one lookup on a partial index over a
 * table that will hold tens of rows, on a page already rendered on demand, and
 * it buys the property that matters most here: when a client withdraws her
 * review, it is gone on the next request rather than whenever a cache decides.
 */
export async function getPublishedReviews(locale: ReviewLang): Promise<PublicReview[]> {
  if (!isReviewsConfigured()) return [];

  const rows = await db()<PublicRow[]>`
    SELECT id, author_name, city, rating, body, lang, services, source,
           google_url, submitted_at
      FROM reviews
     WHERE status = 'approved'
     ORDER BY (lang = ${locale}) DESC, submitted_at DESC, id
  `;

  return rows.map(toPublic);
}

/** The homepage strip. Returns [] below the publication floor. */
export async function getFeaturedReviews(
  locale: ReviewLang,
  limit = 3,
): Promise<PublicReview[]> {
  const all = await getPublishedReviews(locale);
  return all.length < MIN_PUBLISHED ? [] : all.slice(0, limit);
}

export interface NewReview {
  authorName: string;
  authorEmail: string;
  city?: string;
  rating?: number;
  body: string;
  lang: ReviewLang;
  services: ReviewService[];
  consentText: string;
  consentIp: string;
}

/** Records a submission as `pending`. Nothing here reaches the public site. */
export async function insertPendingReview(input: NewReview): Promise<string> {
  const [row] = await db()<{ id: string }[]>`
    INSERT INTO reviews (
      author_name, author_email, city, rating, body, lang, services,
      source, status, consent_given, consent_text, consent_at, consent_ip
    ) VALUES (
      ${input.authorName}, ${input.authorEmail}, ${input.city ?? null},
      ${input.rating ?? null}, ${input.body}, ${input.lang},
      ${db().array(input.services)}, 'direct', 'pending',
      true, ${input.consentText}, now(), ${input.consentIp}
    )
    RETURNING id
  `;

  return row.id;
}

// `body` widens to null here: a withdrawn review keeps its row and its consent
// record but loses the words, which is the whole point of the removal path.
interface AdminRow extends Omit<PublicRow, 'body'> {
  author_email: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'removed';
  consent_given: boolean;
  consent_text: string | null;
  consent_at: Date | null;
  invoice_ref: string | null;
  decided_at: Date | null;
  decided_by: string | null;
  removed_at: Date | null;
}

function toAdmin(row: AdminRow): AdminReview {
  return {
    ...toPublic({ ...row, body: '' }),
    body: row.body,
    authorEmail: row.author_email,
    status: row.status,
    consentGiven: row.consent_given,
    consentText: row.consent_text,
    consentAt: row.consent_at,
    invoiceRef: row.invoice_ref,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    removedAt: row.removed_at,
  };
}

/** Everything, newest first — pending at the top, since that is the work. */
export async function listAllReviews(): Promise<AdminReview[]> {
  const rows = await db()<AdminRow[]>`
    SELECT id, author_name, author_email, city, rating, body, lang, services,
           source, google_url, status, consent_given, consent_text, consent_at,
           invoice_ref, submitted_at, decided_at, decided_by, removed_at
      FROM reviews
     ORDER BY (status = 'pending') DESC, submitted_at DESC
  `;

  return rows.map(toAdmin);
}

export async function getReview(id: string): Promise<AdminReview | null> {
  const rows = await db()<AdminRow[]>`
    SELECT id, author_name, author_email, city, rating, body, lang, services,
           source, google_url, status, consent_given, consent_text, consent_at,
           invoice_ref, submitted_at, decided_at, decided_by, removed_at
      FROM reviews
     WHERE id = ${id}
  `;

  return rows[0] ? toAdmin(rows[0]) : null;
}

export type DecisionOutcome = 'applied' | 'already-decided' | 'not-found';

/**
 * Approve or reject a pending review.
 *
 * The `status = 'pending'` guard is what makes a decision link single-use: once
 * a review has been decided, a replayed approval email changes nothing.
 */
export async function decideReview(
  id: string,
  decision: 'approved' | 'rejected',
  decidedBy: string,
  invoiceRef?: string,
): Promise<DecisionOutcome> {
  const exists = await db()<{ status: string }[]>`SELECT status FROM reviews WHERE id = ${id}`;
  if (exists.length === 0) return 'not-found';
  if (exists[0].status !== 'pending') return 'already-decided';

  if (decision === 'approved') {
    await db()`
      UPDATE reviews
         SET status = 'approved', decided_at = now(), decided_by = ${decidedBy},
             invoice_ref = COALESCE(${invoiceRef ?? null}, invoice_ref)
       WHERE id = ${id} AND status = 'pending'
    `;
  } else {
    // A rejected review is withdrawn outright: someone we could not match to a
    // client has no reason to stay on file with their words in it.
    await db()`
      UPDATE reviews
         SET status = 'removed', body = NULL, author_email = NULL,
             decided_at = now(), decided_by = ${decidedBy}, removed_at = now()
       WHERE id = ${id} AND status = 'pending'
    `;
  }

  return 'applied';
}

/**
 * Withdraw a published review (GDPR art. 7(3) / art. 17).
 *
 * The row survives with its consent record so there is proof the review existed
 * and was withdrawn on request; the words and the address are gone.
 */
export async function removeReview(id: string, removedBy: string): Promise<void> {
  await db()`
    UPDATE reviews
       SET status = 'removed', body = NULL, author_email = NULL,
           removed_at = now(), decided_by = ${removedBy}
     WHERE id = ${id}
  `;
}

/** Mirror a Google review the reviewer has given written permission to reproduce. */
export async function insertGoogleReview(input: {
  authorName: string;
  city?: string;
  rating: number;
  body: string;
  lang: ReviewLang;
  services: ReviewService[];
  googleUrl: string;
  consentText: string;
  invoiceRef?: string;
  addedBy: string;
}): Promise<string> {
  const [row] = await db()<{ id: string }[]>`
    INSERT INTO reviews (
      author_name, city, rating, body, lang, services, source, google_url,
      status, consent_given, consent_text, consent_at, invoice_ref,
      decided_at, decided_by
    ) VALUES (
      ${input.authorName}, ${input.city ?? null}, ${input.rating}, ${input.body},
      ${input.lang}, ${db().array(input.services)}, 'google', ${input.googleUrl},
      'approved', true, ${input.consentText}, now(), ${input.invoiceRef ?? null},
      now(), ${input.addedBy}
    )
    RETURNING id
  `;

  return row.id;
}
