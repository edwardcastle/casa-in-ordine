'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

type Labels = { loading: string; error: string; page: string };

/** Matches the client area's background (`secondary-light`). */
const PAGE_BACKGROUND = '#FDFBF7';

/**
 * Shows a PDF inside the page, as the client would see it printed: every page
 * drawn with its own layout, pictures, colours and charts, at the width of the
 * column. A text layer over each page keeps the words selectable and readable
 * by screen readers. Pages are drawn as they scroll into view, so a long guide
 * does not hold up the rest of the page.
 *
 * The file comes from the same ownership-checked route as a download.
 */
export default function PdfDocument({ src, labels }: { src: string; labels: Labels }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    (async () => {
      try {
        // The legacy build runs on browsers a version or two behind.
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        // Whole-file download: storage does not expose the headers range
        // requests need, and files are capped at 15 MB. One retry covers a
        // passing network or storage hiccup before the client sees an error.
        const open = async () => {
          const loading = pdfjs.getDocument({ url: src, disableRange: true, disableStream: true });
          task = loading;
          return loading.promise;
        };
        let doc;
        try {
          doc = await open();
        } catch {
          if (cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, 1200));
          doc = await open();
        }
        if (!cancelled) setPdf(doc);
      } catch (error) {
        console.error(error);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      // Whole pixels only, so tiny layout jitters do not redraw every page.
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="w-full">
      {failed ? (
        <p className="rounded-lg bg-secondary-light px-4 py-3 text-sm text-gray-700">{labels.error}</p>
      ) : !pdf || width === 0 ? (
        <div className="flex aspect-[1/1.414] w-full items-center justify-center">
          <p role="status" className="text-sm text-gray-600">
            {labels.loading}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {Array.from({ length: pdf.numPages }, (_, i) => (
            <li key={i}>
              <PdfPage
                pdf={pdf}
                number={i + 1}
                width={width}
                label={labels.page.replace('{n}', String(i + 1)).replace('{total}', String(pdf.numPages))}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PdfPage({ pdf, number, width, label }: { pdf: PDFDocumentProxy; number: number; width: number; label: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Until drawn, reserve the space of an A4 page so the scroll position holds.
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    let render: { cancel: () => void } | null = null;

    (async () => {
      const page = await pdf.getPage(number);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const viewport = page.getViewport({ scale });
      setRatio(viewport.height / viewport.width);

      const canvas = canvasRef.current;
      const text = textRef.current;
      if (!canvas || !text) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const task = page.render({
        canvas,
        viewport,
        // The area's own background instead of white paper, so the page reads
        // as part of this page rather than a sheet laid on top. Not
        // transparent: pdf.js draws on an opaque canvas, where "transparent"
        // comes out black.
        background: PAGE_BACKGROUND,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      render = task;
      try {
        await task.promise;
      } catch {
        return; // cancelled by a newer width
      }
      if (cancelled) return;

      const { TextLayer } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      text.replaceChildren();
      text.style.setProperty('--scale-factor', String(scale));
      text.style.setProperty('--total-scale-factor', String(scale));
      await new TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport }).render();
    })();

    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [visible, width, pdf, number]);

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div ref={textRef} className="pdf-text-layer" />
    </div>
  );
}
