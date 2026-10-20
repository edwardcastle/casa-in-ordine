import type { Zone } from './config';

/**
 * Italian names of the six rooms, for the admin. The public wizard reads its
 * own translated labels from the message files; the organizers always work
 * in Italian, whatever language the visitor used.
 */
export const ZONE_LABEL_IT: Record<Zone, string> = {
  armadio: 'Armadi e cabine armadio',
  cucina: 'Cucina e dispensa',
  bagno: 'Bagno e cura personale',
  living: 'Living e home office',
  trasloco: 'Trasloco',
  garage: 'Garage, cantina e ripostiglio',
};

export function zoneLabelIt(zone: string | null | undefined): string | null {
  return zone && zone in ZONE_LABEL_IT ? ZONE_LABEL_IT[zone as Zone] : null;
}
