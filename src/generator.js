const UINT32_RANGE = 0x100000000;
const SYMBOLS = '!@#$%&*+-=?';
const SEPARATORS = new Set(['.', '-', '_', '']);
// Unlike $, this end assertion cannot accept a trailing line terminator.
const WORD = /^[a-z]+(?:-[a-z]+)*(?![\s\S])/;

function validateWords(words, unique = false) {
  if (!Array.isArray(words) || words.length === 0 || words.length > UINT32_RANGE) {
    throw new TypeError('words must be a nonempty array');
  }
  const seen = unique ? new Set() : null;
  for (const word of words) {
    if (typeof word !== 'string' || !WORD.test(word)) {
      throw new TypeError('words must be lowercase ASCII letters with optional internal hyphens');
    }
    if (seen?.has(word)) throw new TypeError('wordlist must not contain duplicates');
    seen?.add(word);
  }
}

function validateCount(count) {
  if (!Number.isInteger(count) || count < 3 || count > 6) {
    throw new RangeError('count must be an integer from 3 through 6');
  }
}

function validateOptions(opts, keys) {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError('opts must be an object');
  }
  if (Object.keys(opts).some(key => !keys.includes(key)) ||
      keys.some(key => !Object.hasOwn(opts, key))) {
    throw new TypeError(`opts must contain exactly: ${keys.join(', ')}`);
  }
  if (!SEPARATORS.has(opts.sep)) throw new RangeError('unsupported separator');
}

function validateBuildOptions(opts) {
  validateOptions(opts, ['count', 'sep', 'cap', 'digit', 'sym']);
  validateCount(opts.count);
  for (const key of ['cap', 'digit', 'sym']) {
    if (typeof opts[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
  }
}

function validateCapIndex(words, index) {
  if (!Number.isInteger(index) || index < -1 || index >= words.length) {
    throw new RangeError('capIndex must be -1 or a word index');
  }
}

function validatePosition(value, pos, count, name) {
  if (!Number.isInteger(pos) || (value === null ? pos !== -1 : pos < 0 || pos > count)) {
    throw new RangeError(`${name} position must be -1 when absent, otherwise a gap from 0 through count`);
  }
}

/**
 * Uniform integer in [0, n), assuming independent uniform uint32 source values.
 * Production callers must supply Web Crypto; no weak fallback is provided.
 */
export function randInt(rand32, n) {
  if (typeof rand32 !== 'function') throw new TypeError('rand32 must be a function');
  if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) {
    throw new RangeError('n must be an integer from 1 through 2^32');
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % n);
  let value;
  do {
    value = rand32();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new RangeError('rand32 must return an integer from 0 through 2^32 - 1');
    }
  } while (value >= limit);
  return value % n;
}

/** Select count words independently with replacement; do not mutate the list. */
export function pickWords(list, count, rand32) {
  validateWords(list, true);
  validateCount(count);
  return Array.from({ length: count }, () => list[randInt(rand32, list.length)]);
}

/** Return a copy with only the indexed word's first ASCII letter uppercased. */
export function capitalizeAt(words, index) {
  validateWords(words);
  validateCapIndex(words, index);
  return words.map((word, i) => i === index ? word[0].toUpperCase() + word.slice(1) : word);
}

/**
 * opts = {sep, capIndex, digit, digitPos, sym, symPos} (all fields required).
 * Positions are ORIGINAL word gaps 0..words.length, not shifted token indices.
 * Gap 0 is before word 0; gap count is after the last word. At a shared gap,
 * digit precedes symbol. Join every resulting token with sep, including extras.
 * Absent extras are null with position -1; digit is a number 0..9.
 */
export function assemble(words, opts) {
  validateWords(words);
  validateCount(words.length);
  validateOptions(opts, ['sep', 'capIndex', 'digit', 'digitPos', 'sym', 'symPos']);
  validateCapIndex(words, opts.capIndex);
  if (opts.digit !== null && (!Number.isInteger(opts.digit) || opts.digit < 0 || opts.digit > 9)) {
    throw new RangeError('digit must be null or an integer from 0 through 9');
  }
  if (opts.sym !== null && (typeof opts.sym !== 'string' || opts.sym.length !== 1 || !SYMBOLS.includes(opts.sym))) {
    throw new RangeError(`sym must be null or one character from ${SYMBOLS}`);
  }
  validatePosition(opts.digit, opts.digitPos, words.length, 'digit');
  validatePosition(opts.sym, opts.symPos, words.length, 'symbol');
  const casedWords = capitalizeAt(words, opts.capIndex);
  const tokens = [];
  for (let gap = 0; gap <= words.length; gap += 1) {
    if (opts.digit !== null && opts.digitPos === gap) tokens.push(String(opts.digit));
    if (opts.sym !== null && opts.symPos === gap) tokens.push(opts.sym);
    if (gap < words.length) tokens.push(casedWords[gap]);
  }
  return tokens.join(opts.sep);
}

/**
 * opts = {count: 3..6, sep: '.'|'-'|'_'|'', cap: boolean,
 *         digit: boolean, sym: boolean}; no defaults or coercion.
 * All random choices are independent. words contains the original lowercase
 * selections (repetition allowed), suitable for in-memory chip rerolls.
 */
export function buildPassword(list, opts, rand32) {
  validateBuildOptions(opts);
  const words = pickWords(list, opts.count, rand32);
  const capIndex = opts.cap ? randInt(rand32, opts.count) : -1;
  const digit = opts.digit ? randInt(rand32, 10) : null;
  const digitPos = opts.digit ? randInt(rand32, opts.count + 1) : -1;
  const sym = opts.sym ? SYMBOLS[randInt(rand32, SYMBOLS.length)] : null;
  const symPos = opts.sym ? randInt(rand32, opts.count + 1) : -1;
  const construction = { capIndex, digit, digitPos, sym, symPos };
  return { password: assemble(words, { sep: opts.sep, ...construction }), words, ...construction };
}

/**
 * Conservative engineering estimate, NOT a formal min-entropy certification.
 * Attacker model: offline, generator/list/options known, hypothetical 10^12
 * guesses/second. The rate does not affect bits; time depends on the hash/KDF.
 * Count only independent uniform word choices recoverable from the output:
 * count * log2(runtime unique list length). Credit no casing/extras/position bits.
 * Return null for unseparated output or a word containing the separator, where
 * this implementation has not established unique decoding. See methodology.
 */
export function entropyBits(list, opts) {
  validateWords(list, true);
  validateBuildOptions(opts);
  if (opts.sep === '' || list.some(word => word.includes(opts.sep))) return null;
  return opts.count * Math.log2(list.length);
}
