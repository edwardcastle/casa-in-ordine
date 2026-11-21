// --- Work-package pricing model ---
//
// The wizard asks categorical questions per zone rather than numeric sizes, so
// the price is assembled from the options the visitor picks:
//
//   zone price = MINIMUM_SESSION + zone.extra + Σ(price of every selected option)
//                + accumulation level
//   total      = Σ zone prices + urgency
//
// Everything is added, nothing multiplied. The estimate is a lead number, not
// an invoice — the team sends the real quote within 24 hours — so one room is
// meant to read as a professional's half day to a full day: €120 to €200
// whatever the visitor clicks. A multiplier on top of a €120 floor would have
// burst that ceiling, or left the zone questions moving the price by a few
// euro each. A move (trasloco) is the one zone allowed above the band, since
// it is days of work rather than hours: it starts at a full day (€250) and a
// complete house-to-house service on a large home runs past €1,000.
//
// Options with price 0 are diagnostic — they tell the team what to prepare but
// do not move the estimate. A priced option adds at least €10, so that every
// click the visitor makes is visible in the number.

/** What a professional organizer comes out for at all: half a day, any room. */
export const MINIMUM_SESSION = 120;

export type Zone = 'armadio' | 'cucina' | 'bagno' | 'living' | 'trasloco' | 'garage';

export const ZONES: Zone[] = ['armadio', 'cucina', 'bagno', 'living', 'trasloco', 'garage'];

export interface QuoteOption {
  id: string;
  /** € added to the project base when selected. */
  price: number;
  /**
   * Multi-select only: selecting this option clears the others, and selecting
   * any other clears this one. Used for "everything" options that would
   * otherwise overlap with the narrower ones.
   */
  exclusive?: boolean;
}

export interface QuoteQuestion {
  id: string;
  type: 'single' | 'multi';
  options: QuoteOption[];
}

export interface ZoneConfig {
  /** € added to MINIMUM_SESSION before any option: for zones that are more work even at their lightest. */
  extra: number;
  questions: QuoteQuestion[];
}

export const zoneConfigs: Record<Zone, ZoneConfig> = {
  armadio: {
    extra: 0,
    questions: [
      {
        id: 'tipologia',
        type: 'single',
        options: [
          { id: 'standard', price: 0 },
          { id: 'grande', price: 15 },
          { id: 'cabina', price: 30 },
        ],
      },
      {
        // Diagnostic: a couple's or a child's wardrobe is a different job, not
        // a bigger one — size is already asked above.
        id: 'destinatario',
        type: 'single',
        options: [
          { id: 'individuale', price: 0 },
          { id: 'coppia', price: 0 },
          { id: 'bambini', price: 0 },
        ],
      },
      {
        // Diagnostic: tells the team what to prepare, no price impact.
        id: 'difficolta',
        type: 'single',
        options: [
          { id: 'tempo', price: 0 },
          { id: 'pieno', price: 0 },
          { id: 'piegatura', price: 0 },
        ],
      },
      {
        id: 'cambioStagione',
        type: 'single',
        options: [
          { id: 'si', price: 10 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },

  cucina: {
    extra: 0,
    questions: [
      {
        id: 'aree',
        type: 'multi',
        options: [
          { id: 'dispensa', price: 10 },
          { id: 'mobili', price: 15 },
          // Covers both of the above, so it cannot be combined with them.
          { id: 'completa', price: 25, exclusive: true },
        ],
      },
      {
        id: 'problema',
        type: 'single',
        options: [
          { id: 'scadenze', price: 0 },
          { id: 'piani', price: 0 },
          { id: 'contenitori', price: 0 },
        ],
      },
      {
        id: 'acquisti',
        type: 'single',
        options: [
          { id: 'si', price: 10 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },

  bagno: {
    extra: 0,
    questions: [
      {
        id: 'quantita',
        type: 'single',
        options: [
          { id: 'uno', price: 0 },
          { id: 'due', price: 20 },
        ],
      },
      {
        // Diagnostic: which storage there is tells the team what to bring.
        id: 'contenimento',
        type: 'multi',
        options: [
          { id: 'cassettoni', price: 0 },
          { id: 'colonna', price: 0 },
          { id: 'specchio', price: 0 },
        ],
      },
      {
        id: 'esigenza',
        type: 'single',
        options: [
          { id: 'scaduti', price: 0 },
          { id: 'scorte', price: 0 },
        ],
      },
    ],
  },

  living: {
    extra: 0,
    questions: [
      {
        id: 'area',
        type: 'single',
        options: [
          { id: 'soggiorno', price: 10 },
          { id: 'office', price: 0 },
          { id: 'giochi', price: 10 },
        ],
      },
      {
        id: 'causa',
        type: 'single',
        options: [
          { id: 'documenti', price: 0 },
          { id: 'giocattoli', price: 0 },
          { id: 'decorativi', price: 0 },
        ],
      },
    ],
  },

  trasloco: {
    // Even the lightest move (pre-move decluttering of a one-bedroom flat) is
    // a full day, not a half: €250 before any option.
    extra: 130,
    questions: [
      {
        // Each phase is one or more extra days on site; the complete service
        // is all three phases plus the move day itself.
        id: 'fase',
        type: 'single',
        options: [
          { id: 'pre', price: 0 },
          { id: 'imballaggio', price: 120 },
          { id: 'unpacking', price: 150 },
          { id: 'completo', price: 400 },
        ],
      },
      {
        // Rooms multiply the days of every phase, so this is the biggest step.
        id: 'vani',
        type: 'single',
        options: [
          { id: 'piccolo', price: 0 },
          { id: 'medio', price: 200 },
          { id: 'grande', price: 450 },
        ],
      },
    ],
  },

  garage: {
    extra: 10,
    questions: [
      {
        id: 'tipologia',
        type: 'single',
        options: [
          { id: 'ripostiglio', price: 0 },
          { id: 'box', price: 10 },
          { id: 'magazzino', price: 15 },
        ],
      },
      {
        // Diagnostic: what is stored decides the method, not the hours.
        id: 'contenuto',
        type: 'single',
        options: [
          { id: 'attrezzi', price: 0 },
          { id: 'scorte', price: 0 },
          { id: 'misto', price: 0 },
        ],
      },
      {
        id: 'obiettivo',
        type: 'single',
        options: [
          { id: 'auto', price: 0 },
          { id: 'scaffalature', price: 0 },
          { id: 'selezione', price: 0 },
        ],
      },
      {
        id: 'smaltimento',
        type: 'single',
        options: [
          { id: 'si', price: 15 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },
};

/** Closing questions, asked for every zone after the zone-specific ones. */
export const accumulationLevels = [
  { id: 'lieve', price: 0, icon: '🌿' },
  { id: 'medio', price: 15, icon: '🌤️' },
  { id: 'alto', price: 30, icon: '🌪️' },
] as const;

/** A rush job costs a flat fee, once per quote; booking within the month does not. */
export const timingOptions = [
  { id: 'asap', price: 10, icon: '⚡' },
  { id: 'mese', price: 0, icon: '🗓️' },
] as const;

export type AccumulationId = (typeof accumulationLevels)[number]['id'];
export type TimingId = (typeof timingOptions)[number]['id'];

/** Answers to a zone's questions: question id → selected option ids. */
export type ZoneAnswers = Record<string, string[]>;

export function questionsFor(zone: Zone): QuoteQuestion[] {
  return zoneConfigs[zone].questions;
}

/**
 * Applies an option click. Single-choice replaces the selection; multi-choice
 * toggles, honouring `exclusive` so an "everything" option and the narrower
 * ones it covers can never both be selected.
 */
export function toggleOption(
  question: QuoteQuestion,
  selected: string[],
  optionId: string,
): string[] {
  if (question.type === 'single') {
    return selected.includes(optionId) ? [] : [optionId];
  }

  if (selected.includes(optionId)) {
    return selected.filter((id) => id !== optionId);
  }

  const isExclusive = question.options.find((o) => o.id === optionId)?.exclusive;
  if (isExclusive) return [optionId];

  const exclusiveIds = question.options.filter((o) => o.exclusive).map((o) => o.id);
  return [...selected.filter((id) => !exclusiveIds.includes(id)), optionId];
}

export function isAnswered(answers: ZoneAnswers, questionId: string): boolean {
  return (answers[questionId]?.length ?? 0) > 0;
}

/**
 * One zone the visitor has finished configuring. A quote is a list of these —
 * someone can have the closet, the kitchen and the garage priced in one go.
 */
export interface QuoteEntry {
  /** Stable across removals so React keys and edits stay correct. */
  id: number;
  zone: Zone;
  answers: ZoneAnswers;
  accumulation: AccumulationId;
}

/** Price of one zone, including its own accumulation level. */
export function entrySubtotal(entry: QuoteEntry): number {
  const config = zoneConfigs[entry.zone];

  const optionsTotal = config.questions.reduce((sum, question) => {
    const selected = entry.answers[question.id] ?? [];
    return (
      sum +
      question.options
        .filter((option) => selected.includes(option.id))
        .reduce((s, option) => s + option.price, 0)
    );
  }, 0);

  const accumulation =
    accumulationLevels.find((l) => l.id === entry.accumulation)?.price ?? 0;

  return MINIMUM_SESSION + config.extra + optionsTotal + accumulation;
}

export interface QuoteTotals {
  /** Per-entry subtotals, in the order the zones were added. */
  zones: { id: number; zone: Zone; subtotal: number }[];
  subtotal: number;
  urgency: number;
  total: number;
}

/**
 * Zones are priced independently and summed — no multi-zone discount. The
 * urgency fee is charged once, for the whole job.
 */
export function calculateTotals(entries: QuoteEntry[], timing: TimingId | null): QuoteTotals {
  const zones = entries.map((entry) => ({
    id: entry.id,
    zone: entry.zone,
    subtotal: entrySubtotal(entry),
  }));

  const subtotal = zones.reduce((sum, zone) => sum + zone.subtotal, 0);
  const urgency = timingOptions.find((t) => t.id === timing)?.price ?? 0;

  return { zones, subtotal, urgency, total: subtotal + urgency };
}
