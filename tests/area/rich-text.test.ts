import { describe, expect, it } from 'vitest';
import { MAX_DOC_BYTES, cleanDoc, docFromText, docToText, parseDoc, safeHref } from '@/lib/area/rich-text';

const doc = (content: unknown[]) => ({ type: 'doc', content });
const text = (t: string, marks?: unknown[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });

describe('rich text cleaning', () => {
  it('keeps the allowed structure as it is', () => {
    const input = doc([
      { type: 'heading', attrs: { level: 2 }, content: [text('Cosa comprare')] },
      { type: 'paragraph', content: [text('Scatole ', [{ type: 'bold' }]), text('trasparenti', [{ type: 'italic' }])] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('Sei scatole')] }] }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [text('Meno è meglio')] }] },
      { type: 'paragraph', content: [text('Vedi qui', [{ type: 'link', attrs: { href: 'https://example.com/x', target: '_blank' } }])] },
    ]);
    expect(cleanDoc(input)).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Cosa comprare')] },
        { type: 'paragraph', content: [text('Scatole ', [{ type: 'bold' }]), text('trasparenti', [{ type: 'italic' }])] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('Sei scatole')] }] }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [text('Meno è meglio')] }] },
        { type: 'paragraph', content: [text('Vedi qui', [{ type: 'link', attrs: { href: 'https://example.com/x' } }])] },
      ],
    });
  });

  it('drops dangerous links but keeps their text', () => {
    const out = cleanDoc(
      doc([{ type: 'paragraph', content: [text('clic', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }, { type: 'bold' }])] }]),
    );
    expect(out?.content[0]).toEqual({ type: 'paragraph', content: [text('clic', [{ type: 'bold' }])] });
  });

  it('turns unknown blocks into their text and ignores unknown marks and attributes', () => {
    const out = cleanDoc(
      doc([
        { type: 'codeBlock', content: [text('<script>x</script>')] },
        { type: 'paragraph', attrs: { class: 'evil' }, content: [text('a', [{ type: 'highlight', attrs: { color: 'red' } }])] },
        { type: 'heading', attrs: { level: 1 }, content: [text('H')] },
      ]),
    );
    expect(out?.content).toEqual([
      text('<script>x</script>'),
      { type: 'paragraph', content: [text('a')] },
      { type: 'heading', attrs: { level: 2 }, content: [text('H')] },
    ]);
  });

  it('refuses things that are not a document, or too large', () => {
    expect(parseDoc('not json')).toBeNull();
    expect(parseDoc(JSON.stringify({ type: 'paragraph' }))).toBeNull();
    expect(parseDoc('x'.repeat(MAX_DOC_BYTES + 1))).toBeNull();
    expect(parseDoc(JSON.stringify(doc([])))).toEqual({ type: 'doc', content: [] });
  });

  it('accepts only web and mail links', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com/');
    expect(safeHref('mailto:info@casainordine.com')).toBe('mailto:info@casainordine.com');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('/relative')).toBeNull();
  });

  it('extracts plain text and rebuilds plain notes as documents', () => {
    const d = docFromText('Prima riga\nseconda riga\n\nNuovo paragrafo');
    expect(d.content).toHaveLength(2);
    expect(docToText(d)).toBe('Prima riga\nseconda riga\n\nNuovo paragrafo');
    expect(docToText({ type: 'doc', content: [{ type: 'paragraph', content: [] }] })).toBe('');
  });
});
