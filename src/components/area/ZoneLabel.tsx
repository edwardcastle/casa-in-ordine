import { useTranslations } from 'next-intl';
import { ZONES, type Zone } from '@/lib/quote/config';

/**
 * The name of a zone, from the quote wizard's own strings.
 *
 * A zone stored in the database that the wizard does not know renders nothing
 * rather than a raw key.
 */
export default function ZoneLabel({ zone }: { zone: string | null }) {
  const t = useTranslations('quote.zones');
  if (!zone || !ZONES.includes(zone as Zone)) return null;

  return <>{t(`${zone as Zone}.label`)}</>;
}
