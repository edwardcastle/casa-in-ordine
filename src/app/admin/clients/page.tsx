import Link from 'next/link';
import { listClients } from '@/lib/area/queries';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../ActionForm';
import AdminNav from '../AdminNav';
import SignInForm from '../reviews/SignInForm';
import { createClientAction, setClientActiveAction } from './actions';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const inputClass =
  'mt-1 rounded-md border border-secondary/60 bg-white px-2 py-1.5 text-sm font-normal';

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Area clienti" />;

  if (!isReviewsConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Clienti</h1>
        <p className="text-gray-600">DATABASE_URL non è configurato.</p>
      </main>
    );
  }

  const clients = await listClients();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <AdminNav current="clients" />
      <header className="mb-8 border-b border-secondary pb-4">
        <h1 className="text-2xl font-semibold">Clienti</h1>
        <p className="text-sm text-gray-500">{admin}</p>
      </header>

      <section aria-labelledby="new-client" className="mb-8 rounded-lg border border-secondary/50 bg-white p-5">
        <h2 id="new-client" className="mb-3 text-lg font-semibold">
          Nuovo cliente
        </h2>
        <ActionForm action={createClientAction} submit="Aggiungi cliente" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-semibold text-gray-600">
            Nome
            <input name="name" required maxLength={200} className={`${inputClass} w-48`} />
          </label>
          <label className="flex flex-col text-xs font-semibold text-gray-600">
            Email
            <input name="email" type="email" required className={`${inputClass} w-64`} />
          </label>
          <label className="flex flex-col text-xs font-semibold text-gray-600">
            Lingua
            <select name="lang" defaultValue="it" className={inputClass}>
              <option value="it">Italiano</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
        </ActionForm>
        <p className="mt-3 text-xs text-gray-500">
          Il cliente entra con un link mandato alla sua email: non c&apos;è una password e non
          esiste un&apos;iscrizione pubblica.
        </p>
      </section>

      {clients.length === 0 ? (
        <p className="text-gray-600">Ancora nessun cliente.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-secondary/50 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-secondary/50 bg-secondary-light/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Progetti</th>
                <th className="px-4 py-3 font-semibold">Ultimo accesso</th>
                <th className="px-4 py-3 font-semibold">Accesso</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-secondary/30 align-top last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="font-semibold text-primary underline hover:text-primary-dark"
                    >
                      {client.name}
                    </Link>
                    <span className="block break-all text-xs text-gray-500">
                      {client.email} · {client.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{client.projectCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {client.lastSeenAt ? dateFmt.format(client.lastSeenAt) : <span className="text-gray-400">mai</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ActionForm
                      action={setClientActiveAction}
                      submit={client.active ? 'Disattiva' : 'Riattiva'}
                      tone={client.active ? 'quiet' : 'primary'}
                      resetOnSuccess={false}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="active" value={String(!client.active)} />
                      <span
                        className={
                          client.active
                            ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold'
                            : 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800'
                        }
                      >
                        {client.active ? 'Attivo' : 'Disattivato'}
                      </span>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
