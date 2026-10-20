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
  createProjectAction,
  deleteClientAction,
  deleteMaterialAction,
  notifyClientAction,
  setClientActiveAction,
} from '../actions';
import { CalendarIcon, FileIcon, LinkIcon, MailIcon, NoteIcon, PlusIcon } from '../icons';
import AddMaterial, { fieldClass, labelClass } from './AddMaterial';
import StatusPicker from './StatusPicker';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Only the name, and only for a signed-in admin: the title is in the tab bar.
  if (!(await currentAdmin())) return { title: 'Area clienti · Casa in Ordine' };
  const client = await getClient((await params).id).catch(() => null);
  return { title: `${client?.name ?? 'Cliente'} · Casa in Ordine` };
}

const seenFmt = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const visitFmt = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeZone: 'UTC' });

/** The same names the visitor sees in the quote wizard. */
const ZONE_LABEL: Record<(typeof PROJECT_ZONES)[number], string> = {
  armadio: 'Armadi e cabine armadio',
  cucina: 'Cucina e dispensa',
  bagno: 'Bagno e cura personale',
  living: 'Living e home office',
  trasloco: 'Trasloco',
  garage: 'Garage, cantina e ripostiglio',
};

const LANG_LABEL = { it: 'Italiano', en: 'English', es: 'Español' } as const;

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function zoneLabel(zone: string | null): string | null {
  return zone && zone in ZONE_LABEL ? ZONE_LABEL[zone as keyof typeof ZONE_LABEL] : null;
}

function MaterialRow({ material }: { material: Material }) {
  const Icon = { file: FileIcon, note: NoteIcon, link: LinkIcon }[material.kind];
  const kind = { file: 'File', note: 'Nota', link: 'Link' }[material.kind];

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-secondary text-primary-dark">
        <Icon className="h-[18px] w-[18px]" />
        <span className="sr-only">{kind}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-foreground">{material.title}</p>
        {material.kind === 'file' && (
          <p className="text-xs text-gray-600">{formatSize(material.fileSize)}</p>
        )}
        {material.kind === 'note' && material.body && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-700">{material.body}</p>
        )}
        {material.kind === 'link' && material.body && (
          <p className="mt-0.5 break-all text-xs text-gray-600">{material.body}</p>
        )}
      </div>
      <ActionForm
        action={deleteMaterialAction}
        submit="Rimuovi"
        tone="subtle"
        resetOnSuccess={false}
        className="flex flex-none flex-col items-end gap-1"
      >
        <input type="hidden" name="materialId" value={material.id} />
      </ActionForm>
    </li>
  );
}

function ProjectCard({
  clientId,
  clientName,
  project,
}: {
  clientId: string;
  clientName: string;
  project: ProjectDetail;
}) {
  const zone = zoneLabel(project.zone);
  const hasMaterial = project.materials.length > 0;

  return (
    <article
      aria-labelledby={`project-${project.id}`}
      className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(45,45,45,0.04),0_8px_24px_-12px_rgba(45,45,45,0.14)] sm:p-7"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id={`project-${project.id}`} className="break-words text-xl font-semibold text-foreground">
            {project.title}
          </h3>
          {(zone || project.visitDate) && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              {zone && <span>{zone}</span>}
              {project.visitDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  Sopralluogo {visitFmt.format(new Date(`${project.visitDate}T00:00:00Z`))}
                </span>
              )}
            </p>
          )}
        </div>
        <StatusPicker projectId={project.id} status={project.status} />
      </header>

      {project.summary && (
        <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
          {project.summary}
        </p>
      )}

      <section aria-label="Materiale del progetto" className="mt-6">
        <h4 className="text-sm font-semibold text-foreground">
          Cosa vede il cliente
          <span className="ml-2 font-normal text-gray-600">
            {hasMaterial ? `${project.materials.length} elementi` : 'ancora niente'}
          </span>
        </h4>
        {hasMaterial ? (
          <ul className="mt-1 divide-y divide-secondary-dark/70">
            {project.materials.map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            Aggiungi qui sotto il primo file, nota o link: comparirà nell&apos;area di {clientName}.
          </p>
        )}
      </section>

      <div className="mt-5">
        <AddMaterial projectId={project.id} />
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-secondary-dark/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-gray-700">
          <MailIcon className="mt-0.5 h-[18px] w-[18px] flex-none text-primary-dark" />
          <span>
            Hai finito? Avvisa {clientName}: riceverà un&apos;email con il link a questo progetto.
          </span>
        </p>
        <ActionForm
          action={notifyClientAction}
          submit="Avvisa il cliente"
          resetOnSuccess={false}
          className="flex flex-none flex-col items-start gap-1 sm:items-end"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="projectId" value={project.id} />
        </ActionForm>
      </footer>
    </article>
  );
}

function NewProjectForm({ clientId, open }: { clientId: string; open: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border-2 border-dashed border-secondary-dark bg-white/50 open:border-solid open:border-transparent open:bg-white open:shadow-[0_1px_2px_rgba(45,45,45,0.04),0_8px_24px_-12px_rgba(45,45,45,0.14)]">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-primary-dark hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-open:justify-start group-open:pb-0 [&::-webkit-details-marker]:hidden">
        <PlusIcon className="h-5 w-5 transition-transform duration-200 group-open:rotate-45" />
        <span className="group-open:hidden">Nuovo progetto</span>
        <span className="hidden text-base text-foreground group-open:inline">Nuovo progetto</span>
      </summary>
      <div className="px-5 pb-6 pt-4 sm:px-7">
        <ActionForm action={createProjectAction} submit="Crea progetto" className="flex flex-col gap-4" buttonClassName="self-start">
          <input type="hidden" name="clientId" value={clientId} />
          <label className={labelClass}>
            Nome del progetto
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Es. Armadio della camera da letto"
              className={fieldClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Stanza
              <select name="zone" defaultValue="" className={fieldClass}>
                <option value="">Nessuna in particolare</option>
                {PROJECT_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {ZONE_LABEL[zone]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Data del sopralluogo
              <input name="visitDate" type="date" className={fieldClass} />
            </label>
          </div>
          <label className={labelClass}>
            Breve descrizione <span className="font-normal text-gray-600">(la legge il cliente)</span>
            <textarea
              name="summary"
              rows={3}
              maxLength={10000}
              placeholder="Es. Riorganizziamo l'armadio a due ante e prepariamo il cambio di stagione."
              className={fieldClass}
            />
          </label>
        </ActionForm>
      </div>
    </details>
  );
}

const STEPS = [
  { title: 'Crea un progetto', text: 'Uno per ogni lavoro: una stanza, un trasloco.' },
  { title: 'Aggiungi materiale', text: 'File, note e link che il cliente potrà rivedere.' },
  { title: 'Avvisa il cliente', text: "Gli arriva un'email con il link al progetto." },
];

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
  const firstName = client.name.split(' ')[0] || client.name;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <AdminNav current="clients" />

      <Link
        href="/admin/clients"
        className="mb-6 inline-flex items-center gap-1 text-sm text-primary-dark underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">←</span> Tutti i clienti
      </Link>

      <header className="flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white"
        >
          {client.name.trim().charAt(0).toUpperCase()}
        </span>
        <h1 className="mt-4 break-words text-3xl font-semibold tracking-[-0.02em] text-foreground">
          {client.name}
        </h1>
        <p className="mt-1 break-all text-sm text-gray-600">{client.email}</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          <span
            className={`rounded-full px-3 py-1 ${client.active ? 'bg-primary/15 text-primary-dark' : 'bg-gray-200 text-gray-700'}`}
          >
            {client.active ? 'Accesso attivo' : 'Accesso sospeso'}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-gray-700">{LANG_LABEL[client.lang]}</span>
          <span className="rounded-full bg-secondary px-3 py-1 font-normal text-gray-700">
            {client.lastSeenAt ? `Ultimo accesso ${seenFmt.format(client.lastSeenAt)}` : 'Non è ancora entrato'}
          </span>
        </p>
      </header>

      <ol className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3 sm:flex-col sm:items-center sm:text-center">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-primary/40 text-xs font-semibold text-primary-dark">
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold text-foreground">{step.title}</span>
              <span className="text-gray-600">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="projects" className="mt-12">
        <h2 id="projects" className="mb-4 text-center text-lg font-semibold text-foreground">
          {projects.length === 0 ? 'Progetti' : `Progetti di ${firstName} (${projects.length})`}
        </h2>
        <div className="flex flex-col gap-6">
          <NewProjectForm clientId={client.id} open={projects.length === 0} />
          {projects.map((project) => (
            <ProjectCard key={project.id} clientId={client.id} clientName={firstName} project={project} />
          ))}
        </div>
      </section>

      <section aria-labelledby="access" className="mt-16 border-t border-secondary-dark pt-8">
        <h2 id="access" className="text-lg font-semibold text-foreground">
          Accesso del cliente
        </h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-gray-700">
            {client.active
              ? `${firstName} può entrare nella sua area. Sospendi l'accesso per bloccarlo senza perdere nulla.`
              : `L'accesso è sospeso: ${firstName} non può entrare. Progetti e file restano salvati.`}
          </p>
          <ActionForm
            action={setClientActiveAction}
            submit={client.active ? 'Sospendi accesso' : 'Riattiva accesso'}
            tone={client.active ? 'quiet' : 'primary'}
            resetOnSuccess={false}
            className="flex flex-none flex-col items-start gap-1 sm:items-end"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="active" value={String(!client.active)} />
          </ActionForm>
        </div>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-4 sm:p-5">
          <p className="text-sm font-semibold text-red-900">Eliminare il cliente</p>
          <p className="mt-1 text-sm text-red-900/80">
            Cancella per sempre {client.name}, i suoi progetti e tutti i file. Non si può annullare.
          </p>
          <ActionForm
            action={deleteClientAction}
            submit="Elimina definitivamente"
            tone="danger"
            resetOnSuccess={false}
            className="mt-3 flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <label className="flex items-center gap-2 text-sm text-red-900">
              <input type="checkbox" name="confirm" className="h-4 w-4 accent-red-700" />
              Ho capito, voglio eliminarlo
            </label>
          </ActionForm>
        </div>
      </section>
    </main>
  );
}
