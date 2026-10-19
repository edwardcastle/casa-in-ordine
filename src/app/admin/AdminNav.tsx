import Link from 'next/link';

const LINKS = [
  { key: 'reviews', href: '/admin/reviews', label: 'Recensioni' },
  { key: 'leads', href: '/admin/leads', label: 'Richieste catalogo' },
  { key: 'clients', href: '/admin/clients', label: 'Clienti' },
  { key: 'tips', href: '/admin/tips', label: 'Consigli' },
] as const;

export type AdminSection = (typeof LINKS)[number]['key'];

/**
 * Navigation between the admin pages. Rendered by each page, after its sign-in
 * check, rather than by the layout: the layout also wraps the sign-in screen,
 * and the links should not be shown to someone who is not signed in.
 */
export default function AdminNav({ current }: { current: AdminSection }) {
  return (
    <nav aria-label="Amministrazione" className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === current ? 'page' : undefined}
          className={
            link.key === current
              ? 'font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4'
              : 'text-primary underline hover:text-primary-dark'
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
