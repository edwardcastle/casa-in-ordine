import { useTranslations } from 'next-intl';
import type { ProjectSummary } from '@/lib/area/queries';

const STYLES: Record<ProjectSummary['status'], { pill: string; dot: string }> = {
  planned: { pill: 'bg-secondary-dark text-gray-800', dot: 'bg-gray-500' },
  in_progress: { pill: 'bg-accent/20 text-gray-800', dot: 'bg-accent' },
  done: { pill: 'bg-primary/20 text-gray-800', dot: 'bg-primary-dark' },
};

/** The state of a project, as a word as well as a colour. */
export default function StatusBadge({ status }: { status: ProjectSummary['status'] }) {
  const t = useTranslations('area.status');
  const style = STYLES[status] ?? STYLES.planned;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.pill}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(status)}
    </span>
  );
}
