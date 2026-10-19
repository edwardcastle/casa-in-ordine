'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

/** The area's links. A client component only to know which page is open. */
export default function AreaNav() {
  const t = useTranslations('area.nav');
  const locale = useLocale();
  const pathname = usePathname();

  const base = `/${locale}/area`;
  const links = [
    { href: base, label: t('overview'), current: pathname === base || pathname.startsWith(`${base}/progetti`) },
    { href: `${base}/consigli`, label: t('tips'), current: pathname.startsWith(`${base}/consigli`) },
  ];

  return (
    <nav aria-label={t('label')} className="flex items-center gap-1 md:flex-col md:items-stretch">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          prefetch={false}
          aria-current={link.current ? 'page' : undefined}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            link.current
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-secondary-dark hover:text-primary-dark'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
