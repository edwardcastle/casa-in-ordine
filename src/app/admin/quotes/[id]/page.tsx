import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQuoteRequest } from '@/lib/quotes/queries';
import { zoneLabelIt } from '@/lib/quote/zone-labels';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../../ActionForm';
import AdminShell from '../../AdminShell';
import SignInForm from '../../reviews/SignInForm';
import { convertQuoteAction } from '../actions';
import { LANG_IT, euro } from '../meta';
import QuoteStatusPicker from './QuoteStatusPicker';

export const dynamic = 'force-dynamic';

const receivedFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Rome',
});
const slotFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Rome',
});

const card = 'rounded-xl border border-[#E2E5DE] bg-white';

function slot(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : slotFmt.format(date);
}

export default async function AdminQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Preventivi" />;
  if (!isReviewsConfigured()) notFound();

  const quote = await getQuoteRequest(id);
  if (!quote) notFound();

  const firstName = quote.name.split(' ')[0] || quote.name;
  const slots = [quote.availability?.slot1, quote.availability?.slot2, quote.availability?.slot3]
    .map(slot)
    .filter((s): s is string => Boolean(s));

  return (
    <AdminShell
      current="quotes"
      admin={admin}
      title={quote.name}
      description={`Richiesta ricevuta ${receivedFmt.format(quote.createdAt)}`}
      breadcrumb={[{ label: 'Preventivi', href: '/admin/quotes' }, { label: quote.name }]}
      actions={
        quote.clientId ? (
          <Link
            href={`/admin/clients/${quote.clientId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DCE0D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F3A2E] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Apri l&apos;area di {firstName}
          </Link>
        ) : (
          <ActionForm action={convertQuoteAction} submit="Crea l'area cliente" resetOnSuccess={false} className="flex flex-col items-end gap-1">
            <input type="hidden" name="quoteId" value={quote.id} />
          </ActionForm>
        )
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="status" className={`${card} p-5`}>
            <h2 id="status" className="mb-3 text-sm font-semibold text-[#4A5649]">
              A che punto siamo
            </h2>
            <QuoteStatusPicker quoteId={quote.id} status={quote.status} />
            {!quote.clientId && (
              <p className="mt-3 text-sm text-[#5C6A5B]">
                Quando il lavoro è confermato, «Crea l&apos;area cliente» apre l&apos;area di {firstName} con un
                progetto per ogni stanza richiesta.
              </p>
            )}
          </section>

          {quote.zones.map((zone, index) => (
            <section key={`${zone.zone}-${index}`} aria-labelledby={`zone-${index}`} className={card}>
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E2E5DE] px-5 py-4">
                <h2 id={`zone-${index}`} className="text-lg font-semibold">
                  {zoneLabelIt(zone.id) ?? zone.zone}
                </h2>
                <p className="text-sm text-[#5C6A5B]">
                  Quantità di oggetti: <span className="font-medium text-[#2F3A2E]">{zone.accumulation || 'non indicata'}</span>
                  <span className="ml-4 font-semibold tabular-nums text-[#2F3A2E]">{euro.format(zone.subtotal)}</span>
                </p>
              </header>
              <dl className="divide-y divide-[#EEF0EB]">
                {zone.answers
                  .filter((a) => a.answer)
                  .map((a, i) => (
                    <div key={i} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
                      <dt className="text-sm text-[#6B7769]">{a.question}</dt>
                      <dd className="text-sm font-medium">{a.answer}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}

          {quote.notes && (
            <section aria-labelledby="notes" className={`${card} p-5`}>
              <h2 id="notes" className="mb-2 text-sm font-semibold text-[#4A5649]">
                Note di {firstName}
              </h2>
              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{quote.notes}</p>
            </section>
          )}
        </div>

        <aside className="order-first flex min-w-0 flex-col gap-6 lg:order-none lg:sticky lg:top-8 lg:self-start">
          <section aria-labelledby="contact" className={`${card} p-5`}>
            <h2 id="contact" className="mb-3 text-sm font-semibold text-[#4A5649]">
              Contatto
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-[#6B7769]">Email</dt>
              <dd className="break-all">
                <a href={`mailto:${quote.email}`} className="font-medium text-[#3F4D3E] underline-offset-2 hover:underline">
                  {quote.email}
                </a>
              </dd>
              <dt className="text-[#6B7769]">Telefono</dt>
              <dd>
                {quote.phone ? (
                  <a href={`tel:${quote.phone.replace(/\s+/g, '')}`} className="font-medium text-[#3F4D3E] underline-offset-2 hover:underline">
                    {quote.phone}
                  </a>
                ) : (
                  <span className="text-[#9AA197]">Non indicato</span>
                )}
              </dd>
              <dt className="text-[#6B7769]">Lingua</dt>
              <dd>{LANG_IT[quote.lang]}</dd>
            </dl>
            {!quote.emailedAt && (
              <p className="mt-4 rounded-lg bg-[#FBEFD9] px-3 py-2 text-sm text-[#7A5414]">
                L&apos;email di avviso non è partita: questa richiesta è solo qui.
              </p>
            )}
          </section>

          <section aria-labelledby="estimate" className={`${card} p-5`}>
            <h2 id="estimate" className="mb-3 text-sm font-semibold text-[#4A5649]">
              Stima mostrata al cliente
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              {quote.zones.map((zone, index) => (
                <div key={index} className="flex justify-between gap-4">
                  <dt className="text-[#4A5649]">{zoneLabelIt(zone.id) ?? zone.zone}</dt>
                  <dd className="tabular-nums">{euro.format(zone.subtotal)}</dd>
                </div>
              ))}
              {quote.urgency > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5649]">Supplemento urgenza</dt>
                  <dd className="tabular-nums">{euro.format(quote.urgency)}</dd>
                </div>
              )}
              <div className="mt-1 flex justify-between gap-4 border-t border-[#E2E5DE] pt-3 text-base font-semibold">
                <dt>Totale</dt>
                <dd className="tabular-nums">{euro.format(quote.total)}</dd>
              </div>
            </dl>
            {quote.timing && <p className="mt-3 text-sm text-[#5C6A5B]">Tempistica: {quote.timing}</p>}
          </section>

          <section aria-labelledby="slots" className={`${card} p-5`}>
            <h2 id="slots" className="mb-3 text-sm font-semibold text-[#4A5649]">
              Quando può ricevere il sopralluogo
            </h2>
            {slots.length > 0 ? (
              <ol className="flex flex-col gap-2 text-sm">
                {slots.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#E9ECE5] text-xs font-semibold text-[#4A5649]">
                      {i + 1}
                    </span>
                    <span className="first-letter:uppercase">{s}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#9AA197]">Nessuna data indicata.</p>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
