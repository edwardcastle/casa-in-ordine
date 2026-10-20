'use client';

import { useState } from 'react';
import ActionForm from '../../ActionForm';
import { addTextMaterialAction } from '../actions';
import { FileIcon, LinkIcon, NoteIcon } from '../icons';
import UploadForm from '../UploadForm';
import RichTextEditor from './RichTextEditor';

type Kind = 'file' | 'note' | 'link';

const CHOICES = [
  { key: 'file', label: 'File', Icon: FileIcon },
  { key: 'note', label: 'Nota', Icon: NoteIcon },
  { key: 'link', label: 'Link', Icon: LinkIcon },
] as const;

export const fieldClass =
  'mt-1.5 w-full rounded-lg border border-[#DCE0D8] bg-white px-3 py-2.5 text-[15px] font-normal text-[#2F3A2E] placeholder:text-[#9AA197] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';
export const labelClass = 'block text-sm font-medium text-[#4A5649]';

/**
 * Adding material starts closed: three plain choices. Picking one opens just
 * that form; dropping a file anywhere on the choices opens the file form with
 * the file already in it. Nothing else competes for attention.
 */
export default function AddMaterial({ projectId, clientName }: { projectId: string; clientName: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [dropped, setDropped] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  if (kind) {
    return (
      <div className="rounded-xl border border-[#DCE0D8] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold">
            {kind === 'file' ? 'Nuovo file' : kind === 'note' ? 'Nuova nota' : 'Nuovo link'}
          </p>
          <button
            type="button"
            onClick={() => {
              setKind(null);
              setDropped(null);
            }}
            className="rounded-md px-2 py-1 text-sm text-[#5C6A5B] hover:bg-[#F0F2EC] focus-visible:outline-2 focus-visible:outline-primary"
          >
            Chiudi
          </button>
        </div>

        {kind === 'file' && <UploadForm projectId={projectId} initialFile={dropped} />}

        {kind === 'note' && (
          <ActionForm action={addTextMaterialAction} submit="Aggiungi la nota" onSuccess={() => setKind(null)} className="flex flex-col gap-4" buttonClassName="self-start">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="kind" value="note" />
            <label className={labelClass}>
              Titolo
              <input name="title" required maxLength={200} placeholder="Cosa comprare per l'armadio" className={fieldClass} />
            </label>
            <div className={labelClass}>
              Testo
              <RichTextEditor placeholder={`Quello che ${clientName} deve sapere: titoli, elenchi, link…`} />
            </div>
          </ActionForm>
        )}

        {kind === 'link' && (
          <ActionForm action={addTextMaterialAction} submit="Aggiungi il link" onSuccess={() => setKind(null)} className="flex flex-col gap-4" buttonClassName="self-start">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="kind" value="link" />
            <label className={labelClass}>
              Titolo
              <input name="title" required maxLength={200} placeholder="Scatole trasparenti consigliate" className={fieldClass} />
            </label>
            <label className={labelClass}>
              Indirizzo web
              <input name="body" type="url" required placeholder="https://" className={fieldClass} />
            </label>
          </ActionForm>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) {
          setDropped(file);
          setKind('file');
        }
      }}
      className={`rounded-xl border-2 border-dashed p-4 transition-colors duration-150 ${
        dragging ? 'border-primary bg-primary/5' : 'border-[#DCE0D8]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-[#5C6A5B]">Aggiungi</span>
        {CHOICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DCE0D8] bg-white px-3.5 py-2 text-sm font-semibold text-[#2F3A2E] shadow-[0_1px_0_rgba(47,58,46,0.04)] hover:border-primary hover:text-[#3F4D3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon className="h-[18px] w-[18px] text-primary" />
            {label}
          </button>
        ))}
        <span className="hidden text-sm text-[#7A8578] sm:inline">oppure trascina qui un file</span>
      </div>
    </div>
  );
}
