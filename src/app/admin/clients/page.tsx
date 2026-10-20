import Link from 'next/link';
import { listClients } from '@/lib/area/queries';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../ActionForm';
import AdminShell from '../AdminShell';
import SignInForm from '../reviews/SignInForm';
import { createClientAction } from './actions';
import { fieldClass, labelClass } from './[id]/AddMaterial';

export const dynamic = 'force-dynamic';

const seenFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const LANG = { it: 'Italiano', en: 'Inglese', es: 'Spagnolo' } as const;

const buttonPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-[#3F4D3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F3A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; nuovo?: string; q?: string }>;
}) {
  const { error, nuovo, q } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Area clienti" />;

  if (!isReviewsConfigured()) {
    return (
      <AdminShell current="clients" admin={admin} title="Clienti">
        <p className="text-[#5C6A5B]">DATABASE_URL non è configurato.</p>
      </AdminShell>
    );
  }

  const all = await listClients();
  const query = (q ?? '').trim().toLowerCase();
  const clients = query
    ? all.filter((c) => c.name.toLowerCase().includes(query) || c.email.includes(query))
    : all;
  const showForm = nuovo === '1' || all.length === 0;
  const active = all.filter((c) => c.active).length;

  return (
    <AdminShell
      current="clients"
      admin={admin}
      title="Clienti"
      description="Le persone che hanno un'area riservata sul sito."
      actions={
        !showForm && (
          <Link href="/admin/clients?nuovo=1" className={buttonPrimary}>
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Nuovo cliente
          </Link>
        )
      }
    >
      {showForm && (
        <section
          aria-labelledby="new-client"
          className="mx-auto mb-8 max-w-xl rounded-xl border border-[#E2E5DE] bg-white p-6 shadow-[0_1px_2px_rgba(47,58,46,0.04)] sm:p-8"
        >
          <div className="mb-6 text-center">
            <h2 id="new-client" className="text-lg font-semibold">
              {all.length === 0 ? 'Il primo cliente' : 'Nuovo cliente'}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#5C6A5B]">
              Entra con un link mandato alla sua email. Non c&apos;è una password da dargli.
            </p>
          </div>
          <ActionForm
            action={createClientAction}
            submit="Crea il cliente"
            className="flex flex-col gap-4"
            buttonClassName="w-full justify-center"
          >
            <label className={labelClass}>
              Nome e cognome
              <input name="name" required maxLength={200} placeholder="Giulia Rossi" className={fieldClass} />
            </label>
            <label className={labelClass}>
              Email
              <input name="email" type="email" required placeholder="giulia@esempio.it" className={fieldClass} />
            </label>
            <label className={labelClass}>
              Lingua delle email
              <select name="lang" defaultValue="it" className={fieldClass}>
                <option value="it">Italiano</option>
                <option value="en">Inglese</option>
                <option value="es">Spagnolo</option>
              </select>
            </label>
          </ActionForm>
          {all.length > 0 && (
            <p className="mt-4 text-center">
              <Link href="/admin/clients" className="rounded-md px-2 py-1 text-sm text-[#5C6A5B] hover:bg-[#F0F2EC] hover:text-[#2F3A2E]">
                Annulla
              </Link>
            </p>
          )}
        </section>
      )}

      {all.length > 0 && (
        <section aria-labelledby="client-list" className="overflow-hidden rounded-xl border border-[#E2E5DE] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#E2E5DE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="client-list" className="text-sm font-semibold">
              {all.length === 1 ? '1 cliente' : `${all.length} clienti`}
              <span className="ml-2 font-normal text-[#6B7769]">{active} con accesso attivo</span>
            </h2>
            <form role="search" className="w-full sm:w-72">
              <label className="sr-only" htmlFor="client-search">
                Cerca un cliente
              </label>
              <input
                id="client-search"
                name="q"
                type="search"
                defaultValue={q ?? ''}
                placeholder="Cerca per nome o email"
                className="w-full rounded-lg border border-[#DCE0D8] bg-[#FAFBF8] px-3 py-2 text-sm placeholder:text-[#9AA197] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </form>
          </div>

          {clients.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#5C6A5B]">
              Nessun cliente corrisponde a «{q}».{' '}
              <Link href="/admin/clients" className="font-semibold text-[#3F4D3E] underline">
                Mostra tutti
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#FAFBF8] text-[#5C6A5B]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Cliente</th>
                    <th scope="col" className="px-5 py-3 font-medium">Progetti</th>
                    <th scope="col" className="px-5 py-3 font-medium">Lingua</th>
                    <th scope="col" className="px-5 py-3 font-medium">Ultima visita</th>
                    <th scope="col" className="px-5 py-3 font-medium">Accesso</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Apri</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0EB]">
                  {clients.map((client) => (
                    <tr key={client.id} className="group relative hover:bg-[#FAFBF8]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-[#3F4D3E]"
                          >
                            {client.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/clients/${client.id}`}
                              className="font-semibold text-[#2F3A2E] after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              {client.name}
                            </Link>
                            <p className="truncate text-xs text-[#6B7769]">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">{client.projectCount}</td>
                      <td className="px-5 py-3.5 text-[#4A5649]">{LANG[client.lang]}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[#4A5649]">
                        {client.lastSeenAt ? seenFmt.format(client.lastSeenAt) : <span className="text-[#9AA197]">Mai</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            client.active ? 'bg-primary/12 text-[#3F4D3E]' : 'bg-[#F6E3E0] text-[#8A3B31]'
                          }`}
                        >
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${client.active ? 'bg-primary' : 'bg-[#C9584A]'}`} />
                          {client.active ? 'Attivo' : 'Sospeso'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#9AA197] group-hover:text-[#3F4D3E]" aria-hidden="true">
                        ›
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AdminShell>
  );
}
