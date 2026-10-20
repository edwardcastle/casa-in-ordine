'use client';

import { useId, useState } from 'react';
import ActionForm from '../../ActionForm';
import { addTextMaterialAction } from '../actions';
import UploadForm from '../UploadForm';
import { FileIcon, LinkIcon, NoteIcon } from '../icons';

const KINDS = [
  { key: 'file', label: 'File', hint: 'Piano, foto prima e dopo, PDF', Icon: FileIcon },
  { key: 'note', label: 'Nota', hint: 'Un consiglio o un promemoria', Icon: NoteIcon },
  { key: 'link', label: 'Link', hint: 'Un prodotto o una pagina utile', Icon: LinkIcon },
] as const;

type Kind = (typeof KINDS)[number]['key'];

export const fieldClass =
  'mt-1.5 w-full rounded-lg border border-secondary-dark bg-white px-3 py-2 text-sm font-normal text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';
export const labelClass = 'block text-xs font-semibold text-gray-700';

/**
 * One place to add material to a project. The organizer picks what kind of
 * thing it is first, and only that form is shown, instead of three forms at
 * once that all look equally important.
 */
export default function AddMaterial({ projectId }: { projectId: string }) {
  const [kind, setKind] = useState<Kind>('file');
  const base = useId();

  return (
    <div className="rounded-xl bg-secondary-light p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold text-foreground">Aggiungi per il cliente</p>

      <div role="tablist" aria-label="Tipo di materiale" className="mb-4 grid grid-cols-3 gap-2">
        {KINDS.map(({ key, label, hint, Icon }) => {
          const active = key === kind;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${base}-tab-${key}`}
              aria-selected={active}
              aria-controls={`${base}-panel`}
              onClick={() => setKind(key)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? 'border-primary bg-white text-foreground shadow-[0_1px_3px_rgba(45,45,45,0.10)]'
                  : 'border-transparent text-gray-600 hover:bg-white/70 hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-primary-dark' : ''}`} />
              <span className="text-sm font-semibold">{label}</span>
              <span className="hidden text-xs font-normal text-gray-600 sm:block">{hint}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${kind}`}>
        {kind === 'file' && <UploadForm projectId={projectId} />}

        {kind === 'note' && (
          <ActionForm
            action={addTextMaterialAction}
            submit="Aggiungi nota"
            className="flex flex-col gap-3"
            buttonClassName="self-start"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="kind" value="note" />
            <label className={labelClass}>
              Titolo
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Es. Cosa comprare per l'armadio"
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Testo
              <textarea
                name="body"
                required
                rows={4}
                maxLength={10000}
                placeholder="Scrivi qui quello che il cliente deve sapere."
                className={fieldClass}
              />
            </label>
          </ActionForm>
        )}

        {kind === 'link' && (
          <ActionForm
            action={addTextMaterialAction}
            submit="Aggiungi link"
            className="flex flex-col gap-3"
            buttonClassName="self-start"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="kind" value="link" />
            <label className={labelClass}>
              Titolo
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Es. Scatole trasparenti consigliate"
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Indirizzo web
              <input name="body" type="url" required placeholder="https://" className={fieldClass} />
            </label>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
