import { createHash, randomBytes } from 'node:crypto';
import { db, isReviewsConfigured } from './db';
import { refreshPublishedReviews } from './refresh';
import type {
  AdminReview,
  PublicReview,
  ReviewLang,
  ReviewService,
  ReviewSource,
} from './types';

/**
 * How many approved reviews before the homepage section appears.
 *
 * Was 3, on the reasoning that two testimonials read worse than none. The
 * owner's call is to show them from the first one — a real, consented review
 * from a named client says more than an empty space, and there is no longer a
 * fabricated one anywhere to be confused with it.
 */
export const MIN_PUBLISHED = 1;

/**
 * When the listing page becomes indexable and enters the sitemap.
 *
 * The page itself resolves as soon as a single review is published — a visitor
 * following "vedi tutte" must never hit a 404. This threshold is only about
 * crawlers: one review rendered at /it, /en and /es is three near-duplicate
 * pages with nothing on them, which is what the rest of the site has been kept
 * clear of. Below it the page is `noindex, follow` and stays out of the
 * sitemap; above it, both switch on by themselves.
 */
export const MIN_LISTING_INDEXED = 6;

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
 * The query itself is deliberately uncached. The obvious move is
 * `unstable_cache` with a tag invalidated on approval — but in Next 16
 * `revalidateTag` takes a cache profile and drives the `'use cache'` tag
 * system, and it does not invalidate `unstable_cache` entries at all. Verified
 * against a production build: after an approval, the page kept serving the old
 * list indefinitely. The `'use cache'` directive would fix that, at the price
 * of turning on `cacheComponents` for the entire site — far too much blast
 * radius for one section.
 *
 * What is cached is the page around it. /recensioni and the sitemap render per
 * request and run this every time. The homepage is built once and kept, which
 * is where its speed comes from, and every write below that changes what is
 * public calls `refreshPublishedReviews` to throw that copy away. The property
 * that matters most is unchanged: when a client withdraws her review, it is
 * gone on the next request rather than whenever a cache decides.
 */
export async function getPublishedReviews(locale: ReviewLang): Promise<PublicReview[]> {
  if (!isReviewsConfigured()) return [];

  try {
    const rows = await db()<PublicRow[]>`
      SELECT id, author_name, city, rating, body, lang, services, source,
             google_url, submitted_at
        FROM reviews
       WHERE status = 'approved'
       ORDER BY (lang = ${locale}) DESC, submitted_at DESC, id
    `;

    return rows.map(toPublic);
  } catch (error) {
    // The homepage renders this. An unreachable database — an outage, a
    // rotated password, connections exhausted — used to take the whole page
    // down with a 500, which is an absurd price for a decorative strip of
    // testimonials. It now degrades to showing none, loudly.
    //
    // Deliberately not applied to the admin queries: there, a database error
    // is the answer to the question being asked and must surface.
    console.error('Could not load published reviews; rendering without them.', error);
    return [];
  }
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

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Records a submission as `pending`, and returns the withdrawal token.
 *
 * Only the hash is stored. The raw token goes into the client's email and
 * nowhere else, so it cannot be recovered from the database — which is the
 * point: a leak must not hand anyone the ability to delete other people's
 * reviews.
 */
export async function insertPendingReview(
  input: NewReview,
): Promise<{ id: string; withdrawToken: string }> {
  const withdrawToken = randomBytes(32).toString('base64url');

  const [row] = await db()<{ id: string }[]>`
    INSERT INTO reviews (
      author_name, author_email, city, rating, body, lang, services,
      source, status, consent_given, consent_text, consent_at, consent_ip,
      withdraw_token_hash
    ) VALUES (
      ${input.authorName}, ${input.authorEmail}, ${input.city ?? null},
      ${input.rating ?? null}, ${input.body}, ${input.lang},
      ${input.services}::text[], 'direct', 'pending',
      true, ${input.consentText}, now(), ${input.consentIp},
      ${hashToken(withdrawToken)}
    )
    RETURNING id
  `;

  return { id: row.id, withdrawToken };
}

/**
 * Looks a review up by its withdrawal token WITHOUT spending it.
 *
 * The link opens a confirmation page, so it has to survive being followed —
 * including by a mail client that prefetches links, which must never delete
 * anything on its own.
 */
export async function findByWithdrawToken(token: string): Promise<PublicReview | null> {
  if (!token) return null;

  const rows = await db()<PublicRow[]>`
    SELECT id, author_name, city, rating, body, lang, services, source,
           google_url, submitted_at
      FROM reviews
     WHERE withdraw_token_hash = ${hashToken(token)}
       AND status <> 'removed'
       AND body IS NOT NULL
  `;

  return rows[0] ? toPublic(rows[0]) : null;
}

export type WithdrawOutcome = 'withdrawn' | 'not-found';

/**
 * The author removing her own review (GDPR art. 7(3)).
 *
 * Same shape as an admin withdrawal — the words and the address go, the row
 * and its consent record stay as proof the review existed and was withdrawn.
 * The token is cleared too, so the link stops working afterwards.
 */
export async function withdrawByToken(token: string): Promise<WithdrawOutcome> {
  if (!token) return 'not-found';

  const rows = await db()<{ id: string }[]>`
    UPDATE reviews
       SET status = 'removed', body = NULL, author_email = NULL,
           removed_at = now(), decided_by = 'author',
           withdraw_token_hash = NULL
     WHERE withdraw_token_hash = ${hashToken(token)}
       AND status <> 'removed'
    RETURNING id
  `;

  if (rows.length === 0) return 'not-found';

  refreshPublishedReviews();
  return 'withdrawn';
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
    refreshPublishedReviews();
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
  refreshPublishedReviews();
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
      ${input.lang}, ${input.services}::text[], 'google', ${input.googleUrl},
      'approved', true, ${input.consentText}, now(), ${input.invoiceRef ?? null},
      now(), ${input.addedBy}
    )
    RETURNING id
  `;

  refreshPublishedReviews();
  return row.id;
}
