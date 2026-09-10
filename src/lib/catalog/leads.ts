import { db } from '@/lib/reviews/db';
import type { ReviewLang } from '@/lib/reviews/types';

export interface NewCatalogLead {
  email: string;
  name?: string;
  lang: ReviewLang;
  marketingConsent: boolean;
  /** The exact opt-in sentence shown, stored only when it was ticked. */
  consentText?: string;
  consentIp: string;
}

export async function insertCatalogLead(input: NewCatalogLead): Promise<string> {
  const [row] = await db()<{ id: string }[]>`
    INSERT INTO catalog_leads (
      email, name, lang, marketing_consent, consent_text, consent_at, consent_ip
    ) VALUES (
      ${input.email}, ${input.name ?? null}, ${input.lang},
      ${input.marketingConsent},
      ${input.marketingConsent ? (input.consentText ?? null) : null},
      ${input.marketingConsent ? db()`now()` : null},
      ${input.consentIp}
    )
    RETURNING id
  `;

  return row.id;
}

/** Recorded separately from the request, so a failed send is visible as a gap. */
export async function markCatalogSent(id: string): Promise<void> {
  await db()`UPDATE catalog_leads SET sent_at = now() WHERE id = ${id}`;
}

export interface CatalogLead {
  id: string;
  email: string;
  name: string | null;
  lang: ReviewLang;
  marketingConsent: boolean;
  consentText: string | null;
  consentAt: Date | null;
  requestedAt: Date;
  sentAt: Date | null;
}

interface LeadRow {
  id: string;
  email: string;
  name: string | null;
  lang: ReviewLang;
  marketing_consent: boolean;
  consent_text: string | null;
  consent_at: Date | null;
  requested_at: Date;
  sent_at: Date | null;
}

/** Newest first. The table is a log, so the same address can appear twice. */
export async function listCatalogLeads(): Promise<CatalogLead[]> {
  const rows = await db()<LeadRow[]>`
    SELECT id, email, name, lang, marketing_consent, consent_text, consent_at,
           requested_at, sent_at
      FROM catalog_leads
     ORDER BY requested_at DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    lang: r.lang,
    marketingConsent: r.marketing_consent,
    consentText: r.consent_text,
    consentAt: r.consent_at,
    requestedAt: r.requested_at,
    sentAt: r.sent_at,
  }));
}

/**
 * Erasure (GDPR art. 17) and consent withdrawal (art. 7(3)).
 *
 * Deleted outright rather than blanked, unlike a review: there is nothing
 * published to account for, so keeping the address would serve only us.
 */
export async function deleteCatalogLead(id: string): Promise<void> {
  await db()`DELETE FROM catalog_leads WHERE id = ${id}`;
}

/** How many times this address has asked. A repeat ask is a warmer lead. */
export async function countRequestsFor(email: string): Promise<number> {
  const [row] = await db()<{ n: string }[]>`
    SELECT count(*)::text AS n FROM catalog_leads WHERE lower(email) = lower(${email})
  `;
  return Number(row?.n ?? 0);
}
