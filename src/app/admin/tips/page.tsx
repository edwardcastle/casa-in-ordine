import Link from 'next/link';
import { PROJECT_ZONES, listAllTips, type AdminTip } from '@/lib/area/queries';
import { getPostSlugs } from '@/lib/blog';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../ActionForm';
import AdminShell from '../AdminShell';
import SignInForm from '../reviews/SignInForm';
import { deleteTipAction, setTipPublishedAction, upsertTipAction } from './actions';

export const dynamic = 'force-dynamic';

const inputClass =
  'mt-1 w-full rounded-md border border-secondary/60 bg-white px-2 py-1.5 text-sm font-normal';
const labelClass = 'flex flex-col text-xs font-semibold text-gray-600';

const LANGS = [
  { code: 'It', label: 'Italiano', required: true },
  { code: 'En', label: 'English', required: false },
  { code: 'Es', label: 'Español', required: false },
] as const;

function TipForm({ tip, slugs }: { tip?: AdminTip; slugs: string[] }) {
  return (
    <ActionForm
      key={tip?.id ?? 'new'}
      action={upsertTipAction}
      submit={tip ? 'Salva modifiche' : 'Crea consiglio'}
      resetOnSuccess={!tip}
      className="flex flex-col gap-4"
      buttonClassName="self-start"
    >
      {tip && <input type="hidden" name="id" value={tip.id} />}

      <div className="grid gap-4 md:grid-cols-3">
        {LANGS.map(({ code, label, required }) => (
          <fieldset key={code} className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold">
              {label}
              {required ? '' : ' (facoltativo)'}
            </legend>
            <label className={labelClass}>
              Titolo
              <input
                name={`title${code}`}
                required={required}
                maxLength={200}
                defaultValue={tip?.[`title${code}`] ?? ''}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Testo
              <textarea
                name={`body${code}`}
                required={required}
                rows={6}
                maxLength={10000}
                defaultValue={tip?.[`body${code}`] ?? ''}
                className={inputClass}
              />
            </label>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className={labelClass}>
          Zona
          <select name="zone" defaultValue={tip?.zone ?? ''} className={inputClass}>
            <option value="">nessuna</option>
            {PROJECT_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} min-w-64`}>
          Articolo del blog
          <select name="blogSlug" defaultValue={tip?.blogSlug ?? ''} className={inputClass}>
            <option value="">nessuno</option>
            {slugs.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={tip?.published ?? false} />
          Pubblicato
        </label>
      </div>
    </ActionForm>
  );
}

export default async function AdminTipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const { error, edit } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Consigli" />;

  if (!isReviewsConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Consigli</h1>
        <p className="text-gray-600">DATABASE_URL non è configurato.</p>
      </main>
    );
  }

  const tips = await listAllTips();
  const slugs = getPostSlugs().sort();
  const editing = edit ? tips.find((t) => t.id === edit) : undefined;

  return (
    <AdminShell
      current="tips"
      admin={admin}
      title="Consigli"
      description="I consigli che ogni cliente trova nella sua area, in tre lingue."
    >

      <section aria-labelledby="tip-form" className="mb-10 rounded-lg border border-secondary/50 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="tip-form" className="text-lg font-semibold">
            {editing ? 'Modifica consiglio' : 'Nuovo consiglio'}
          </h2>
          {editing && (
            <Link href="/admin/tips" className="text-sm text-primary underline hover:text-primary-dark">
              Annulla
            </Link>
          )}
        </div>
        <TipForm tip={editing} slugs={slugs} />
        <p className="mt-3 text-xs text-gray-500">
          I clienti vedono solo i consigli pubblicati. Se manca una traduzione, nella loro area
          compare il testo italiano.
        </p>
      </section>

      <h2 className="mb-4 text-lg font-semibold">Tutti i consigli ({tips.length})</h2>
      {tips.length === 0 ? (
        <p className="text-gray-600">Ancora nessun consiglio.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tips.map((tip) => (
            <li
              key={tip.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-secondary/50 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{tip.titleIt}</p>
                <p className="text-xs text-gray-500">
                  {tip.published ? 'Pubblicato' : 'Bozza'}
                  {tip.zone ? <> · {tip.zone}</> : null}
                  {tip.blogSlug ? <> · blog: {tip.blogSlug}</> : null}
                  {' · '}
                  {[tip.titleEn && 'EN', tip.titleEs && 'ES'].filter(Boolean).join(' ') || 'solo IT'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/admin/tips?edit=${tip.id}`}
                  className="text-sm text-primary underline hover:text-primary-dark"
                >
                  Modifica
                </Link>
                <ActionForm
                  action={setTipPublishedAction}
                  submit={tip.published ? 'Ritira' : 'Pubblica'}
                  tone="quiet"
                  resetOnSuccess={false}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={tip.id} />
                  <input type="hidden" name="published" value={String(!tip.published)} />
                </ActionForm>
                <ActionForm
                  action={deleteTipAction}
                  submit="Elimina"
                  tone="danger"
                  resetOnSuccess={false}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={tip.id} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
