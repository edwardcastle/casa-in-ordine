/**
 * Rich text for notes: the document shape the editor produces, cleaned down
 * to what the client area knows how to show.
 *
 * The editor runs in the organizer's browser, so whatever it sends is
 * untrusted. `cleanDoc` rebuilds the document from an allowed list of nodes,
 * marks and attributes; anything else is dropped (unknown blocks keep their
 * text). The client area renders the cleaned tree node by node, never as an
 * HTML string, so there is no markup to inject.
 */

export type RichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'link'; attrs: { href: string } };

export type RichNode =
  | { type: 'text'; text: string; marks?: RichMark[] }
  | { type: 'hardBreak' }
  | { type: 'horizontalRule' }
  | { type: 'paragraph'; content?: RichNode[] }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: RichNode[] }
  | { type: 'bulletList'; content?: RichNode[] }
  | { type: 'orderedList'; content?: RichNode[] }
  | { type: 'listItem'; content?: RichNode[] }
  | { type: 'blockquote'; content?: RichNode[] };

export type RichDoc = { type: 'doc'; content: RichNode[] };

/** The serialized document is capped well above any real note. */
export const MAX_DOC_BYTES = 200_000;
const MAX_DEPTH = 12;

const SIMPLE_MARKS = new Set(['bold', 'italic', 'underline', 'strike']);
const CONTAINERS = new Set(['paragraph', 'bulletList', 'orderedList', 'listItem', 'blockquote']);

/** Only web and mail links: no javascript:, data:, or relative tricks. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (href.length > 2000) return null;
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

type Raw = { type?: unknown; text?: unknown; marks?: unknown; attrs?: { level?: unknown; href?: unknown }; content?: unknown };

function cleanMarks(marks: unknown): RichMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: RichMark[] = [];
  for (const mark of marks as Raw[]) {
    if (typeof mark?.type !== 'string') continue;
    if (SIMPLE_MARKS.has(mark.type)) out.push({ type: mark.type } as RichMark);
    if (mark.type === 'link') {
      const href = safeHref(mark.attrs?.href);
      if (href) out.push({ type: 'link', attrs: { href } });
    }
  }
  return out.length > 0 ? out : undefined;
}

function cleanNodes(nodes: unknown, depth: number): RichNode[] {
  if (!Array.isArray(nodes) || depth > MAX_DEPTH) return [];
  const out: RichNode[] = [];

  for (const node of nodes as Raw[]) {
    const type = node?.type;
    if (type === 'text') {
      if (typeof node.text === 'string' && node.text.length > 0) {
        const marks = cleanMarks(node.marks);
        out.push(marks ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text });
      }
    } else if (type === 'hardBreak' || type === 'horizontalRule') {
      out.push({ type });
    } else if (type === 'heading') {
      const level = node.attrs?.level === 3 ? 3 : 2;
      out.push({ type: 'heading', attrs: { level }, content: cleanNodes(node.content, depth + 1) });
    } else if (typeof type === 'string' && CONTAINERS.has(type)) {
      out.push({ type, content: cleanNodes(node.content, depth + 1) } as RichNode);
    } else {
      // An unknown block (a code block pasted from elsewhere, say) keeps its text.
      out.push(...cleanNodes(node?.content, depth + 1));
    }
  }
  return out;
}

export function cleanDoc(raw: unknown): RichDoc | null {
  if (!raw || typeof raw !== 'object' || (raw as Raw).type !== 'doc') return null;
  return { type: 'doc', content: cleanNodes((raw as Raw).content, 0) };
}

/** Parses what the editor posted. Null for anything that is not a usable document. */
export function parseDoc(json: string): RichDoc | null {
  if (!json || json.length > MAX_DOC_BYTES) return null;
  try {
    return cleanDoc(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The document's words, for the plain-text column and for empty checks. */
export function docToText(doc: RichDoc): string {
  const blocks: string[] = [];
  const walk = (nodes: RichNode[] | undefined, into: string[]) => {
    for (const node of nodes ?? []) {
      if (node.type === 'text') into.push(node.text);
      else if (node.type === 'hardBreak') into.push('\n');
      else if ('content' in node) {
        const inner: string[] = [];
        walk(node.content, inner);
        const text = inner.join('');
        if (text.trim()) blocks.push(text);
      }
    }
  };
  walk(doc.content, []);
  return blocks.join('\n\n').trim();
}

/** A plain-text note as a document, so older notes open in the editor. */
export function docFromText(text: string): RichDoc {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return {
    type: 'doc',
    content: paragraphs.map((p) => {
      const lines = p.split('\n');
      const content: RichNode[] = [];
      lines.forEach((line, i) => {
        if (i > 0) content.push({ type: 'hardBreak' });
        if (line) content.push({ type: 'text', text: line });
      });
      return { type: 'paragraph', content };
    }),
  };
}
