import type { ComponentProps } from 'react';

/**
 * Tailwind-styled renderers for MDX article bodies. Defined here (no
 * @tailwindcss/typography dependency) so blog posts inherit the site palette.
 */
export const mdxComponents = {
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className="mt-8 mb-4 text-3xl font-bold text-foreground" {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="mt-10 mb-3 text-2xl font-bold text-foreground" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="mt-8 mb-2 text-xl font-semibold text-foreground" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p className="leading-relaxed text-foreground/90" {...props} />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="list-disc space-y-2 pl-6 text-foreground/90" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="list-decimal space-y-2 pl-6 text-foreground/90" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="leading-relaxed" {...props} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a
      className="font-medium text-primary underline hover:text-accent"
      {...props}
    />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      className="border-l-4 border-primary/40 pl-4 italic text-foreground/70"
      {...props}
    />
  ),
};
