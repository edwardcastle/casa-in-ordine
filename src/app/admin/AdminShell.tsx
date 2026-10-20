import Link from 'next/link';
import { signOut } from '@/actions/admin';

export type AdminSection = 'quotes' | 'reviews' | 'leads' | 'clients' | 'tips';

type Crumb = { label: string; href?: string };

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[18px] w-[18px] flex-none"
    >
      <path d={d} />
    </svg>
  );
}

const SECTIONS: { key: AdminSection; href: string; label: string; icon: string }[] = [
  { key: 'quotes', href: '/admin/quotes', label: 'Preventivi', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { key: 'clients', href: '/admin/clients', label: 'Clienti', icon: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75' },
  { key: 'tips', href: '/admin/tips', label: 'Consigli', icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3' },
  { key: 'reviews', href: '/admin/reviews', label: 'Recensioni', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' },
  { key: 'leads', href: '/admin/leads', label: 'Richieste catalogo', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
];

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function NavLinks({ current }: { current: AdminSection }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {SECTIONS.map((section) => {
        const active = section.key === current;
        return (
          <li key={section.key}>
            <Link
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${focusRing} ${
                active ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'
              }`}
            >
              <Icon d={section.icon} />
              {section.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <Link href="/admin/quotes" className={`block rounded-md ${focusRing}`}>
      <span className="block text-lg font-semibold tracking-[-0.01em] text-white">casainordine</span>
      <span className="block text-xs text-white/55">Pannello di amministrazione</span>
    </Link>
  );
}

function SignedIn({ admin }: { admin: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white"
      >
        {admin.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-white/70" title={admin}>
          {admin}
        </p>
        <form action={signOut}>
          <button className={`rounded text-xs font-semibold text-white hover:underline ${focusRing}`}>Esci</button>
        </form>
      </div>
    </div>
  );
}

/**
 * The frame every signed-in admin page sits in: a fixed sidebar with the
 * sections, a top bar with where you are and the page's own actions, and the
 * work area. Pages render it after their sign-in check, so the sign-in screen
 * never shows the menu.
 */
export default function AdminShell({
  current,
  admin,
  title,
  description,
  breadcrumb,
  actions,
  children,
}: {
  current: AdminSection;
  admin: string;
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F5F2] lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between bg-[#2B3529] px-4 py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="px-3">
            <Brand />
          </div>
          <nav aria-label="Sezioni">
            <NavLinks current={current} />
          </nav>
        </div>
        <div className="border-t border-white/10 px-3 pt-4">
          <SignedIn admin={admin} />
        </div>
      </aside>

      {/* Phone and tablet: the same menu behind a button. */}
      <details className="group sticky top-0 z-30 bg-[#2B3529] lg:hidden">
        <summary
          className={`flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden ${focusRing}`}
        >
          <Brand />
          <span className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Chiudi</span>
          </span>
        </summary>
        <div className="flex flex-col gap-5 px-4 pb-5">
          <nav aria-label="Sezioni">
            <NavLinks current={current} />
          </nav>
          <div className="border-t border-white/10 pt-4">
            <SignedIn admin={admin} />
          </div>
        </div>
      </details>

      <header className="border-b border-[#E2E5DE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="min-w-0">
            {breadcrumb && breadcrumb.length > 0 && (
              <nav aria-label="Percorso" className="mb-1.5">
                <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#6B7769]">
                  {breadcrumb.map((crumb, index) => (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                      {index > 0 && <span aria-hidden="true">/</span>}
                      {crumb.href ? (
                        <Link href={crumb.href} className="rounded hover:text-[#2F3A2E] hover:underline">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span aria-current="page">{crumb.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <h1 className="break-words text-2xl font-semibold tracking-[-0.01em] text-[#2F3A2E]">{title}</h1>
            {description && <p className="mt-1 text-sm text-[#6B7769]">{description}</p>}
          </div>
          {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
