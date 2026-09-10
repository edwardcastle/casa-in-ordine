'use server';

import { headers } from 'next/headers';
import { guardSubmission } from '@/lib/security/guard';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/security/fields';
import { clientIp } from '@/lib/security/rate-limit';
import { isReviewsConfigured } from '@/lib/reviews/db';
import { isReviewLang } from '@/lib/reviews/types';
import { insertCatalogLead, markCatalogSent, type NewCatalogLead } from '@/lib/catalog/leads';
import { notifyCatalogLead, sendCatalog } from '@/lib/catalog/emails';
import { isCatalogAvailable } from '@/lib/catalog';

export type CatalogResult = { success: true } | { success: false; reason: string };

/**
 * Emails the services catalogue to whoever asked for it.
 *
 * The address goes through the same guard as the contact form, minus the
 * content checks — there is no free text here to score. Reachability matters
 * more than usual: the whole point is that an email arrives, so a typo means a
 * lead who thinks we ignored them.
 *
 * Sending the catalogue needs no consent; it is the thing they asked for. The
 * marketing tick is separate, optional, and the only part that creates a
 * consent record.
 */
export async function requestCatalog(formData: FormData): Promise<CatalogResult> {
  if (!isCatalogAvailable()) {
    return { success: false, reason: 'unavailable' };
  }

  if (!isReviewsConfigured()) {
    console.error('DATABASE_URL is not set — catalogue leads cannot be recorded.');
    return { success: false, reason: 'unavailable' };
  }

  const email = ((formData.get('email') as string) ?? '').trim();
  const name = ((formData.get('name') as string) ?? '').trim();
  const lang = (formData.get('lang') as string) ?? 'it';
  const marketingConsent = formData.get('marketing') === 'on';
  const consentText = ((formData.get('consentText') as string) ?? '').trim();

  if (!isReviewLang(lang)) return { success: false, reason: 'invalid' };

  const guard = await guardSubmission({
    // The guard requires a name; the form does not, because asking for one to
    // hand over a brochure costs conversions for information we do not need.
    name: name || 'Catalogo',
    email,
    token: (formData.get('cf-turnstile-response') as string) ?? undefined,
    trap: (formData.get(HONEYPOT_FIELD) as string) ?? undefined,
    renderedAt: Number(formData.get(RENDERED_AT_FIELD)) || undefined,
  });

  if (!guard.ok) {
    return { success: false, reason: guard.reason };
  }

  const lead: NewCatalogLead = {
    email: guard.email,
    name: name || undefined,
    lang,
    marketingConsent,
    consentText: marketingConsent ? consentText : undefined,
    consentIp: clientIp(await headers()),
  };

  try {
    // Recorded before anything is sent, so a mail outage loses the email and
    // never the lead — the founders can follow up by hand from the table.
    const id = await insertCatalogLead(lead);

    const sent = await sendCatalog(lead);
    if (sent) {
      await markCatalogSent(id);
    } else {
      console.error(`Catalogue lead ${id} was recorded but the email did not go out.`);
    }

    await notifyCatalogLead(lead);

    // Reported as failure only when the visitor did not get what they asked
    // for. A missing internal notification is our problem, not theirs.
    return sent ? { success: true } : { success: false, reason: 'send-failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/relation .* does not exist/.test(message)) {
      console.error(
        'Catalogue request failed: catalog_leads does not exist. The migration ' +
          'has not run against this DATABASE_URL.',
      );
    } else {
      console.error('Catalogue request failed:', error);
    }

    return { success: false, reason: 'send-failed' };
  }
}
