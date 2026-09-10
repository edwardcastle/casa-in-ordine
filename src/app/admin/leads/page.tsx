import Link from 'next/link';
import { removeCatalogLead } from '@/actions/admin';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import { listCatalogLeads } from '@/lib/catalog/leads';
import SignInForm from '../reviews/SignInForm';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} />;

  if (!isReviewsConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Richieste di catalogo</h1>
        <p className="text-gray-600">DATABASE_URL non è configurato.</p>
      </main>
    );
  }

  const leads = await listCatalogLeads();
  const contactable = leads.filter((l) => l.marketingConsent).length;
  const unsent = leads.filter((l) => !l.sentAt).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-secondary pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Richieste di catalogo</h1>
          <p className="text-sm text-gray-500">{admin}</p>
        </div>
        <Link href="/admin/reviews" className="text-sm text-primary underline hover:text-primary-dark">
          Recensioni →
        </Link>
      </header>

      <p className="mb-8 rounded-lg border border-secondary/50 bg-white px-4 py-3 text-sm">
        <strong>{leads.length}</strong> richieste · <strong>{contactable}</strong> hanno
        acconsentito a essere ricontattate.
        {unsent > 0 && (
          <>
            {' '}
            <strong className="text-red-800">{unsent}</strong> senza data di invio: il catalogo
            non è partito, mandalo a mano.
          </>
        )}
      </p>

      {leads.length === 0 ? (
        <p className="text-gray-600">Ancora nessuna richiesta.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-secondary/50 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-secondary/50 bg-secondary-light/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Lingua</th>
                <th className="px-4 py-3 font-semibold">Richiesta</th>
                <th className="px-4 py-3 font-semibold">Marketing</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-secondary/30 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-primary hover:text-primary-dark break-all"
                    >
                      {lead.email}
                    </a>
                    {!lead.sentAt && (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800">
                        non inviato
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{lead.name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 uppercase text-gray-500">{lead.lang}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {dateFmt.format(lead.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {lead.marketingConsent ? (
                      <>
                        <span className="font-semibold text-primary">Sì</span>
                        {lead.consentAt && (
                          <span className="block text-xs text-gray-500">
                            {dateFmt.format(lead.consentAt)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-800">No — solo catalogo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeCatalogLead}>
                      <input type="hidden" name="id" value={lead.id} />
                      <button className="text-xs text-red-800 underline hover:no-underline">
                        Cancella
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500">
        Chi non ha acconsentito al marketing ha chiesto solo il catalogo: non aggiungerla a
        nessuna lista e non ricontattarla per vendere. &ldquo;Cancella&rdquo; rimuove
        definitivamente la riga — usalo quando qualcuno chiede la cancellazione dei propri dati.
      </p>
    </main>
  );
}
