import { describe, expect, it } from 'vitest';
import { pdfLinesToDoc, titleFromFileName, type PdfLine } from '@/lib/area/pdf-to-doc';

const line = (text: string, size = 11, gapBefore = false): PdfLine => ({ text, size, gapBefore });
const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const item = (text: string) => ({ type: 'listItem', content: [p(text)] });

describe('PDF text to a note', () => {
  it('finds headings, joins wrapped lines into paragraphs and builds lists', () => {
    const doc = pdfLinesToDoc([
      [
        line('Guida all’organizzazione', 22),
        line('Questa guida ti accompagna passo dopo', 11, true),
        line('passo nel riordino dell’armadio.', 11),
        line('Cosa ti serve', 15, true),
        line('• Sei scatole trasparenti', 11, true),
        line('• Grucce in legno tutte', 11),
        line('uguali', 11),
        line('1. Svuota tutto', 11, true),
        line('2) Dividi per categorie', 11),
        line('Fine della prima parte.', 11, true),
      ],
    ]);

    expect(doc.content).toEqual([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Guida all’organizzazione' }] },
      p('Questa guida ti accompagna passo dopo passo nel riordino dell’armadio.'),
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Cosa ti serve' }] },
      { type: 'bulletList', content: [item('Sei scatole trasparenti'), item('Grucce in legno tutte uguali')] },
      { type: 'orderedList', content: [item('Svuota tutto'), item('Dividi per categorie')] },
      p('Fine della prima parte.'),
    ]);
  });

  it('mends hyphenated words and drops page numbers', () => {
    const doc = pdfLinesToDoc([[line('Un armadio orga-', 11), line('nizzato dura di più.', 11), line('3', 11, true)]]);
    expect(doc.content).toEqual([p('Un armadio organizzato dura di più.')]);
  });

  it('drops a header repeated on most pages', () => {
    const page = (text: string) => [line('Casa in Ordine – Guida', 9), line(text, 11, true)];
    const doc = pdfLinesToDoc([page('Prima.'), page('Seconda.'), page('Terza.')]);
    expect(doc.content).toEqual([p('Prima.'), p('Seconda.'), p('Terza.')]);
  });

  it('continues a heading set over two lines', () => {
    const doc = pdfLinesToDoc([
      [
        line('Il metodo per', 20),
        line('un armadio in ordine', 20),
        line('Il testo della guida è scritto in un corpo più piccolo del titolo.', 11, true),
      ],
    ]);
    expect(doc.content[0]).toEqual({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Il metodo per un armadio in ordine' }] });
  });

  it('gives an empty document for a PDF with no text', () => {
    expect(pdfLinesToDoc([[], []])).toEqual({ type: 'doc', content: [] });
  });

  it('builds a readable title from the file name', () => {
    expect(titleFromFileName('Guida_Organizzazione_Casa_in_Ordine_IT.pdf')).toBe('Guida Organizzazione Casa in Ordine IT');
  });
});
