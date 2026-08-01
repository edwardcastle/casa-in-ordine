#!/usr/bin/env node
/**
 * Verifies every locale file exposes the same key set as the reference locale.
 * next-intl throws at runtime on a missing key, and a missing key in one locale
 * is invisible while developing in another.
 *
 *   node scripts/check-messages.mjs
 */
import { readFileSync } from 'node:fs';

const REFERENCE = 'it';
const LOCALES = ['it', 'en', 'es'];

function flatten(value, prefix = '') {
  if (Array.isArray(value)) {
    // Arrays are positional (quiz options): compare length, not contents.
    return [`${prefix}[${value.length}]`];
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

const keysByLocale = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    new Set(flatten(JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')))),
  ]),
);

const reference = keysByLocale[REFERENCE];
let failed = false;

for (const locale of LOCALES.filter((l) => l !== REFERENCE)) {
  const keys = keysByLocale[locale];
  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));

  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${locale}.json differs from ${REFERENCE}.json:`);
    missing.forEach((k) => console.error(`  missing: ${k}`));
    extra.forEach((k) => console.error(`  extra:   ${k}`));
  }
}

// The wizard builds these key paths at runtime from the chosen area, so a gap
// here is invisible until someone picks that area in that language.
const CATEGORIES = ['armadio', 'cucina', 'ufficio', 'bagno', 'garage', 'trasloco'];
const AREA_KEYS = [
  'detailsTitle',
  'detailsSubtitle',
  'complexitySubtitle',
  'complexity.light.title',
  'complexity.light.description',
  'complexity.moderate.title',
  'complexity.moderate.description',
  'complexity.critical.title',
  'complexity.critical.description',
  'quiz.q1.question',
  'quiz.q2.question',
  'quiz.q3.question',
  'extra.label',
  'extra.desc',
  'sensitization.low',
  'sensitization.mid',
  'sensitization.high',
];

function get(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

for (const locale of LOCALES) {
  const quote = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).quote;

  for (const category of CATEGORIES) {
    const area = quote.areas?.[category];
    if (!area) {
      failed = true;
      console.error(`${locale}.json: quote.areas.${category} is missing`);
      continue;
    }

    for (const key of AREA_KEYS) {
      if (typeof get(area, key) !== 'string') {
        failed = true;
        console.error(`${locale}.json: quote.areas.${category}.${key} is missing`);
      }
    }

    // Options are read by index, so the count is load-bearing.
    for (const q of ['q1', 'q2', 'q3']) {
      const options = area.quiz?.[q]?.options;
      if (!Array.isArray(options) || options.length !== 3) {
        failed = true;
        console.error(`${locale}.json: quote.areas.${category}.quiz.${q}.options must have 3 entries`);
      }
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `All ${LOCALES.length} locales match ${REFERENCE}.json (${reference.size} keys) ` +
    `and define all ${CATEGORIES.length} areas.`,
);
