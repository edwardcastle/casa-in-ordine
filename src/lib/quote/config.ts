// --- Work-package pricing model ---
// Flat package prices per room type, sized by scope.
// Small increments per extra unit keep totals accessible.
// Typical range: €30 (small bathroom) – €200 (large move).
//
// Formula:
//   projectBase   = basePrice + Σ(first unit × costPerUnit + extra units × costPerUnit × 0.15)
//   projectCost   = projectBase × complexityMultiplier
//   extrasCost    = Σ(flat base + percent × projectCost) for each selected extra
//   urgency       = quiz score (0–6) mapped to 0–5% of (projectCost + extrasCost)
//   total         = projectCost + extrasCost + urgency

export type Category = 'armadio' | 'cucina' | 'ufficio' | 'bagno' | 'garage' | 'trasloco';

export const CATEGORIES: Category[] = ['armadio', 'cucina', 'ufficio', 'bagno', 'garage', 'trasloco'];

/** Number of clutter questions asked after the area is chosen. */
export const QUIZ_LENGTH = 3;

/** Options per question. Index 0 is always the calmest answer, 2 the most chaotic. */
export const QUIZ_OPTIONS = 3;

interface CategoryConfig {
  basePrice: number; // package starting price
  fields: { id: string; costPerUnit: number }[];
}

export const categoryConfigs: Record<Category, CategoryConfig> = {
  armadio: {
    basePrice: 50,      // basic 2-door wardrobe package
    fields: [
      { id: 'doors', costPerUnit: 8 },
      { id: 'drawers', costPerUnit: 4 },
      { id: 'height', costPerUnit: 10 },
    ],
  },
  cucina: {
    basePrice: 65,      // standard kitchen package
    fields: [
      { id: 'modules', costPerUnit: 5 },
      { id: 'pantry', costPerUnit: 20 },
      { id: 'counters', costPerUnit: 8 },
    ],
  },
  ufficio: {
    basePrice: 50,      // single-desk office package
    fields: [
      { id: 'desks', costPerUnit: 12 },
      { id: 'documents', costPerUnit: 8 },
    ],
  },
  bagno: {
    basePrice: 38,      // small bathroom package
    fields: [
      { id: 'cabinets', costPerUnit: 8 },
      { id: 'shelves', costPerUnit: 4 },
    ],
  },
  garage: {
    basePrice: 75,      // standard garage package
    fields: [
      { id: 'racks', costPerUnit: 10 },
      { id: 'tools', costPerUnit: 15 },
    ],
  },
  trasloco: {
    basePrice: 100,     // small move/unpack package
    fields: [
      { id: 'boxes', costPerUnit: 2.5 },
      { id: 'rooms', costPerUnit: 25 },
    ],
  },
};

// Complexity tiers — surcharges on the package price
export const complexityLevels = [
  { value: 1, key: 'light', icon: '🌿' },
  { value: 1.5, key: 'moderate', icon: '🌤️' },
  { value: 2, key: 'critical', icon: '🌪️' },
] as const;

export const complexityMultipliers: Record<number, number> = {
  1: 1.0,    // light: standard package
  1.5: 1.15, // moderate: +15%
  2: 1.3,    // critical: +30%
};

export interface ExtraConfig {
  id: string;
  baseCost: number;
  percent: number;
  icon: string;
}

/** Add-ons offered for every area. Labels live at `quote.extras.<id>`. */
export const universalExtras: ExtraConfig[] = [
  { id: 'materials', baseCost: 8, percent: 0.025, icon: '📦' },
  { id: 'dump', baseCost: 10, percent: 0.025, icon: '🚛' },
];

/** One extra per area. Labels live at `quote.areas.<category>.extra`. */
export const categoryExtras: Record<Category, ExtraConfig> = {
  armadio: { id: 'cambioStagione', baseCost: 12, percent: 0.025, icon: '🍂' },
  cucina: { id: 'scadenze', baseCost: 15, percent: 0.025, icon: '🗓️' },
  ufficio: { id: 'archiviazione', baseCost: 15, percent: 0.025, icon: '🗂️' },
  bagno: { id: 'sottolavabo', baseCost: 10, percent: 0.025, icon: '🧴' },
  garage: { id: 'inventario', baseCost: 12, percent: 0.025, icon: '🔧' },
  trasloco: { id: 'etichettatura', baseCost: 12, percent: 0.025, icon: '🏷️' },
};

export function extrasForCategory(category: Category): ExtraConfig[] {
  return [...universalExtras, categoryExtras[category]];
}

/** Sum of the chosen option indices, 0–6. Unanswered questions score 0. */
export function quizScore(answers: (number | null)[]): number {
  return answers.reduce<number>((sum, index) => sum + (index ?? 0), 0);
}

/** Max quiz score maps to a 5% urgency surcharge. */
export const MAX_QUIZ_SCORE = QUIZ_LENGTH * (QUIZ_OPTIONS - 1);
export const MAX_URGENCY_PERCENT = 0.05;

/** Which sensitization paragraph the result page shows, by quiz score. */
export function sensitizationBand(score: number): 'low' | 'mid' | 'high' {
  if (score <= 1) return 'low';
  if (score <= 3) return 'mid';
  return 'high';
}
