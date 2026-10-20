'use client';

import { useState } from 'react';
import RichText from '@/components/area/RichText';
import { docFromText } from '@/lib/area/rich-text';
import type { Material } from '@/lib/area/queries';
import ActionForm from '../../ActionForm';
import { deleteMaterialAction, updateNoteAction } from '../actions';
import { NoteIcon } from '../icons';
import { fieldClass, labelClass } from './AddMaterial';
import RichTextEditor from './RichTextEditor';

/**
 * A note in the admin: a preview of what the client reads, and the same
 * editor used to write it. Older plain-text notes open in the editor as
 * paragraphs and are saved formatted from then on.
 */
export default function NoteTile({ material }: { material: Material }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-primary/40 bg-white p-4 shadow-[0_2px_10px_-6px_rgba(47,58,46,0.3)] sm:col-span-2">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold">Modifica la nota</p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2 py-1 text-sm text-[#5C6A5B] hover:bg-[#F0F2EC] focus-visible:outline-2 focus-visible:outline-primary"
          >
            Annulla
          </button>
        </div>
        <ActionForm
          action={updateNoteAction}
          submit="Salva la nota"
          resetOnSuccess={false}
          onSuccess={() => setEditing(false)}
          className="flex flex-col gap-4"
          buttonClassName="self-start"
        >
          <input type="hidden" name="materialId" value={material.id} />
          <label className={labelClass}>
            Titolo
            <input name="title" required maxLength={200} defaultValue={material.title} className={fieldClass} />
          </label>
          <div className={labelClass}>
            Testo
            <RichTextEditor initial={material.doc ?? docFromText(material.body ?? '')} />
          </div>
        </ActionForm>
      </li>
    );
  }

  return (
    <li className="relative flex flex-col rounded-xl border border-[#E2E5DE] bg-[#FBFBF9] p-4 sm:col-span-2">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-primary shadow-[0_1px_2px_rgba(47,58,46,0.08)]">
          <NoteIcon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="min-w-0 [overflow-wrap:anywhere] text-[15px] font-semibold leading-snug">{material.title}</p>
          <p className="mt-0.5 text-xs text-[#7A8578]">Nota</p>
        </div>
        <div className="flex flex-none items-start gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-xs font-semibold text-[#3F4D3E] hover:bg-[#E9ECE5] focus-visible:outline-2 focus-visible:outline-primary"
          >
            Modifica
          </button>
          <ActionForm action={deleteMaterialAction} submit="Rimuovi" tone="subtle" resetOnSuccess={false} className="flex flex-col items-end">
            <input type="hidden" name="materialId" value={material.id} />
          </ActionForm>
        </div>
      </div>
      <div className="relative mt-3 max-h-56 overflow-hidden">
        {material.doc ? (
          <RichText doc={material.doc} className="!text-sm" />
        ) : (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#4A5649]">{material.body}</p>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FBFBF9]" />
      </div>
    </li>
  );
}
