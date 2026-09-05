import type { Metadata } from 'next';

// The root layout renders only its children — `[locale]/layout.tsx` supplies
// the html/body for the public site. The admin pages sit outside the locale
// segment (they have no translations and no locale prefix), so they bring
// their own document.

export const metadata: Metadata = {
  title: 'Recensioni · Casa in Ordine',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-secondary-light text-foreground antialiased">{children}</body>
    </html>
  );
}
