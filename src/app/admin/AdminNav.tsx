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
    <nav aria-label="Amministrazione" className="mb-8 flex justify-center">
      <ul className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full bg-secondary p-1 text-sm">
        {LINKS.map((link) => {
          const active = link.key === current;
          return (
            <li key={link.key}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-full px-4 py-1.5 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? 'bg-white text-foreground shadow-[0_1px_3px_rgba(45,45,45,0.12)]'
                    : 'text-gray-600 hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
