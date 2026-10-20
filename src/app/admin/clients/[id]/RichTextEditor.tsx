'use client';

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';
import type { RichDoc } from '@/lib/area/rich-text';

/**
 * The note editor. It writes the document as JSON into a hidden `doc` field,
 * so it sits inside an ordinary form; the server cleans that JSON before it
 * is stored. Only what the client area can show is offered: two heading
 * sizes, bold, italic, underline, lists, quotes and links.
 */

const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto'];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  bullet: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ordered: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5a1.5 1.5 0 1 1 2.5 1.1L3.5 19H6.5',
  quote: 'M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
};

export default function RichTextEditor({
  initial,
  placeholder,
  name = 'doc',
}: {
  initial?: RichDoc | null;
  placeholder?: string;
  name?: string;
}) {
  const [json, setJson] = useState(() => (initial ? JSON.stringify(initial) : ''));
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState(false);

  const editor = useEditor({
    // Rendered on the server first; the editor itself only exists in the browser.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ALLOWED_PROTOCOLS,
          isAllowedUri: (url) => /^(https?:\/\/|mailto:)/i.test(url),
        },
      }),
    ],
    content: initial ?? '',
    editorProps: {
      attributes: {
        class:
          'min-h-48 max-h-[60vh] overflow-y-auto px-4 py-3 text-[15px] font-normal leading-relaxed text-[#2F3A2E] focus:outline-none ' +
          '[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold ' +
          '[&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 ' +
          '[&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic ' +
          '[&_a]:text-[#3F4D3E] [&_a]:underline [&_strong]:font-semibold',
        ...(placeholder ? { 'aria-label': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: e }) => setJson(e.isEmpty ? '' : JSON.stringify(e.getJSON())),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      h3: e?.isActive('heading', { level: 3 }) ?? false,
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      ordered: e?.isActive('orderedList') ?? false,
      quote: e?.isActive('blockquote') ?? false,
      link: e?.isActive('link') ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  function openLink() {
    if (!editor) return;
    setLinkValue(editor.getAttributes('link').href ?? '');
    setLinkError(false);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const withProtocol = /^[a-z]+:/i.test(href) ? href : `https://${href}`;
    if (!/^(https?:\/\/|mailto:)/i.test(withProtocol)) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: withProtocol }).run();
    setLinkOpen(false);
  }

  const button = (active: boolean) =>
    `inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-35 ${
      active ? 'bg-[#3F4D3E] text-white' : 'text-[#3F4D3E] hover:bg-[#E9ECE5]'
    }`;

  const tools: { label: string; active: boolean; run: () => void; content: React.ReactNode; disabled?: boolean }[] = editor
    ? [
        { label: 'Titolo', active: state?.h2 ?? false, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), content: 'T1' },
        { label: 'Sottotitolo', active: state?.h3 ?? false, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), content: 'T2' },
        { label: 'Grassetto', active: state?.bold ?? false, run: () => editor.chain().focus().toggleBold().run(), content: <b>B</b> },
        { label: 'Corsivo', active: state?.italic ?? false, run: () => editor.chain().focus().toggleItalic().run(), content: <i className="font-serif">I</i> },
        { label: 'Sottolineato', active: state?.underline ?? false, run: () => editor.chain().focus().toggleUnderline().run(), content: <u>U</u> },
        { label: 'Elenco puntato', active: state?.bullet ?? false, run: () => editor.chain().focus().toggleBulletList().run(), content: <Icon d={ICONS.bullet} /> },
        { label: 'Elenco numerato', active: state?.ordered ?? false, run: () => editor.chain().focus().toggleOrderedList().run(), content: <Icon d={ICONS.ordered} /> },
        { label: 'Citazione', active: state?.quote ?? false, run: () => editor.chain().focus().toggleBlockquote().run(), content: <Icon d={ICONS.quote} /> },
        { label: 'Link', active: state?.link ?? false, run: openLink, content: <Icon d={ICONS.link} /> },
      ]
    : [];

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-[#DCE0D8] bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
      <input type="hidden" name={name} value={json} />

      <div role="toolbar" aria-label="Formattazione" className="flex flex-wrap items-center gap-0.5 border-b border-[#E2E5DE] bg-[#FAFBF8] px-2 py-1.5">
        {tools.map((tool, index) => (
          <span key={tool.label} className="contents">
            {(index === 2 || index === 5 || index === 8) && <span aria-hidden="true" className="mx-1 h-5 w-px bg-[#DCE0D8]" />}
            <button
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={tool.run}
              className={button(tool.active)}
            >
              {tool.content}
            </button>
          </span>
        ))}
        {editor && (
          <span className="ml-auto flex gap-0.5">
            <button type="button" title="Annulla" aria-label="Annulla" disabled={!state?.canUndo} onClick={() => editor.chain().focus().undo().run()} className={button(false)}>
              <Icon d={ICONS.undo} />
            </button>
            <button type="button" title="Ripeti" aria-label="Ripeti" disabled={!state?.canRedo} onClick={() => editor.chain().focus().redo().run()} className={button(false)}>
              <Icon d={ICONS.redo} />
            </button>
          </span>
        )}
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E5DE] bg-white px-3 py-2">
          <label className="sr-only" htmlFor="rich-link">
            Indirizzo del link
          </label>
          <input
            id="rich-link"
            autoFocus
            value={linkValue}
            onChange={(e) => {
              setLinkValue(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') setLinkOpen(false);
            }}
            placeholder="https://"
            className="min-w-0 flex-1 rounded-md border border-[#DCE0D8] px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={applyLink} className="rounded-md bg-[#3F4D3E] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2F3A2E]">
            Applica
          </button>
          {state?.link && (
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                setLinkOpen(false);
              }}
              className="rounded-md px-2 py-1.5 text-sm text-[#8A3B31] hover:bg-[#FBEDEA]"
            >
              Togli link
            </button>
          )}
          <button type="button" onClick={() => setLinkOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-[#5C6A5B] hover:bg-[#F0F2EC]">
            Chiudi
          </button>
          {linkError && <p className="w-full text-xs text-[#8A3B31]">Il link deve iniziare con http://, https:// o mailto:</p>}
        </div>
      )}

      <div className="relative">
        {/* From the saved value, not the editor's flag: that flag is only
            refreshed by an edit, so an editor opened with content in it would
            still show the hint on top of the text. */}
        {!json && placeholder && (
          <p aria-hidden="true" className="pointer-events-none absolute left-4 top-3 text-[15px] text-[#9AA197]">
            {placeholder}
          </p>
        )}
        {editor ? <EditorContent editor={editor} /> : <div className="min-h-48" />}
      </div>
    </div>
  );
}
