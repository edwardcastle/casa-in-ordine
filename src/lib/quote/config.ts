// --- Work-package pricing model ---
//
// The wizard asks categorical questions per zone rather than numeric sizes, so
// the price is assembled from the options the visitor picks:
//
//   projectBase = zone.basePrice + Σ(price of every selected option)
//   projectCost = projectBase × accumulation multiplier
//   urgency     = projectCost × timing surcharge
//   total       = projectCost + urgency
//
// Options with price 0 are diagnostic — they tell the team what to prepare but
// do not move the estimate.

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
  /** Package starting price before any option is added. */
  basePrice: number;
  questions: QuoteQuestion[];
}

export const zoneConfigs: Record<Zone, ZoneConfig> = {
  armadio: {
    basePrice: 50,
    questions: [
      {
        id: 'tipologia',
        type: 'single',
        options: [
          { id: 'standard', price: 0 },
          { id: 'grande', price: 25 },
          { id: 'cabina', price: 60 },
        ],
      },
      {
        id: 'destinatario',
        type: 'single',
        options: [
          { id: 'individuale', price: 0 },
          { id: 'coppia', price: 18 },
          { id: 'bambini', price: 10 },
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
          { id: 'si', price: 15 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },

  cucina: {
    basePrice: 65,
    questions: [
      {
        id: 'aree',
        type: 'multi',
        options: [
          { id: 'dispensa', price: 12 },
          { id: 'mobili', price: 22 },
          // Covers both of the above, so it cannot be combined with them.
          { id: 'completa', price: 35, exclusive: true },
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
          { id: 'si', price: 18 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },

  bagno: {
    basePrice: 38,
    questions: [
      {
        id: 'quantita',
        type: 'single',
        options: [
          { id: 'uno', price: 0 },
          { id: 'due', price: 28 },
        ],
      },
      {
        id: 'contenimento',
        type: 'multi',
        options: [
          { id: 'cassettoni', price: 8 },
          { id: 'colonna', price: 8 },
          { id: 'specchio', price: 6 },
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
    basePrice: 50,
    questions: [
      {
        id: 'area',
        type: 'single',
        options: [
          { id: 'soggiorno', price: 10 },
          { id: 'office', price: 0 },
          { id: 'giochi', price: 8 },
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
    basePrice: 100,
    questions: [
      {
        id: 'fase',
        type: 'single',
        options: [
          { id: 'pre', price: 0 },
          { id: 'imballaggio', price: 30 },
          { id: 'unpacking', price: 35 },
          { id: 'completo', price: 80 },
        ],
      },
      {
        id: 'vani',
        type: 'single',
        options: [
          { id: 'piccolo', price: 0 },
          { id: 'medio', price: 40 },
          { id: 'grande', price: 90 },
        ],
      },
    ],
  },

  garage: {
    basePrice: 75,
    questions: [
      {
        id: 'tipologia',
        type: 'single',
        options: [
          { id: 'ripostiglio', price: 0 },
          { id: 'box', price: 20 },
          { id: 'magazzino', price: 55 },
        ],
      },
      {
        id: 'contenuto',
        type: 'single',
        options: [
          { id: 'attrezzi', price: 12 },
          { id: 'scorte', price: 8 },
          { id: 'misto', price: 18 },
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
          { id: 'si', price: 20 },
          { id: 'no', price: 0 },
        ],
      },
    ],
  },
};

/** Closing questions, asked for every zone after the zone-specific ones. */
export const accumulationLevels = [
  { id: 'lieve', multiplier: 1.0, icon: '🌿' },
  { id: 'medio', multiplier: 1.15, icon: '🌤️' },
  { id: 'alto', multiplier: 1.3, icon: '🌪️' },
] as const;

/** A rush job costs more; booking within the month does not. */
export const timingOptions = [
  { id: 'asap', surcharge: 0.05, icon: '⚡' },
  { id: 'mese', surcharge: 0, icon: '🗓️' },
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

  const multiplier =
    accumulationLevels.find((l) => l.id === entry.accumulation)?.multiplier ?? 1;

  return (config.basePrice + optionsTotal) * multiplier;
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
 * timing surcharge applies once, to the whole job.
 */
export function calculateTotals(entries: QuoteEntry[], timing: TimingId | null): QuoteTotals {
  const zones = entries.map((entry) => ({
    id: entry.id,
    zone: entry.zone,
    subtotal: Math.round(entrySubtotal(entry)),
  }));

  const exactSubtotal = entries.reduce((sum, entry) => sum + entrySubtotal(entry), 0);
  const surcharge = timingOptions.find((t) => t.id === timing)?.surcharge ?? 0;
  const urgencyAmount = exactSubtotal * surcharge;

  return {
    zones,
    subtotal: Math.round(exactSubtotal),
    urgency: Math.round(urgencyAmount),
    total: Math.round(exactSubtotal + urgencyAmount),
  };
}
