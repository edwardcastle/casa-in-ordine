#!/usr/bin/env node
/**
 * Verifies every locale file exposes the same key set as the reference locale,
 * and that each quote zone defines the full question/option tree.
 *
 * next-intl does not throw on a missing key: it renders the dotted key path
 * into the page. The wizard builds its keys from the chosen zone, so a gap is
 * invisible until someone picks that zone in that language — and then it ships
 * "zones.garage.label" to a customer rather than failing loudly.
 *
 *   node scripts/check-messages.mjs
 */
import { readFileSync } from 'node:fs';

const REFERENCE = 'it';
const LOCALES = ['it', 'en', 'es'];
const ZONES = ['armadio', 'cucina', 'bagno', 'living', 'trasloco', 'garage'];
const CLOSING = ['accumulo', 'timing'];

// Namespaces that must never hold customer-supplied or customer-attributed
// content. src/lib/chat/knowledge.ts flattens every message namespace except a
// short top-level list into the chat assistant's knowledge base, and the locale
// layout hands the whole message object to NextIntlClientProvider — so anything
// added here is asserted to visitors as fact and shipped in every page payload.
// Client reviews live in typed data under src/content/ for exactly this reason.
const FORBIDDEN_PATHS = ['home.testimonials', 'home.reviews.items', 'reviews.items'];

function flatten(value, prefix = '') {
  if (Array.isArray(value)) {
    // Arrays are positional: compare length, not contents.
    return [`${prefix}[${value.length}]`];
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

const messages = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')),
  ]),
);

const keysByLocale = Object.fromEntries(
  LOCALES.map((locale) => [locale, new Set(flatten(messages[locale]))]),
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

// Structural check: the wizard reads zones.<zone>.questions.<q>.options.<o>,
// so every locale must agree on which questions and options exist.
const refZones = messages[REFERENCE].quote.zones;

for (const locale of LOCALES) {
  const quote = messages[locale].quote;

  for (const zone of ZONES) {
    const block = quote.zones?.[zone];
    if (!block) {
      failed = true;
      console.error(`${locale}.json: quote.zones.${zone} is missing`);
      continue;
    }

    for (const field of ['label', 'tagline']) {
      if (typeof block[field] !== 'string') {
        failed = true;
        console.error(`${locale}.json: quote.zones.${zone}.${field} is missing`);
      }
    }

    const refQuestions = Object.keys(refZones[zone].questions);
    const questions = Object.keys(block.questions ?? {});

    if (questions.join() !== refQuestions.join()) {
      failed = true;
      console.error(
        `${locale}.json: quote.zones.${zone} questions [${questions}] ` +
          `do not match ${REFERENCE} [${refQuestions}]`,
      );
      continue;
    }

    for (const q of refQuestions) {
      if (typeof block.questions[q].question !== 'string') {
        failed = true;
        console.error(`${locale}.json: quote.zones.${zone}.questions.${q}.question is missing`);
      }
      const refOptions = Object.keys(refZones[zone].questions[q].options);
      const options = Object.keys(block.questions[q].options ?? {});
      if (options.join() !== refOptions.join()) {
        failed = true;
        console.error(
          `${locale}.json: quote.zones.${zone}.questions.${q} options [${options}] ` +
            `do not match ${REFERENCE} [${refOptions}]`,
        );
      }
    }
  }

  for (const c of CLOSING) {
    const block = quote.closing?.[c];
    if (!block || typeof block.question !== 'string') {
      failed = true;
      console.error(`${locale}.json: quote.closing.${c} is missing`);
      continue;
    }
    const refOptions = Object.keys(messages[REFERENCE].quote.closing[c].options);
    const options = Object.keys(block.options ?? {});
    if (options.join() !== refOptions.join()) {
      failed = true;
      console.error(
        `${locale}.json: quote.closing.${c} options [${options}] ` +
          `do not match ${REFERENCE} [${refOptions}]`,
      );
    }
  }
}

// Structural check: flatten() collapses an array to a length token, so the key
// comparison above is blind to what is inside one. These paths are checked by
// name instead.
for (const locale of LOCALES) {
  for (const path of FORBIDDEN_PATHS) {
    const present = path
      .split('.')
      .reduce((node, key) => (node == null ? undefined : node[key]), messages[locale]);

    if (present !== undefined) {
      failed = true;
      console.error(
        `${locale}.json: ${path} is not allowed — the chat assistant ingests ` +
          `this namespace and would quote it as fact. Put client reviews in ` +
          `src/content/ instead.`,
      );
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `All ${LOCALES.length} locales match ${REFERENCE}.json (${reference.size} keys) ` +
    `and define all ${ZONES.length} zones.`,
);
