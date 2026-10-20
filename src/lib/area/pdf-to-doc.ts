import type { RichDoc, RichNode } from './rich-text';

/**
 * Turns the text of a PDF into a note the editor can open.
 *
 * A PDF has no paragraphs or headings, only lines of text at positions and
 * sizes. This rebuilds a reasonable structure from that: text clearly larger
 * than the body becomes a heading, lines that start with a bullet or a number
 * become lists, wrapped lines are joined back into paragraphs, and running
 * headers, footers and page numbers are dropped. The result is a starting
 * point the organizer tidies in the editor, not a faithful copy.
 */

export type PdfLine = {
  text: string;
  /** Font size of the line, in PDF units. */
  size: number;
  /** True when there is a visible gap above the line (a new block). */
  gapBefore: boolean;
};

const BULLET = /^\s*[•●▪◦‣∙·○■□➢➤✓✔\-–—*]\s+/;
const NUMBERED = /^\s*(\d{1,2})[.)]\s+/;
const PAGE_NUMBER = /^\s*(pag(ina|e)?\.?\s*)?\d{1,3}(\s*(\/|di|of)\s*\d{1,3})?\s*$/i;

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** A running header or footer, ignoring a page number stuck to its end. */
function lineKey(text: string): string {
  return text.replace(/\s*\d{1,3}\s*$/, '').trim().toLowerCase();
}

/** The size most of the text is set in, weighted by length. */
function bodySize(lines: PdfLine[]): number {
  const weight = new Map<number, number>();
  for (const line of lines) {
    const size = Math.round(line.size * 2) / 2;
    weight.set(size, (weight.get(size) ?? 0) + line.text.length);
  }
  let best = 0;
  let bestWeight = -1;
  for (const [size, w] of weight) {
    if (w > bestWeight) {
      best = size;
      bestWeight = w;
    }
  }
  return best || 10;
}

/** Lines repeated on most pages (a running title, a footer) say nothing new. */
function repeatedLines(pages: PdfLine[][]): Set<string> {
  if (pages.length < 3) return new Set();
  const seen = new Map<string, number>();
  for (const page of pages) {
    for (const key of new Set(page.map((l) => lineKey(clean(l.text))))) {
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  return new Set([...seen].filter(([, n]) => n >= Math.ceil(pages.length * 0.6)).map(([k]) => k));
}

/** Joins a wrapped line onto the text before it, mending hyphenated words. */
function join(before: string, line: string): string {
  if (!before) return line;
  if (/[A-Za-zÀ-ÿ]-$/.test(before)) return before.slice(0, -1) + line;
  return `${before} ${line}`;
}

const para = (text: string): RichNode => ({ type: 'paragraph', content: [{ type: 'text', text }] });

type Block =
  | { kind: 'text'; size: number; lines: number; text: string }
  | { kind: 'item'; list: 'bulletList' | 'orderedList'; text: string };

/**
 * Groups lines into blocks: a run of lines with no gap between them and the
 * same size is one block (a paragraph, or a heading set over two lines), and
 * every line that starts with a bullet or a number starts a list item that
 * collects its wrapped continuation lines.
 */
function toBlocks(lines: PdfLine[]): Block[] {
  const blocks: Block[] = [];
  for (const line of lines) {
    const text = line.text;
    const bullet = text.match(BULLET);
    const numbered = text.match(NUMBERED);
    const last = blocks[blocks.length - 1];

    if (bullet || numbered) {
      blocks.push({
        kind: 'item',
        list: bullet ? 'bulletList' : 'orderedList',
        text: text.slice((bullet ?? numbered)![0].length).trim(),
      });
    } else if (last?.kind === 'item' && !line.gapBefore) {
      last.text = join(last.text, text);
    } else if (last?.kind === 'text' && !line.gapBefore && Math.abs(last.size - line.size) <= 0.6) {
      last.text = join(last.text, text);
      last.lines += 1;
    } else {
      blocks.push({ kind: 'text', size: line.size, lines: 1, text });
    }
  }
  return blocks;
}

export function pdfLinesToDoc(pages: PdfLine[][]): RichDoc {
  const repeated = repeatedLines(pages);
  // Only the real text: a running header or page numbers set in another size
  // must not decide what counts as body text.
  const kept = pages.map((page) =>
    page
      .map((l) => ({ ...l, text: clean(l.text) }))
      .filter((l) => l.text && !PAGE_NUMBER.test(l.text) && !repeated.has(lineKey(l.text))),
  );
  const body = bodySize(kept.flat());

  const content: RichNode[] = [];
  let list: { type: 'bulletList' | 'orderedList'; items: string[] } | null = null;
  const flushList = () => {
    if (list) {
      content.push({
        type: list.type,
        content: list.items.map((item) => ({ type: 'listItem', content: [para(item)] })),
      });
    }
    list = null;
  };

  for (const block of kept.flatMap(toBlocks)) {
    if (block.kind === 'item') {
      if (!list || list.type !== block.list) {
        flushList();
        list = { type: block.list, items: [] };
      }
      list.items.push(block.text);
      continue;
    }
    flushList();

    const ratio = block.size / body;
    // A heading is larger than the body and short. A larger block that runs
    // on (an introduction set in a bigger size) stays a paragraph.
    if (ratio >= 1.15 && block.text.length <= 100 && block.lines <= 3) {
      content.push({ type: 'heading', attrs: { level: ratio >= 1.5 ? 2 : 3 }, content: [{ type: 'text', text: block.text }] });
    } else {
      content.push(para(block.text));
    }
  }
  flushList();

  return { type: 'doc', content };
}

/** "Guida_Organizzazione_Casa_IT.pdf" -> "Guida Organizzazione Casa IT". */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/** The parts of a pdf.js text item this needs. */
export type PdfTextItem = { str: string; transform: number[]; width?: number; height: number; hasEOL?: boolean };

/**
 * Groups one page's text items into lines, top to bottom, and marks where a
 * vertical gap starts a new block. pdf.js gives text in drawing order with a
 * position each; items on the same baseline belong to one line.
 */
export function itemsToLines(items: PdfTextItem[]): PdfLine[] {
  const pieces = items
    .filter((item) => typeof item.str === 'string' && item.str.length > 0 && Array.isArray(item.transform))
    .map((item) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width ?? 0,
      size: item.height || Math.hypot(item.transform[2], item.transform[3]) || 0,
    }));

  // Same line: baselines within a fraction of the text size.
  pieces.sort((a, b) => b.y - a.y || a.x - b.x);
  type Part = { x: number; width: number; text: string };
  const rows: { y: number; size: number; parts: Part[] }[] = [];
  for (const piece of pieces) {
    const row = rows[rows.length - 1];
    const part = { x: piece.x, width: piece.width, text: piece.text };
    if (row && Math.abs(row.y - piece.y) <= Math.max(2, piece.size * 0.4)) {
      row.parts.push(part);
      row.size = Math.max(row.size, piece.size);
    } else {
      rows.push({ y: piece.y, size: piece.size, parts: [part] });
    }
  }

  /**
   * Joins the pieces of a line. Pieces that touch are one word (a letter-
   * spaced title arrives one letter per piece); a gap the width of a space
   * or more is a word break.
   */
  const lineText = (parts: Part[], size: number) => {
    let out = '';
    let end: number | null = null;
    for (const part of parts.sort((a, b) => a.x - b.x)) {
      const gap = end === null ? 0 : part.x - end;
      const needsSpace = out && !/\s$/.test(out) && !/^\s/.test(part.text) && (part.width === 0 || gap > size * 0.2);
      out += (needsSpace ? ' ' : '') + part.text;
      end = part.x + part.width;
    }
    return out.replace(/\s+/g, ' ').trim();
  };

  return rows.map((row, i) => {
    const text = lineText(row.parts, row.size);
    const previous = rows[i - 1];
    // Ordinary line spacing is about 1.2 to 1.5 times the size; more is a gap.
    const gapBefore = !previous || previous.y - row.y > Math.max(row.size, previous.size) * 1.75;
    return { text, size: row.size, gapBefore };
  });
}
