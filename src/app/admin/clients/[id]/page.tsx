import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PROJECT_ZONES,
  getClient,
  getProject,
  listProjects,
  type AdminClient,
  type Material,
  type ProjectDetail,
  type ProjectSummary,
} from '@/lib/area/queries';
import { ZONE_LABEL_IT, zoneLabelIt } from '@/lib/quote/zone-labels';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import ActionForm from '../../ActionForm';
import AdminShell from '../../AdminShell';
import SignInForm from '../../reviews/SignInForm';
import {
  createProjectAction,
  deleteClientAction,
  deleteMaterialAction,
  notifyClientAction,
  setClientActiveAction,
} from '../actions';
import { FileIcon, LinkIcon, MailIcon, NoteIcon, PlusIcon } from '../icons';
import AddMaterial, { fieldClass, labelClass } from './AddMaterial';
import NoteTile from './NoteTile';
import ProjectHeader from './ProjectHeader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Only the name, and only for a signed-in admin: the title is in the tab bar.
  if (!(await currentAdmin())) return { title: 'Area clienti · Casa in Ordine' };
  const client = await getClient((await params).id).catch(() => null);
  return { title: `${client?.name ?? 'Cliente'} · Casa in Ordine` };
}

const seenFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const visitFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const ZONE_LABEL = ZONE_LABEL_IT;

const STATUS = {
  planned: { label: 'Programmato', dot: 'bg-[#B9BFB4]' },
  in_progress: { label: 'In corso', dot: 'bg-primary' },
  done: { label: 'Concluso', dot: 'bg-[#3F4D3E]' },
} as const;

const LANG_LABEL = { it: 'Italiano', en: 'Inglese', es: 'Spagnolo' } as const;

const panel = 'rounded-2xl border border-[#E2E5DE] bg-white';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const zoneLabel = zoneLabelIt;

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileKind(type: string | null): string {
  if (type === 'application/pdf') return 'PDF';
  if (type?.startsWith('image/')) return 'Foto';
  return 'File';
}

function host(url: string | null): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return url ?? '';
  }
}

/* ------------------------------------------------------------------ */
/* Left pane                                                           */
/* ------------------------------------------------------------------ */

function ClientCard({ client }: { client: AdminClient }) {
  return (
    <section aria-label="Dati del cliente" className="rounded-xl border border-[#E2E5DE] bg-white p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[#6B7769]">Email</dt>
        <dd className="break-all">{client.email}</dd>
        <dt className="text-[#6B7769]">Lingua</dt>
        <dd>{LANG_LABEL[client.lang]}</dd>
        <dt className="text-[#6B7769]">Accesso</dt>
        <dd className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${client.active ? 'bg-primary' : 'bg-[#C9584A]'}`} />
          {client.active ? 'Attivo' : 'Sospeso'}
        </dd>
        <dt className="text-[#6B7769]">Ultima visita</dt>
        <dd>{client.lastSeenAt ? seenFmt.format(client.lastSeenAt) : 'Mai'}</dd>
      </dl>
    </section>
  );
}

function ProjectNav({
  clientId,
  projects,
  selected,
}: {
  clientId: string;
  projects: ProjectSummary[];
  selected: string | 'new';
}) {
  const base = `/admin/clients/${clientId}`;

  return (
    <nav aria-label="Progetti">
      <h2 className="mb-2 hidden text-sm font-semibold text-[#5C6A5B] lg:block">Progetti</h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {projects.map((project) => {
          const active = project.id === selected;
          return (
            <li key={project.id} className="flex-none lg:flex-auto">
              <Link
                href={`${base}?progetto=${project.id}`}
                aria-current={active ? 'page' : undefined}
                scroll={false}
                className={`flex min-w-44 flex-col rounded-xl border px-3.5 py-2.5 transition-colors duration-150 lg:min-w-0 ${focusRing} ${
                  active
                    ? 'border-primary/40 bg-white shadow-[0_2px_8px_-4px_rgba(47,58,46,0.25)]'
                    : 'border-transparent hover:bg-white/70'
                }`}
              >
                <span className="truncate text-[15px] font-semibold">{project.title}</span>
                <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[#5C6A5B]">
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS[project.status].dot}`} />
                  {STATUS[project.status].label}
                  <span className="text-[#9AA197]">
                    {project.materialCount === 1 ? '1 elemento' : `${project.materialCount} elementi`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex-none lg:flex-auto">
          <Link
            href={`${base}?progetto=nuovo`}
            aria-current={selected === 'new' ? 'page' : undefined}
            scroll={false}
            className={`flex h-full items-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${focusRing} ${
              selected === 'new'
                ? 'border-primary bg-white text-[#3F4D3E]'
                : 'border-[#CDD2C8] text-[#4A5649] hover:border-primary hover:text-[#3F4D3E]'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            Nuovo progetto
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function AccessSettings({ client }: { client: AdminClient }) {
  return (
    <details className="group rounded-xl text-sm">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between rounded-lg py-2 font-semibold text-[#4A5649] hover:text-[#2F3A2E] [&::-webkit-details-marker]:hidden ${focusRing}`}
      >
        Accesso ed eliminazione
        <span aria-hidden="true" className="text-[#9AA197] transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-5">
        <div>
          <p className="text-[#5C6A5B]">
            {client.active
              ? "Sospendi l'accesso per bloccarlo: progetti e file restano salvati."
              : 'Il cliente non può entrare. Riattivalo quando serve.'}
          </p>
          <ActionForm
            action={setClientActiveAction}
            submit={client.active ? "Sospendi l'accesso" : "Riattiva l'accesso"}
            tone={client.active ? 'quiet' : 'primary'}
            resetOnSuccess={false}
            className="mt-2 flex flex-col items-start gap-1"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="active" value={String(!client.active)} />
          </ActionForm>
        </div>
        <div className="border-t border-[#E2E5DE] pt-4">
          <p className="text-[#5C6A5B]">
            Eliminare {client.name} cancella per sempre i suoi progetti e tutti i file.
          </p>
          <ActionForm
            action={deleteClientAction}
            submit="Elimina il cliente"
            tone="danger"
            resetOnSuccess={false}
            className="mt-2 flex flex-col items-start gap-2"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <label className="flex items-center gap-2 text-[#8A3B31]">
              <input type="checkbox" name="confirm" className="h-4 w-4 accent-[#8A3B31]" />
              Sì, eliminalo definitivamente
            </label>
          </ActionForm>
        </div>
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Right pane                                                          */
/* ------------------------------------------------------------------ */

function MaterialTile({ material }: { material: Material }) {
  const Icon = { file: FileIcon, note: NoteIcon, link: LinkIcon }[material.kind];
  const caption =
    material.kind === 'file'
      ? `${fileKind(material.fileType)}, ${formatSize(material.fileSize)}`
      : material.kind === 'link'
        ? host(material.body)
        : 'Nota';

  return (
    <li className="group relative flex flex-col rounded-xl border border-[#E2E5DE] bg-[#FBFBF9] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-primary shadow-[0_1px_2px_rgba(47,58,46,0.08)]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1 pr-14">
          <p className="min-w-0 [overflow-wrap:anywhere] text-[15px] font-semibold leading-snug">{material.title}</p>
          <p className="mt-0.5 truncate text-xs text-[#7A8578]">{caption}</p>
        </div>
      </div>
      {material.kind === 'note' && material.body && (
        <p className="mt-3 line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-[#4A5649]">
          {material.body}
        </p>
      )}
      <ActionForm
        action={deleteMaterialAction}
        submit="Rimuovi"
        tone="subtle"
        resetOnSuccess={false}
        className="absolute right-2 top-2 flex flex-col items-end"
      >
        <input type="hidden" name="materialId" value={material.id} />
      </ActionForm>
    </li>
  );
}

function ProjectPane({ client, project }: { client: AdminClient; project: ProjectDetail }) {
  const firstName = client.name.split(' ')[0] || client.name;
  const zone = zoneLabel(project.zone);

  return (
    <article aria-labelledby="project-title" className={`${panel} overflow-hidden`}>
      <ProjectHeader
        key={`${project.id}-${project.title}-${project.zone}-${project.visitDate}-${project.summary}`}
        project={project}
        zoneLabel={zone}
        visitLabel={project.visitDate ? visitFmt.format(new Date(`${project.visitDate}T00:00:00Z`)) : null}
        firstName={firstName}
      />

      <section aria-labelledby="client-view" className="bg-[#F3F5F0] px-6 py-6 sm:px-8">
        <h3 id="client-view" className="text-sm font-semibold text-[#4A5649]">
          Così lo vede {firstName}
        </h3>

        {project.materials.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {project.materials.map((material) => (
              material.kind === 'note' ? (
                <NoteTile key={material.id} material={material} />
              ) : (
                <MaterialTile key={material.id} material={material} />
              )
            ))}
          </ul>
        ) : (
          <p className="mt-2 max-w-prose text-[15px] text-[#5C6A5B]">
            La sua area per questo progetto è ancora vuota. Aggiungi il piano, le foto del prima e dopo o un consiglio.
          </p>
        )}

        <div className="mt-4">
          <AddMaterial projectId={project.id} clientName={firstName} />
        </div>
      </section>

      <footer className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-start gap-3 text-[15px] text-[#4A5649]">
          <MailIcon className="mt-0.5 h-5 w-5 flex-none text-primary" />
          <span>
            Quando hai finito, avvisa {firstName}.
            <span className="block text-sm text-[#7A8578]">Riceve un&apos;email con il link a questo progetto.</span>
          </span>
        </p>
        <ActionForm
          action={notifyClientAction}
          submit={`Avvisa ${firstName}`}
          resetOnSuccess={false}
          className="flex flex-none flex-col items-start gap-1 sm:items-end"
        >
          <input type="hidden" name="clientId" value={client.id} />
          <input type="hidden" name="projectId" value={project.id} />
        </ActionForm>
      </footer>
    </article>
  );
}

function NewProjectPane({ client, isFirst }: { client: AdminClient; isFirst: boolean }) {
  const firstName = client.name.split(' ')[0] || client.name;

  return (
    <section aria-labelledby="new-project" className={`${panel} px-6 py-7 sm:px-8`}>
      <h2 id="new-project" className="text-[26px] font-semibold leading-tight tracking-[-0.015em]">
        {isFirst ? `Il primo progetto di ${firstName}` : 'Nuovo progetto'}
      </h2>
      <p className="mt-2 max-w-prose text-[15px] text-[#5C6A5B]">
        Un progetto per ogni lavoro: una stanza, un trasloco. Poi ci aggiungi file, note e link per {firstName}.
      </p>

      <ActionForm
        action={createProjectAction}
        submit="Crea il progetto"
        className="mt-6 flex max-w-xl flex-col gap-5"
        buttonClassName="self-start"
      >
        <input type="hidden" name="clientId" value={client.id} />
        <label className={labelClass}>
          Nome del progetto
          <input name="title" required maxLength={200} placeholder="Armadio della camera da letto" className={fieldClass} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
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
          Due righe per {firstName}
          <textarea
            name="summary"
            rows={3}
            maxLength={10000}
            placeholder="Riorganizziamo l'armadio a due ante e prepariamo il cambio di stagione."
            className={fieldClass}
          />
        </label>
      </ActionForm>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; progetto?: string }>;
}) {
  const [{ id }, { error, progetto }] = await Promise.all([params, searchParams]);
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} title="Area clienti" />;

  if (!isReviewsConfigured()) {
    return (
      <AdminShell current="clients" admin={admin} title="Cliente">
        <p className="text-[#5C6A5B]">DATABASE_URL non è configurato.</p>
      </AdminShell>
    );
  }

  const client = await getClient(id);
  if (!client) notFound();

  const projects = await listProjects(client.id);

  // The newest project opens by default; a client with none starts on the form.
  const selected: string | 'new' =
    progetto === 'nuovo' || projects.length === 0
      ? 'new'
      : projects.some((p) => p.id === progetto)
        ? (progetto as string)
        : projects[0].id;
  const project = selected === 'new' ? null : await getProject(client.id, selected);

  return (
    <AdminShell
      current="clients"
      admin={admin}
      title={client.name}
      breadcrumb={[{ label: 'Clienti', href: '/admin/clients' }, { label: client.name }]}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <ClientCard client={client} />
          <ProjectNav clientId={client.id} projects={projects} selected={selected} />
          <div className="hidden border-t border-[#E2E5DE] pt-3 lg:block">
            <AccessSettings client={client} />
          </div>
        </aside>

        <div className="min-w-0">
          {project ? (
            <ProjectPane client={client} project={project} />
          ) : (
            <NewProjectPane client={client} isFirst={projects.length === 0} />
          )}
          <div className="mt-8 border-t border-[#E2E5DE] pt-3 lg:hidden">
            <AccessSettings client={client} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
