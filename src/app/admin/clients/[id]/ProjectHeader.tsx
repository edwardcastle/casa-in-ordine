'use client';

import { useState } from 'react';
import { ZONES } from '@/lib/quote/config';
import { ZONE_LABEL_IT } from '@/lib/quote/zone-labels';
import ActionForm from '../../ActionForm';
import { deleteProjectAction, updateProjectAction } from '../actions';
import { CalendarIcon } from '../icons';
import { fieldClass, labelClass } from './AddMaterial';
import StatusPicker from './StatusPicker';

type Project = {
  id: string;
  title: string;
  zone: string | null;
  summary: string | null;
  visitDate: string | null;
  status: 'planned' | 'in_progress' | 'done';
};

/**
 * The top of a project: what it is, and the way to change it. Editing swaps
 * the read view for a form with the current values already filled in; saving
 * goes back to the read view. Deleting lives at the bottom of the form, behind
 * a checkbox, so it is never one stray click away.
 */
export default function ProjectHeader({
  project,
  zoneLabel,
  visitLabel,
  firstName,
}: {
  project: Project;
  zoneLabel: string | null;
  visitLabel: string | null;
  firstName: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <header className="flex flex-col gap-4 border-b border-[#E2E5DE] px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="min-w-0">
          <h2 id="project-title" className="break-words text-[26px] font-semibold leading-tight tracking-[-0.015em]">
            {project.title}
          </h2>
          {(zoneLabel || visitLabel) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#5C6A5B]">
              {zoneLabel && <span>{zoneLabel}</span>}
              {visitLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Sopralluogo il {visitLabel}
                </span>
              )}
            </p>
          )}
          {project.summary ? (
            <p className="mt-4 max-w-prose whitespace-pre-line break-words text-[15px] leading-relaxed text-[#4A5649]">
              {project.summary}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-4 rounded-md text-left text-[15px] text-[#7A8578] underline decoration-dashed underline-offset-4 hover:text-[#3F4D3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Aggiungi una descrizione per {firstName}
            </button>
          )}
        </div>
        <div className="flex flex-none flex-col items-start gap-3 sm:items-end">
          <StatusPicker projectId={project.id} status={project.status} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE0D8] bg-white px-3 py-1.5 text-sm font-semibold text-[#2F3A2E] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
            Modifica
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[#E2E5DE] px-6 py-6 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="project-title" className="text-lg font-semibold">
          Modifica il progetto
        </h2>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md px-2 py-1 text-sm text-[#5C6A5B] hover:bg-[#F0F2EC] focus-visible:outline-2 focus-visible:outline-primary"
        >
          Annulla
        </button>
      </div>

      <ActionForm
        action={updateProjectAction}
        submit="Salva le modifiche"
        resetOnSuccess={false}
        onSuccess={() => setEditing(false)}
        className="flex max-w-2xl flex-col gap-5"
        buttonClassName="self-start"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <label className={labelClass}>
          Nome del progetto
          <input name="title" required maxLength={200} defaultValue={project.title} className={fieldClass} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            Stanza
            <select name="zone" defaultValue={project.zone ?? ''} className={fieldClass}>
              <option value="">Nessuna in particolare</option>
              {ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {ZONE_LABEL_IT[zone]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Data del sopralluogo
            <input name="visitDate" type="date" defaultValue={project.visitDate ?? ''} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Descrizione per {firstName}
          <textarea
            name="summary"
            rows={4}
            maxLength={10000}
            defaultValue={project.summary ?? ''}
            placeholder="Riorganizziamo l'armadio a due ante e prepariamo il cambio di stagione."
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-[#7A8578]">
            {firstName} la legge in cima al progetto, nella sua area.
          </span>
        </label>
      </ActionForm>

      <div className="mt-8 max-w-2xl rounded-xl border border-[#E7B9B2] bg-[#FBF3F1] p-4">
        <p className="text-sm font-semibold text-[#8A3B31]">Eliminare il progetto</p>
        <p className="mt-1 text-sm text-[#8A3B31]/85">
          Cancella per sempre il progetto e tutto il suo materiale, file compresi. {firstName} non lo vedrà più.
        </p>
        <ActionForm
          action={deleteProjectAction}
          submit="Elimina il progetto"
          tone="danger"
          resetOnSuccess={false}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <label className="flex items-center gap-2 text-sm text-[#8A3B31]">
            <input type="checkbox" name="confirm" className="h-4 w-4 accent-[#8A3B31]" />
            Sì, eliminalo
          </label>
        </ActionForm>
      </div>
    </header>
  );
}
