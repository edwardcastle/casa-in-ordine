import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ZoneLabel from '@/components/area/ZoneLabel';
import type { Tip } from '@/lib/area/queries';

/** Tips as cards. A tip with a blog post sends the client on to the public guide. */
export default function TipList({ tips, locale }: { tips: Tip[]; locale: string }) {
  const t = useTranslations('area.tips');

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {tips.map((tip) => (
        <li key={tip.id} className="flex flex-col rounded-xl border border-secondary-dark bg-white p-5">
          {tip.zone && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-dark">
              <ZoneLabel zone={tip.zone} />
            </p>
          )}
          <h3 className="mb-2 text-lg font-semibold text-foreground">{tip.title}</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{tip.body}</p>
          {tip.blogSlug && (
            <Link
              href={`/${locale}/blog/${encodeURIComponent(tip.blogSlug)}`}
              className="mt-4 inline-block self-start text-sm font-semibold text-primary-dark underline-offset-4 hover:underline"
            >
              {t('readGuide')} &rarr;
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
