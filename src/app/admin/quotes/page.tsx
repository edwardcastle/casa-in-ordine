import Link from 'next/link';
import { QUOTE_STATUSES, countQuotesByStatus, listQuoteRequests, type QuoteStatus } from '@/lib/quotes/queries';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import AdminShell from '../AdminShell';
import SignInForm from '../reviews/SignInForm';
import { QUOTE_STATUS, euro } from './meta';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; stato?: string }>;
}) {
  const { error, stato } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Preventivi" />;

  if (!isReviewsConfigured()) {
    return (
      <AdminShell current="quotes" admin={admin} title="Preventivi">
        <p className="text-[#5C6A5B]">DATABASE_URL non è configurato.</p>
      </AdminShell>
    );
  }

  const filter = (QUOTE_STATUSES as readonly string[]).includes(stato ?? '') ? (stato as QuoteStatus) : undefined;
  const [quotes, counts] = await Promise.all([listQuoteRequests(filter), countQuotesByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tabs: { key: QuoteStatus | undefined; label: string; count: number }[] = [
    { key: undefined, label: 'Tutti', count: total },
    ...QUOTE_STATUSES.map((s) => ({ key: s, label: QUOTE_STATUS[s].filter, count: counts[s] })),
  ];

  return (
    <AdminShell
      current="quotes"
      admin={admin}
      title="Preventivi"
      description="Le richieste arrivate dal sopralluogo digitale del sito."
    >
      <nav aria-label="Filtra per stato" className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E2E5DE]">
        {tabs.map((tab) => {
          const active = tab.key === filter;
          return (
            <Link
              key={tab.label}
              href={tab.key ? `/admin/quotes?stato=${tab.key}` : '/admin/quotes'}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex-none whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary ${
                active ? 'border-[#3F4D3E] text-[#2F3A2E]' : 'border-transparent text-[#6B7769] hover:text-[#2F3A2E]'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-[#3F4D3E] text-white' : 'bg-[#E9ECE5] text-[#4A5649]'}`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CDD2C8] bg-white px-6 py-14 text-center">
          <p className="font-semibold">
            {total === 0 ? 'Ancora nessuna richiesta salvata' : 'Nessuna richiesta in questo stato'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#5C6A5B]">
            {total === 0
              ? 'Ogni preventivo inviato dal sito da ora in poi compare qui. Quelli arrivati prima sono solo nella casella email.'
              : 'Scegli un altro filtro per vedere le altre richieste.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E5DE] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#FAFBF8] text-[#5C6A5B]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Ricevuto</th>
                  <th scope="col" className="px-5 py-3 font-medium">Persona</th>
                  <th scope="col" className="px-5 py-3 font-medium">Stanze</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Stima</th>
                  <th scope="col" className="px-5 py-3 font-medium">Stato</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Apri</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0EB]">
                {quotes.map((quote) => (
                  <tr key={quote.id} className={`group relative hover:bg-[#FAFBF8] ${quote.status === 'new' ? 'font-medium' : ''}`}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[#4A5649]">{dateFmt.format(quote.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="font-semibold text-[#2F3A2E] after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {quote.name}
                      </Link>
                      <p className="truncate text-xs font-normal text-[#6B7769]">{quote.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-normal text-[#4A5649]">{quote.zoneLabels.join(', ')}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">{euro.format(quote.total)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${QUOTE_STATUS[quote.status].badge}`}
                      >
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${QUOTE_STATUS[quote.status].dot}`} />
                        {QUOTE_STATUS[quote.status].label}
                      </span>
                      {quote.clientId && <span className="ml-2 text-xs font-normal text-[#6B7769]">ha l&apos;area</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#9AA197] group-hover:text-[#3F4D3E]" aria-hidden="true">
                      ›
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
