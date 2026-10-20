'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { validateUpload } from '@/lib/area/upload-rules';
import { errorText } from '../ActionForm';
import { attachUploadedFile, requestUploadUrl } from './actions';
import { UploadIcon } from './icons';

/** "Guida_Organizzazione-IT.pdf" -> "Guida Organizzazione IT", at most 200 characters. */
function defaultTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/** PUTs the file with XMLHttpRequest, because `fetch` cannot report upload progress. */
function putFile(url: string, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed with status ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

/**
 * Three steps, so the bytes never pass through our functions: ask the server
 * for a signed URL, PUT the file straight to Blob, then ask the server to
 * confirm the object exists before it becomes a material.
 */
export default function UploadForm({
  projectId,
  initialFile = null,
}: {
  projectId: string;
  /** A file dropped before this form opened; it is placed in the input. */
  initialFile?: File | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function chooseFile(file: File | null) {
    setDone(false);
    setError(null);
    setFileName(file?.name ?? null);
    if (file) setTitle(defaultTitle(file.name));
  }

  function placeFile(file: File) {
    if (!fileRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileRef.current.files = transfer.files;
    chooseFile(file);
  }

  useEffect(() => {
    if (initialFile) placeFile(initialFile);
    // Only the file the form was opened with; later choices go through the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    setError(null);
    setDone(false);
    if (!file) return setError('Scegli un file.');

    // Show the reason before any request is made.
    const check = validateUpload({ type: file.type, size: file.size });
    if (!check.ok) return setError(errorText(check.reason));

    setBusy(true);
    setProgress(0);
    try {
      const issued = await requestUploadUrl(projectId, { type: file.type, size: file.size });
      if ('error' in issued) return setError(errorText(issued.error));

      await putFile(issued.uploadUrl, file, setProgress);

      const attached = await attachUploadedFile(
        projectId,
        issued.key,
        title.trim() || defaultTitle(file.name),
      );
      if ('error' in attached) return setError(errorText(attached.error));

      setDone(true);
      setTitle('');
      setFileName(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Caricamento non riuscito. Controlla la connessione e riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) placeFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-within:border-primary hover:border-primary ${
          fileName ? 'border-primary/60 bg-white' : 'border-[#DCE0D8] bg-[#FAFBF8]'
        }`}
      >
        <UploadIcon className="h-6 w-6 text-primary-dark" />
        <span className="text-sm font-semibold text-foreground">
          {fileName ?? 'Scegli un file o trascinalo qui'}
        </span>
        <span className="text-xs text-gray-600">PDF, JPG, PNG o WebP, fino a 15 MB</span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      <label className="block text-sm font-medium text-[#4A5649]">
        Titolo che vedrà il cliente
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Es. Piano dell'armadio"
          className="mt-1.5 w-full rounded-lg border border-[#DCE0D8] bg-white px-3 py-2.5 text-[15px] font-normal text-[#2F3A2E] placeholder:text-[#9AA197] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#3F4D3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F3A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {busy ? 'Caricamento…' : 'Carica il file'}
        </button>
        {busy && (
          <progress
            value={progress}
            max={1}
            aria-label="Avanzamento del caricamento"
            className="h-2 w-40 accent-primary"
          />
        )}
        <span role="status" aria-live="polite" className="text-sm">
          {error ? <span className="text-red-800">{error}</span> : null}
          {done ? <span className="text-primary-dark">File caricato</span> : null}
        </span>
      </div>
    </form>
  );
}
