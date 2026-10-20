'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { validateUpload } from '@/lib/area/upload-rules';
import { errorText } from '../ActionForm';
import { attachUploadedFile, requestUploadUrl } from './actions';
import { UploadIcon } from './icons';

/** "Piano cucina.final.pdf" -> "Piano cucina.final", at most 200 characters. */
function defaultTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').trim().slice(0, 200);
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
export default function UploadForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-within:border-primary hover:border-primary ${
          fileName ? 'border-primary/60 bg-white' : 'border-secondary-dark bg-white/60'
        }`}
      >
        <UploadIcon className="h-6 w-6 text-primary-dark" />
        <span className="text-sm font-semibold text-foreground">
          {fileName ?? 'Scegli un file dal computer'}
        </span>
        <span className="text-xs text-gray-600">PDF, JPG, PNG o WebP, fino a 15 MB</span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setDone(false);
            setError(null);
            setFileName(file?.name ?? null);
            if (file) setTitle(defaultTitle(file.name));
          }}
          className="sr-only"
        />
      </label>
      <label className="block text-xs font-semibold text-gray-700">
        Titolo che vedrà il cliente
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Es. Piano dell'armadio"
          className="mt-1.5 w-full rounded-lg border border-secondary-dark bg-white px-3 py-2 text-sm font-normal text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {busy ? 'Caricamento…' : 'Carica file'}
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
