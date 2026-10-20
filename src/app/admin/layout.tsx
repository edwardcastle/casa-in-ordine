import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';

// The root layout renders only its children — `[locale]/layout.tsx` supplies
// the html/body for the public site. The admin pages sit outside the locale
// segment (they have no translations and no locale prefix), so they bring
// their own document, and their own copy of the site's typeface.

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Amministrazione · Casa in Ordine',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body
        className={`${montserrat.variable} font-sans bg-[#F7F7F4] text-[#2F3A2E] antialiased selection:bg-primary/25`}
      >
        {children}
      </body>
    </html>
  );
}
