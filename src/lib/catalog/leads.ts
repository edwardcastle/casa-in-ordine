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
