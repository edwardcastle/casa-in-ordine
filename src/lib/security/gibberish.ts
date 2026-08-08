/**
 * Detects keyboard mashing in a free-text field.
 *
 * The hard constraint is the false-positive side. This site takes enquiries in
 * Italian, English and Spanish, and occasionally in languages it does not
 * advertise at all — a French or German visitor must get through. So the rules
 * below lean on properties every Latin-script language shares (words contain
 * vowels, words are not thirty letters long) rather than on recognising
 * vocabulary, which would reject anyone writing in an unexpected language.
 */

const VOWELS = /[aeiouàáâäèéêëìíîïòóôöùúûüýÿœæ]/i;
const LETTERS = /[a-zà-öø-ÿ]/gi;

/** Longest word in ordinary use across the languages here sits around 20. */
const IMPLAUSIBLE_WORD_LENGTH = 22;

/** Below this, a message is too short for ratios to mean anything. */
const MIN_LETTERS_FOR_RATIO = 12;

/**
 * Keyboard rows. A word that is a straight run along one of them was traced
 * with a finger, not typed as language — and mashing like "qwerty uiop asdfg"
 * carries enough vowels to look ordinary to a ratio test.
 */
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Short runs appear inside real words, so only longer ones count. */
const MIN_KEYBOARD_RUN = 4;

/** A run this long is most of a row: one is already conclusive. */
const CONCLUSIVE_KEYBOARD_RUN = 6;

/**
 * A word built by repeating a short unit — "asdfasdf", "aoeuiaoeui". Real
 * words do this occasionally ("couscous"), so one is not enough on its own.
 */
function isRepeatedUnit(word: string): boolean {
  if (word.length < 6) return false;
  for (let unit = 2; unit <= word.length / 2; unit++) {
    if (word.length % unit !== 0) continue;
    if (word === word.slice(0, unit).repeat(word.length / unit)) return true;
  }
  return false;
}

function isKeyboardRun(word: string): boolean {
  if (word.length < MIN_KEYBOARD_RUN) return false;
  const lower = word.toLowerCase();
  const backwards = [...lower].reverse().join('');
  return KEYBOARD_ROWS.some((row) => row.includes(lower) || row.includes(backwards));
}

export interface GibberishSignals {
  /** A word far longer than any real one, and not a URL. */
  impossibleWord: boolean;
  /** Several substantial words containing no vowel at all. */
  vowellessWords: number;
  /** Words traced along a keyboard row. */
  keyboardRuns: number;
  /** The longest keyboard run found. */
  longestKeyboardRun: number;
  /** Words made of one short unit repeated. */
  repeatedUnits: number;
  /** Share of letters that are vowels, or null when there is too little text. */
  vowelRatio: number | null;
}

function words(text: string): string[] {
  return text
    .split(/[^a-zà-öø-ÿ]+/i)
    .filter((w) => w.length > 0);
}

export function gibberishSignals(text: string): GibberishSignals {
  // URLs are legitimately long and vowel-poor; the link rules judge those.
  const withoutUrls = text.replace(/https?:\/\/\S+|www\.\S+/gi, ' ');
  const tokens = words(withoutUrls);

  const letters = (withoutUrls.match(LETTERS) ?? []).length;
  const vowelCount = (withoutUrls.match(/[aeiouàáâäèéêëìíîïòóôöùúûüýÿœæ]/gi) ?? []).length;

  return {
    impossibleWord: tokens.some((w) => w.length >= IMPLAUSIBLE_WORD_LENGTH),
    // Four letters or more, because plenty of real abbreviations are shorter
    // and Slavic or Welsh loanwords can be legitimately vowel-light.
    vowellessWords: tokens.filter((w) => w.length >= 4 && !VOWELS.test(w)).length,
    keyboardRuns: tokens.filter(isKeyboardRun).length,
    longestKeyboardRun: tokens.filter(isKeyboardRun).reduce((n, w) => Math.max(n, w.length), 0),
    repeatedUnits: tokens.filter(isRepeatedUnit).length,
    vowelRatio: letters >= MIN_LETTERS_FOR_RATIO ? vowelCount / letters : null,
  };
}

/**
 * Additive score. Every Latin-script language this site might receive runs
 * roughly 35–50% vowels, so a message far below that was not typed as words.
 */
export function gibberishScore(text: string, strongSignal: number): number {
  const {
    impossibleWord,
    vowellessWords,
    keyboardRuns,
    longestKeyboardRun,
    repeatedUnits,
    vowelRatio,
  } = gibberishSignals(text);
  let score = 0;

  if (impossibleWord) score += strongSignal;

  // One such word can be an acronym or a surname; several is a keyboard.
  if (vowellessWords >= 2) score += strongSignal;

  // A single run could be a coincidence inside a real word; two is a hand
  // dragged across the keys. One long enough to span most of a row settles it
  // by itself.
  if (keyboardRuns >= 2 || longestKeyboardRun >= CONCLUSIVE_KEYBOARD_RUN) score += strongSignal;

  if (repeatedUnits >= 2) score += strongSignal;

  if (vowelRatio !== null) {
    // Too few vowels is a hand on the home row; too many is the same hand on a
    // Dvorak layout, where the home row is the vowels. Real prose in any of
    // these languages sits between the two.
    if (vowelRatio < 0.18 || vowelRatio > 0.62) score += strongSignal;
    else if (vowelRatio < 0.28) score += strongSignal - 1;
  }

  return score;
}
