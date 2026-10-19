import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PROJECT_ZONES,
  getClient,
  getProject,
  listProjects,
  type Material,
  type ProjectDetail,
} from '@/lib/area/queries';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../../ActionForm';
import AdminNav from '../../AdminNav';
import SignInForm from '../../reviews/SignInForm';
import {
  addTextMaterialAction,
  createProjectAction,
  deleteClientAction,
  deleteMaterialAction,
  notifyClientAction,
  setClientActiveAction,
  updateProjectStatusAction,
} from '../actions';
import UploadForm from '../UploadForm';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const STATUS_LABEL = { planned: 'Programmato', in_progress: 'In corso', done: 'Concluso' } as const;
const inputClass =
  'mt-1 rounded-md border border-secondary/60 bg-white px-2 py-1.5 text-sm font-normal';
const labelClass = 'flex flex-col text-xs font-semibold text-gray-600';

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function MaterialRow({ material }: { material: Material }) {
  const kind = { file: 'File', note: 'Nota', link: 'Link' }[material.kind];

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-secondary/30 py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="mr-2 rounded bg-secondary-light px-1.5 py-0.5 text-xs font-semibold">
            {kind}
          </span>
          <strong>{material.title}</strong>
          {material.kind === 'file' && (
            <span className="ml-2 text-xs text-gray-500">{formatSize(material.fileSize)}</span>
          )}
        </p>
        {material.kind === 'note' && material.body && (
          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{material.body}</p>
        )}
        {material.kind === 'link' && material.body && (
          <p className="mt-1 break-all text-sm text-gray-600">{material.body}</p>
        )}
      </div>
      <ActionForm
        action={deleteMaterialAction}
        submit="Elimina"
        tone="danger"
        resetOnSuccess={false}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="materialId" value={material.id} />
      </ActionForm>
    </li>
  );
}

function ProjectCard({ clientId, project }: { clientId: string; project: ProjectDetail }) {
  return (
    <article className="rounded-lg border border-secondary/50 bg-white p-5">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{project.title}</h3>
          <p className="text-sm text-gray-500">
            {STATUS_LABEL[project.status]}
            {project.zone ? <> · {project.zone}</> : null}
            {project.visitDate ? <> · sopralluogo {project.visitDate}</> : null}
          </p>
        </div>
        <ActionForm
          action={updateProjectStatusAction}
          submit="Cambia stato"
          tone="quiet"
          resetOnSuccess={false}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <label className="sr-only" htmlFor={`status-${project.id}`}>
            Stato
          </label>
          <select
            id={`status-${project.id}`}
            name="status"
            defaultValue={project.status}
            className={inputClass}
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </ActionForm>
      </header>

      {project.summary && <p className="mb-3 whitespace-pre-line text-sm text-gray-600">{project.summary}</p>}

      {project.materials.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nessun materiale.</p>
      ) : (
        <ul className="mb-4">
          {project.materials.map((material) => (
            <MaterialRow key={material.id} material={material} />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-4 border-t border-secondary/40 pt-4">
        <UploadForm projectId={project.id} />

        <ActionForm
          action={addTextMaterialAction}
          submit="Aggiungi nota"
          tone="quiet"
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="kind" value="note" />
          <label className={labelClass}>
            Titolo della nota
            <input name="title" required maxLength={200} className={`${inputClass} w-48`} />
          </label>
          <label className={labelClass}>
            Testo
            <textarea name="body" required rows={2} maxLength={10000} className={`${inputClass} w-72`} />
          </label>
        </ActionForm>

        <ActionForm
          action={addTextMaterialAction}
          submit="Aggiungi link"
          tone="quiet"
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="kind" value="link" />
          <label className={labelClass}>
            Titolo del link
            <input name="title" required maxLength={200} className={`${inputClass} w-48`} />
          </label>
          <label className={labelClass}>
            Indirizzo
            <input
              name="body"
              type="url"
              required
              placeholder="https://"
              className={`${inputClass} w-72`}
            />
          </label>
        </ActionForm>

        <ActionForm
          action={notifyClientAction}
          submit="Avvisa il cliente"
          resetOnSuccess={false}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="projectId" value={project.id} />
          <span className="text-xs text-gray-500">
            Manda un&apos;email «Nuovo materiale nella tua area». Non parte da sola a ogni caricamento.
          </span>
        </ActionForm>
      </div>
    </article>
  );
}

export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Area clienti" />;

  if (!isReviewsConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Cliente</h1>
        <p className="text-gray-600">DATABASE_URL non è configurato.</p>
      </main>
    );
  }

  const client = await getClient(id);
  if (!client) notFound();

  const summaries = await listProjects(client.id);
  const projects = (await Promise.all(summaries.map((p) => getProject(client.id, p.id)))).filter(
    (p): p is ProjectDetail => p !== null,
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <AdminNav current="clients" />
      <header className="mb-8 border-b border-secondary pb-4">
        <p className="mb-2 text-sm">
          <Link href="/admin/clients" className="text-primary underline hover:text-primary-dark">
            ← Tutti i clienti
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <p className="break-all text-sm text-gray-500">
              {client.email} · {client.lang.toUpperCase()} ·{' '}
              {client.lastSeenAt ? `ultimo accesso ${dateFmt.format(client.lastSeenAt)}` : 'mai entrato'}
            </p>
          </div>
          <ActionForm
            action={setClientActiveAction}
            submit={client.active ? 'Disattiva accesso' : 'Riattiva accesso'}
            tone={client.active ? 'quiet' : 'primary'}
            resetOnSuccess={false}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="active" value={String(!client.active)} />
            <span className="text-sm">{client.active ? 'Attivo' : 'Disattivato'}</span>
          </ActionForm>
        </div>
      </header>

      <section aria-labelledby="new-project" className="mb-8 rounded-lg border border-secondary/50 bg-white p-5">
        <h2 id="new-project" className="mb-3 text-lg font-semibold">
          Nuovo progetto
        </h2>
        <ActionForm action={createProjectAction} submit="Crea progetto" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="clientId" value={client.id} />
          <label className={labelClass}>
            Titolo
            <input name="title" required maxLength={200} className={`${inputClass} w-56`} />
          </label>
          <label className={labelClass}>
            Zona
            <select name="zone" defaultValue="" className={inputClass}>
              <option value="">nessuna</option>
              {PROJECT_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Sopralluogo
            <input name="visitDate" type="date" className={inputClass} />
          </label>
          <label className={labelClass}>
            Riepilogo
            <textarea name="summary" rows={2} maxLength={10000} className={`${inputClass} w-72`} />
          </label>
        </ActionForm>
      </section>

      <h2 className="mb-4 text-lg font-semibold">Progetti ({projects.length})</h2>
      {projects.length === 0 ? (
        <p className="mb-10 text-gray-600">Ancora nessun progetto.</p>
      ) : (
        <div className="mb-10 flex flex-col gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} clientId={client.id} project={project} />
          ))}
        </div>
      )}

      <section aria-labelledby="danger" className="rounded-lg border border-red-200 bg-red-50/50 p-5">
        <h2 id="danger" className="mb-2 text-lg font-semibold text-red-900">
          Elimina cliente
        </h2>
        <p className="mb-3 text-sm text-gray-700">
          Cancella per sempre il cliente, i suoi progetti e tutti i file. Per sospendere solo
          l&apos;accesso usa «Disattiva accesso».
        </p>
        <ActionForm
          action={deleteClientAction}
          submit="Elimina cliente"
          tone="danger"
          resetOnSuccess={false}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="clientId" value={client.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" />
            Confermo l&apos;eliminazione
          </label>
        </ActionForm>
      </section>
    </main>
  );
}
