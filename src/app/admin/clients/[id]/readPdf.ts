import type { PdfLine, PdfTextItem } from '@/lib/area/pdf-to-doc';
import { itemsToLines } from '@/lib/area/pdf-to-doc';

/** Larger than any guide the organizers send; a bigger file is probably scanned photos. */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

/**
 * Reads the text of a PDF in the browser, page by page. The file never goes
 * to the server: only the note made from it does. pdf.js is loaded on first
 * use, so the admin page does not carry it until someone imports a PDF.
 */
export async function readPdfLines(file: File): Promise<PdfLine[][]> {
  // The legacy build: the default one needs JavaScript features only the
  // newest browsers have, and an organizer's browser may be a version behind.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  const pages: PdfLine[][] = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.filter((item) => 'str' in item) as unknown as PdfTextItem[];
      pages.push(itemsToLines(items));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}
