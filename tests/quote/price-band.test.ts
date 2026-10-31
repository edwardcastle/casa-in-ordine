import { describe, expect, it } from 'vitest';
import {
  ZONES,
  accumulationLevels,
  calculateTotals,
  timingOptions,
  zoneConfigs,
  type QuoteEntry,
  type Zone,
  type ZoneAnswers,
} from '@/lib/quote/config';

/** Answers that pick the cheapest (or dearest) option of every question. */
function answers(zone: Zone, pick: 'cheapest' | 'dearest'): ZoneAnswers {
  return Object.fromEntries(
    zoneConfigs[zone].questions.map((q) => {
      if (pick === 'cheapest') {
        const min = Math.min(...q.options.map((o) => o.price));
        return [q.id, q.type === 'single' ? [q.options.find((o) => o.price === min)!.id] : []];
      }
      if (q.type === 'single') {
        const max = Math.max(...q.options.map((o) => o.price));
        return [q.id, [q.options.find((o) => o.price === max)!.id]];
      }
      // Multi: the exclusive option alone, or every non-exclusive one — whichever costs more.
      const exclusive = q.options.filter((o) => o.exclusive);
      const rest = q.options.filter((o) => !o.exclusive);
      const exclusivePrice = Math.max(0, ...exclusive.map((o) => o.price));
      const restPrice = rest.reduce((s, o) => s + o.price, 0);
      return [q.id, exclusivePrice > restPrice ? [exclusive[0].id] : rest.map((o) => o.id)];
    }),
  );
}

const lightest = accumulationLevels[0].id;
const heaviest = accumulationLevels[accumulationLevels.length - 1].id;

function price(zone: Zone, pick: 'cheapest' | 'dearest', rush: boolean): number {
  const entry: QuoteEntry = {
    id: 1,
    zone,
    answers: answers(zone, pick),
    accumulation: pick === 'cheapest' ? lightest : heaviest,
  };
  return calculateTotals([entry], rush ? 'asap' : 'mese').total;
}

describe('quote price band', () => {
  // The estimate is a lead number, not an invoice: whatever a visitor clicks,
  // one room should read as a professional's half day to a full day.
  it.each(ZONES.filter((z) => z !== 'trasloco'))('%s stays between €120 and €200', (zone) => {
    expect(price(zone, 'cheapest', false)).toBeGreaterThanOrEqual(120);
    expect(price(zone, 'dearest', true)).toBeLessThanOrEqual(200);
  });

  // A move is days of work, so it alone may run above the band.
  it('trasloco starts above the others and may reach €280', () => {
    expect(price('trasloco', 'cheapest', false)).toBeGreaterThan(120);
    expect(price('trasloco', 'dearest', true)).toBeLessThanOrEqual(280);
    expect(price('trasloco', 'dearest', true)).toBeGreaterThan(200);
  });

  it('uses the whole band: some room costs exactly €120, some exactly €200', () => {
    const rooms = ZONES.filter((z) => z !== 'trasloco');
    expect(Math.min(...rooms.map((z) => price(z, 'cheapest', false)))).toBe(120);
    expect(Math.max(...rooms.map((z) => price(z, 'dearest', true)))).toBe(200);
  });

  it('every priced option moves the estimate by at least €10', () => {
    for (const zone of ZONES) {
      for (const q of zoneConfigs[zone].questions) {
        for (const o of q.options) {
          expect(o.price === 0 || o.price >= 10, `${zone}.${q.id}.${o.id} = €${o.price}`).toBe(true);
        }
      }
    }
  });

  it('adds accumulation and urgency instead of multiplying them', () => {
    const base: QuoteEntry = { id: 1, zone: 'bagno', answers: answers('bagno', 'cheapest'), accumulation: lightest };
    const heavy = { ...base, accumulation: heaviest };
    const step = accumulationLevels[accumulationLevels.length - 1].price;
    expect(calculateTotals([heavy], 'mese').total - calculateTotals([base], 'mese').total).toBe(step);
    const rush = timingOptions.find((t) => t.id === 'asap')!.price;
    expect(calculateTotals([base], 'asap').urgency).toBe(rush);
    // Once per quote, not per room.
    expect(calculateTotals([base, { ...base, id: 2 }], 'asap').urgency).toBe(rush);
  });
});
