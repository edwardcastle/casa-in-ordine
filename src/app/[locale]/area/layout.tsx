import type { Metadata } from 'next';

// Everything under /area is private. The robots.txt disallow keeps crawlers
// out; this keeps a page that is reached anyway (a shared link, a crawler that
// ignores robots.txt) out of the index and out of caches.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
