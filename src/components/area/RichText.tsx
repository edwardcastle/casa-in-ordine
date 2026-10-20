import type { ReactNode } from 'react';
import { safeHref, type RichDoc, type RichMark, type RichNode } from '@/lib/area/rich-text';

/**
 * Shows a formatted note. The document was cleaned before it was saved; this
 * walks it again and builds React elements for the allowed node types only,
 * so nothing in a note is ever treated as HTML. Styles follow the blog's
 * article typography so notes read like the rest of the site.
 */

function withMarks(text: string, marks: RichMark[] | undefined, key: number): ReactNode {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') node = <strong className="font-semibold text-foreground">{node}</strong>;
    else if (mark.type === 'italic') node = <em>{node}</em>;
    else if (mark.type === 'underline') node = <u>{node}</u>;
    else if (mark.type === 'strike') node = <s>{node}</s>;
    else if (mark.type === 'link') {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        node = (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-dark underline underline-offset-2 hover:text-accent">
            {node}
          </a>
        );
      }
    }
  }
  return <span key={key}>{node}</span>;
}

function render(nodes: RichNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, i) => {
    switch (node.type) {
      case 'text':
        return withMarks(node.text, node.marks, i);
      case 'hardBreak':
        return <br key={i} />;
      case 'horizontalRule':
        return <hr key={i} className="my-6 border-secondary-dark" />;
      case 'paragraph':
        return (
          <p key={i} className="leading-relaxed text-foreground/90">
            {render(node.content)}
          </p>
        );
      case 'heading':
        return node.attrs.level === 3 ? (
          <h4 key={i} className="mt-5 text-base font-semibold text-foreground">
            {render(node.content)}
          </h4>
        ) : (
          <h3 key={i} className="mt-6 text-lg font-semibold text-foreground">
            {render(node.content)}
          </h3>
        );
      case 'bulletList':
        return (
          <ul key={i} className="list-disc space-y-1.5 pl-6 text-foreground/90">
            {render(node.content)}
          </ul>
        );
      case 'orderedList':
        return (
          <ol key={i} className="list-decimal space-y-1.5 pl-6 text-foreground/90">
            {render(node.content)}
          </ol>
        );
      case 'listItem':
        return (
          <li key={i} className="leading-relaxed [&>p]:inline">
            {render(node.content)}
          </li>
        );
      case 'blockquote':
        return (
          <blockquote key={i} className="border-l-2 border-primary/50 pl-4 italic text-foreground/75">
            {render(node.content)}
          </blockquote>
        );
      default:
        return null;
    }
  });
}

export default function RichText({ doc, className = '' }: { doc: RichDoc; className?: string }) {
  return <div className={`space-y-3 break-words text-[15px] ${className}`}>{render(doc.content)}</div>;
}
