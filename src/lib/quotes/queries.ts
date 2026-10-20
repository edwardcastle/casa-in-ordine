import { db } from '@/lib/reviews/db';
import { createClient, createProject } from '@/lib/area/queries';
import { ZONES, type Zone } from '@/lib/quote/config';
import { zoneLabelIt } from '@/lib/quote/zone-labels';

/**
 * Quote requests from the digital survey. Written by the public quote action,
 * read and updated only from the admin, which checks `currentAdmin()` first.
 */

export const QUOTE_STATUSES = ['new', 'contacted', 'won', 'lost'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
type Lang = 'it' | 'en' | 'es';

export type QuoteZone = {
  /** The zone id, when the wizard sent it; older rows have only the label. */
  id?: string;
  zone: string;
  accumulation: string;
  subtotal: number;
  answers: { question: string; answer: string }[];
};

export type QuoteInput = {
  name: string;
  email: string;
  phone?: string;
  lang?: string;
  zones: QuoteZone[];
  subtotal: number;
  urgency: number;
  total: number;
  timing?: string;
  availability?: { slot1: string; slot2: string; slot3: string };
  notes?: string;
};

export type QuoteSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lang: Lang;
  zoneLabels: string[];
  total: number;
  status: QuoteStatus;
  clientId: string | null;
  createdAt: Date;
  emailedAt: Date | null;
};

export type QuoteDetail = QuoteSummary & {
  zones: QuoteZone[];
  subtotal: number;
  urgency: number;
  timing: string | null;
  availability: { slot1?: string; slot2?: string; slot3?: string } | null;
  notes: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LANGS: readonly string[] = ['it', 'en', 'es'];

const cut = (value: unknown, max: number) => String(value ?? '').slice(0, max);
const amount = (value: unknown) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0);

/**
 * The zones as stored: the browser sends them, so their shape and size are
 * enforced here rather than trusted. Six rooms, twenty answers each, short text.
 */
function cleanZones(zones: QuoteZone[]): QuoteZone[] {
  return (Array.isArray(zones) ? zones : []).slice(0, ZONES.length).map((z) => ({
    ...(typeof z.id === 'string' && (ZONES as readonly string[]).includes(z.id) ? { id: z.id } : {}),
    zone: cut(z.zone, 120),
    accumulation: cut(z.accumulation, 120),
    subtotal: amount(z.subtotal),
    answers: (Array.isArray(z.answers) ? z.answers : []).slice(0, 20).map((a) => ({
      question: cut(a?.question, 300),
      answer: cut(a?.answer, 500),
    })),
  }));
}

/** Saves a request and returns its id. */
export async function storeQuoteRequest(input: QuoteInput): Promise<string> {
  const lang = input.lang && LANGS.includes(input.lang) ? input.lang : 'it';
  const availability =
    input.availability && (input.availability.slot1 || input.availability.slot2 || input.availability.slot3)
      ? input.availability
      : null;

  const rows = await db()<{ id: string }[]>`
    INSERT INTO quote_requests
      (name, email, phone, lang, zones, subtotal, urgency, total, timing, availability, notes)
    VALUES (
      ${cut(input.name, 200).trim()},
      ${cut(input.email, 254).trim().toLowerCase()},
      ${cut(input.phone, 40).trim() || null},
      ${lang},
      ${db().json(cleanZones(input.zones) as never)},
      ${amount(input.subtotal)},
      ${amount(input.urgency)},
      ${amount(input.total)},
      ${cut(input.timing, 200).trim() || null},
      ${availability ? db().json({ slot1: cut(availability.slot1, 40), slot2: cut(availability.slot2, 40), slot3: cut(availability.slot3, 40) }) : null},
      ${cut(input.notes, 5000).trim() || null}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function markQuoteEmailed(id: string): Promise<void> {
  await db()`UPDATE quote_requests SET emailed_at = now() WHERE id = ${id}`;
}

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lang: Lang;
  zones: QuoteZone[];
  subtotal: number;
  urgency: number;
  total: number;
  timing: string | null;
  availability: QuoteDetail['availability'];
  notes: string | null;
  status: QuoteStatus;
  client_id: string | null;
  created_at: Date;
  emailed_at: Date | null;
};

function toDetail(row: Row): QuoteDetail {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    lang: row.lang,
    zones: row.zones,
    // Italian when the zone id is known, otherwise the label the visitor saw.
    zoneLabels: row.zones.map((z) => zoneLabelIt(z.id) ?? z.zone),
    subtotal: row.subtotal,
    urgency: row.urgency,
    total: row.total,
    timing: row.timing,
    availability: row.availability,
    notes: row.notes,
    status: row.status,
    clientId: row.client_id,
    createdAt: row.created_at,
    emailedAt: row.emailed_at,
  };
}

/** Newest first, optionally only one status. */
export async function listQuoteRequests(status?: QuoteStatus): Promise<QuoteSummary[]> {
  const rows = await db()<Row[]>`
    SELECT * FROM quote_requests
     ${status ? db()`WHERE status = ${status}` : db()``}
     ORDER BY created_at DESC, id
  `;
  return rows.map(toDetail);
}

export async function countQuotesByStatus(): Promise<Record<QuoteStatus, number>> {
  const rows = await db()<{ status: QuoteStatus; n: number }[]>`
    SELECT status, count(*)::int AS n FROM quote_requests GROUP BY status
  `;
  const counts = { new: 0, contacted: 0, won: 0, lost: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

export async function getQuoteRequest(id: string): Promise<QuoteDetail | null> {
  if (!UUID.test(id)) return null;
  const rows = await db()<Row[]>`SELECT * FROM quote_requests WHERE id = ${id}`;
  return rows[0] ? toDetail(rows[0]) : null;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<boolean> {
  if (!UUID.test(id) || !QUOTE_STATUSES.includes(status)) return false;
  const rows = await db()`UPDATE quote_requests SET status = ${status} WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/**
 * Gives the person behind a request a client area.
 *
 * Reuses the client with the same email if there is one, so a returning
 * customer keeps one area. A new client also gets one project per room they
 * asked about, named in Italian, so the organizers start from the request
 * instead of an empty page. The request is linked and marked confirmed.
 */
export async function convertQuoteToClient(
  id: string,
): Promise<{ clientId: string; created: boolean } | null> {
  const quote = await getQuoteRequest(id);
  if (!quote) return null;
  if (quote.clientId) return { clientId: quote.clientId, created: false };

  const existing = await db()<{ id: string }[]>`
    SELECT id FROM clients WHERE lower(email) = ${quote.email.toLowerCase()} LIMIT 1
  `;

  let clientId = existing[0]?.id;
  let created = false;

  if (!clientId) {
    const result = await createClient({ name: quote.name, email: quote.email, lang: quote.lang });
    if ('error' in result) {
      // Someone created the same client a moment ago: use theirs.
      const again = await db()<{ id: string }[]>`
        SELECT id FROM clients WHERE lower(email) = ${quote.email.toLowerCase()} LIMIT 1
      `;
      if (!again[0]) return null;
      clientId = again[0].id;
    } else {
      clientId = result.client.id;
      created = true;
      for (const zone of quote.zones) {
        const zoneId = (ZONES as readonly string[]).includes(zone.id ?? '') ? (zone.id as Zone) : null;
        await createProject(clientId, {
          title: zoneLabelIt(zoneId) ?? zone.zone,
          zone: zoneId,
          summary: '',
          visitDate: '',
        });
      }
    }
  }

  await db()`UPDATE quote_requests SET client_id = ${clientId}, status = 'won' WHERE id = ${id}`;
  return { clientId, created };
}
