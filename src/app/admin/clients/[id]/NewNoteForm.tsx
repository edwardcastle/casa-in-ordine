'use client';

import { useRef, useState } from 'react';
import { pdfLinesToDoc, titleFromFileName } from '@/lib/area/pdf-to-doc';
import { docToText, type RichDoc } from '@/lib/area/rich-text';
import ActionForm from '../../ActionForm';
import { addTextMaterialAction } from '../actions';
import { FileIcon } from '../icons';
import { fieldClass, labelClass } from './formStyles';
import { MAX_IMPORT_BYTES, readPdfLines } from './readPdf';
import RichTextEditor from './RichTextEditor';

type ImportState = { status: 'idle' } | { status: 'reading' } | { status: 'done'; pages: number } | { status: 'error'; message: string };

/**
 * A new note, written in the editor or started from a PDF. Importing reads
 * the PDF's text in the browser and opens it in the editor as headings,
 * paragraphs and lists, to tidy before saving. The PDF itself is not kept.
 */
export default function NewNoteForm({
  projectId,
  clientName,
  onDone,
}: {
  projectId: string;
  clientName: string;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [doc, setDoc] = useState<RichDoc | null>(null);
  // A new key starts a fresh editor with the imported document in it.
  const [editorKey, setEditorKey] = useState(0);
  const [state, setState] = useState<ImportState>({ status: 'idle' });

  async function importPdf(file: File) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setState({ status: 'error', message: 'Scegli un file PDF.' });
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setState({ status: 'error', message: 'Il PDF supera 25 MB: probabilmente sono solo immagini.' });
      return;
    }

    setState({ status: 'reading' });
    try {
      const pages = await readPdfLines(file);
      const imported = pdfLinesToDoc(pages);
      if (!docToText(imported)) {
        setState({
          status: 'error',
          message: 'Questo PDF non contiene testo da copiare: forse è una scansione o fatto di sole immagini.',
        });
        return;
      }
      setDoc(imported);
      setEditorKey((k) => k + 1);
      setTitle((current) => current || titleFromFileName(file.name));
      setState({ status: 'done', pages: pages.length });
    } catch (error) {
      console.error(error);
      setState({ status: 'error', message: 'Non riesco a leggere questo PDF. È protetto o danneggiato?' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <ActionForm
      action={addTextMaterialAction}
      submit="Aggiungi la nota"
      onSuccess={onDone}
      className="flex flex-col gap-4"
      buttonClassName="self-start"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="kind" value="note" />

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F3F5F0] px-3 py-2.5">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          id={`pdf-import-${projectId}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importPdf(file);
          }}
        />
        <label
          htmlFor={`pdf-import-${projectId}`}
          aria-disabled={state.status === 'reading'}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#DCE0D8] bg-white px-3 py-1.5 text-sm font-semibold text-[#2F3A2E] hover:border-primary focus-within:outline-2 focus-within:outline-primary ${
            state.status === 'reading' ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <FileIcon className="h-4 w-4 text-primary" />
          {state.status === 'reading' ? 'Lettura del PDF…' : 'Importa da PDF'}
        </label>
        <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm">
          {state.status === 'idle' && (
            <span className="text-[#5C6A5B]">Copia qui il testo di un PDF, da sistemare prima di salvare.</span>
          )}
          {state.status === 'done' && (
            <span className="text-[#3F4D3E]">
              Testo importato da {state.pages} {state.pages === 1 ? 'pagina' : 'pagine'}. Controlla titoli ed elenchi, poi salva.
            </span>
          )}
          {state.status === 'error' && <span className="text-[#8A3B31]">{state.message}</span>}
        </p>
      </div>

      <label className={labelClass}>
        Titolo
        <input
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Cosa comprare per l'armadio"
          className={fieldClass}
        />
      </label>
      <div className={labelClass}>
        Testo
        <RichTextEditor
          key={editorKey}
          initial={doc}
          placeholder={`Quello che ${clientName} deve sapere: titoli, elenchi, link…`}
        />
      </div>
    </ActionForm>
  );
}
