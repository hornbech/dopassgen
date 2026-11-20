import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { randInt, pickWords, capitalizeAt, assemble, buildPassword, entropyBits } from '../src/generator.js';

// Frozen from index.html at 4d76321; keep the audited regression reproducible.
function legacyAssemble(words, opts) {
  const { sep, capIndex, digit, digitPos, sym, symPos } = opts;
  const parts = words.map((w, i) => i === capIndex ? w[0].toUpperCase() + w.slice(1) : w);
  const ins = [];
  if (digit !== null) ins.push([digitPos, String(digit)]);
  if (sym !== null) ins.push([symPos + (digit !== null && symPos >= digitPos ? 1 : 0), sym]);
  ins.sort((a, b) => a[0] - b[0]);
  let out = '', next = 0;
  for (const [pos, tok] of ins) {
    out += parts.slice(next, pos).join(sep) + (sep && pos > 0 && pos < parts.length ? sep : '') + tok;
    next = pos;
  }
  out += parts.slice(next).join(sep);
  return out;
}

const regressionWords = ['alpha', 'bravo', 'charlie'];
const regressionOptions = { sep: '.', capIndex: -1, digit: 7, digitPos: 0, sym: '!', symPos: 0 };

test('legacy regression is reproduced and corrected by the pure core', () => {
  assert.equal(legacyAssemble(regressionWords, regressionOptions), '7alpha.!bravo.charlie');
  assert.equal(assemble(regressionWords, regressionOptions), '7.!.alpha.bravo.charlie');
});

const basic = { count: 3, sep: '.', cap: false, digit: false, sym: false };
const plain = { sep: '.', capIndex: -1, digit: null, digitPos: -1, sym: null, symPos: -1 };
const symbols = '!@#$%&*+-=?';

function sequence(...values) {
  let index = 0;
  return () => {
    assert.ok(index < values.length, 'unexpected RNG consumption');
    return values[index++];
  };
}

function* constructions(words, sep) {
  const n = words.length;
  for (const cap of [false, true]) {
    for (const digitEnabled of [false, true]) {
      for (const symEnabled of [false, true]) {
        for (const capIndex of cap ? Array.from({ length: n }, (_, i) => i) : [-1]) {
          for (const digitPos of digitEnabled ? Array.from({ length: n + 1 }, (_, i) => i) : [-1]) {
            for (const symPos of symEnabled ? Array.from({ length: n + 1 }, (_, i) => i) : [-1]) {
              yield { sep, capIndex, digit: digitEnabled ? 7 : null, digitPos, sym: symEnabled ? '!' : null, symPos };
            }
          }
        }
      }
    }
  }
}

// Independent splice oracle: insert from right to left without shifting word gaps.
function referenceTokens(words, opts) {
  const tokens = words.map((w, i) => i === opts.capIndex ? w[0].toUpperCase() + w.slice(1) : w);
  const insertions = [];
  if (opts.digit !== null) insertions.push({ pos: opts.digitPos, order: 0, value: String(opts.digit) });
  if (opts.sym !== null) insertions.push({ pos: opts.symPos, order: 1, value: opts.sym });
  insertions.sort((a, b) => b.pos - a.pos || b.order - a.order);
  for (const { pos, value } of insertions) tokens.splice(pos, 0, value);
  return tokens;
}

test('all counts, separators, flags, cap indices and insertion gaps preserve words exactly', t => {
  const source = ['alfa', 'bravo', 'cello', 'delta', 'ember', 'fjord'];
  let cases = 0;
  let legacyMismatches = 0;
  for (let count = 3; count <= 6; count += 1) {
    const words = Object.freeze(source.slice(0, count));
    for (const sep of ['.', '-', '_', '']) {
      for (const opts of constructions(words, sep)) {
        Object.freeze(opts);
        const output = assemble(words, opts);
        const expected = referenceTokens(words, opts).join(sep);
        assert.equal(output, expected, JSON.stringify(opts));
        const legacy = legacyAssemble(words, opts);
        if (legacy !== expected) legacyMismatches += 1;
        let end = 0;
        let legacyEnd = 0;
        for (let i = 0; i < count; i += 1) {
          const word = i === opts.capIndex ? words[i][0].toUpperCase() + words[i].slice(1) : words[i];
          const start = output.indexOf(word, end);
          assert.ok(start >= end);
          assert.equal(output.split(word).length - 1, 1);
          end = start + word.length;
          const legacyStart = legacy.indexOf(word, legacyEnd);
          assert.ok(legacyStart >= legacyEnd, 'baseline word loss/reordering would be release blocking');
          assert.equal(legacy.split(word).length - 1, 1);
          legacyEnd = legacyStart + word.length;
        }
        cases += 1;
      }
    }
  }
  t.diagnostic(`${cases} exhaustive construction cases passed; ${legacyMismatches} legacy formatting/position mismatches, no legacy word loss in this enumeration`);
});

test('zero digit, every symbol, repeated words and all coincident boundaries', () => {
  for (const sym of symbols) {
    for (const sep of ['.', '-', '_', '']) {
      for (let pos = 0; pos <= 3; pos += 1) {
        const opts = { sep, capIndex: 1, digit: 0, digitPos: pos, sym, symPos: pos };
        assert.equal(assemble(['echo', 'echo', 'echo'], opts), referenceTokens(['echo', 'echo', 'echo'], opts).join(sep));
      }
    }
  }
});

test('randInt rejects the uneven tail and accepts the exact cutoff boundary', () => {
  assert.equal(randInt(sequence(0xffffffff, 0xfffffffa, 0xfffffff9), 10), 9);
  assert.equal(randInt(sequence(0xffffffff, 0xfffffffe), 3), 2);
  assert.equal(randInt(sequence(0xffffffff), 0x100000000), 0xffffffff);
  assert.equal(randInt(sequence(0xffffffff), 1), 0);
  assert.equal(randInt(sequence(0), 10), 0);
});

test('randInt small accepted cycles give each residue the same count', () => {
  for (const n of [2, 3, 7, 10, 11, 1296]) {
    const counts = Array(n).fill(0);
    for (let i = 0; i < n * 3; i += 1) counts[randInt(() => i, n)] += 1;
    assert.ok(counts.every(count => count === 3));
  }
});

test('randInt rejects invalid ranges, sources and source values', () => {
  for (const n of [0, -1, 1.5, NaN, Infinity, 0x100000001, '10', null, undefined]) {
    assert.throws(() => randInt(() => 0, n), RangeError);
  }
  for (const rng of [null, 0, {}, undefined]) assert.throws(() => randInt(rng, 3), TypeError);
  for (const value of [-1, 0x100000000, 0.5, NaN, Infinity, '0', null, undefined, 1n]) {
    assert.throws(() => randInt(() => value, 3), RangeError);
  }
  assert.throws(() => randInt(() => { throw new Error('crypto unavailable'); }, 3), /crypto unavailable/);
});

test('selection uses runtime length, permits repetition, and capitalization is immutable', () => {
  const list = Object.freeze(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
  assert.deepEqual(pickWords(list, 3, sequence(4, 4, 0)), ['echo', 'echo', 'alpha']);
  assert.deepEqual(capitalizeAt(list, -1), list);
  assert.notEqual(capitalizeAt(list, -1), list);
  assert.deepEqual(capitalizeAt(list, 4), ['alpha', 'bravo', 'charlie', 'delta', 'Echo']);
  assert.deepEqual(capitalizeAt(['yo-yo'], 0), ['Yo-yo']);
});

test('buildPassword exact result and deterministic draw order', () => {
  const list = Object.freeze(['alpha', 'bravo', 'charlie']);
  const opts = Object.freeze({ count: 3, sep: '_', cap: true, digit: true, sym: true });
  const result = buildPassword(list, opts, sequence(0, 1, 2, 1, 0, 3, 10, 3));
  assert.deepEqual(result, {
    password: 'alpha_Bravo_charlie_0_?', words: ['alpha', 'bravo', 'charlie'],
    capIndex: 1, digit: 0, digitPos: 3, sym: '?', symPos: 3,
  });
  assert.deepEqual(buildPassword(list, basic, sequence(2, 2, 2)), {
    password: 'charlie.charlie.charlie', words: ['charlie', 'charlie', 'charlie'],
    capIndex: -1, digit: null, digitPos: -1, sym: null, symPos: -1,
  });
});

test('buildPassword covers all supported presets and draws no disabled extras', () => {
  const list = Object.freeze(['alpha', 'bravo', 'charlie']);
  for (let count = 3; count <= 6; count += 1) {
    for (const sep of ['.', '-', '_', '']) {
      for (const cap of [false, true]) for (const digit of [false, true]) for (const sym of [false, true]) {
        let draws = 0;
        const result = buildPassword(list, { count, sep, cap, digit, sym }, () => { draws += 1; return 0; });
        assert.equal(draws, count + Number(cap) + 2 * Number(digit) + 2 * Number(sym));
        const words = Array(count).fill('alpha');
        assert.deepEqual(result.words, words);
        const construction = { sep, capIndex: cap ? 0 : -1, digit: digit ? 0 : null, digitPos: digit ? 0 : -1, sym: sym ? '!' : null, symPos: sym ? 0 : -1 };
        assert.equal(result.password, referenceTokens(words, construction).join(sep));
      }
    }
  }
});

test('invalid wordlists, counts, flags and assembly inputs fail closed', () => {
  const invalidLists = [null, 'alpha', [], [''], ['Alpha'], ['two words'], ['a.b'], ['a_'], ['-yo'], ['yo-'], ['a--b'], ['<tag>'], ['a\n'], ['a\u200b'], ['caf\u00e9'], [12], new Array(3)];
  for (const list of invalidLists) {
    assert.throws(() => pickWords(list, 3, () => 0));
    assert.throws(() => entropyBits(list, basic));
  }
  assert.throws(() => pickWords(['echo', 'echo'], 3, () => 0), /duplicates/);
  assert.throws(() => entropyBits(['echo', 'echo'], basic), /duplicates/);
  for (const count of [0, 2, 7, 3.5, '4', null, NaN]) {
    assert.throws(() => pickWords(['alpha'], count, () => 0));
    assert.throws(() => buildPassword(['alpha'], { ...basic, count }, () => 0));
  }
  for (const opts of [null, [], {}, { ...basic, extra: true }, { ...basic, cap: 1 }, { ...basic, digit: null }, { ...basic, sym: '!' }, { ...basic, sep: ' ' }]) {
    assert.throws(() => buildPassword(['alpha'], opts, () => 0));
    assert.throws(() => entropyBits(['alpha'], opts));
  }
  for (const patch of [
    { capIndex: 3 }, { capIndex: -2 }, { capIndex: 0.5 }, { digit: '7', digitPos: 0 },
    { digit: 10, digitPos: 0 }, { digit: 7, digitPos: -1 }, { digit: 7, digitPos: 4 },
    { digit: 7, digitPos: 0.5 }, { digitPos: 0 }, { sym: '', symPos: 0 },
    { sym: '!!', symPos: 0 }, { sym: '.', symPos: 0 }, { sym: '!', symPos: -1 },
    { sym: '!', symPos: 4 }, { symPos: 0 }, { sep: ':' }, { unexpected: false },
  ]) assert.throws(() => assemble(regressionWords, { ...plain, ...patch }));
  assert.throws(() => assemble(regressionWords, {}));
  assert.throws(() => assemble(['one', 'two'], plain));
  assert.throws(() => capitalizeAt(['alpha'], 1));
  assert.throws(() => capitalizeAt(['alpha'], '0'));
});

test('entropy counts only recoverable runtime word choices, never decoration bits', () => {
  const list = ['alpha', 'bravo', 'charlie', 'delta'];
  for (let count = 3; count <= 6; count += 1) {
    for (const cap of [false, true]) for (const digit of [false, true]) for (const sym of [false, true]) {
      const opts = { count, sep: '.', cap, digit, sym };
      assert.equal(entropyBits(list, opts), count * 2);
      assert.equal(entropyBits(list.slice(0, 2), opts), count);
      assert.equal(entropyBits(['alpha'], opts), 0);
    }
  }
});

test('ambiguous concatenation and separator-in-word estimates are unknown', () => {
  const list = ['a', 'aa'];
  assert.equal(assemble(['a', 'aa', 'a'], { ...plain, sep: '' }), assemble(['aa', 'a', 'a'], { ...plain, sep: '' }));
  assert.equal(entropyBits(list, { ...basic, sep: '' }), null);
  assert.equal(entropyBits(['cat', 'dog'], { ...basic, sep: '' }), null);
  assert.equal(entropyBits(['yo-yo', 'echo'], { ...basic, sep: '-' }), null);
  assert.equal(entropyBits(['yo-yo', 'echo'], basic), 3);
});

test('exhaustive small output distribution respects the credited word-only uncertainty', t => {
  const list = ['a', 'bb'];
  let distributions = 0;
  for (const sep of ['.', '-', '_']) {
    for (const cap of [false, true]) for (const digitEnabled of [false, true]) for (const symEnabled of [false, true]) {
      const frequencies = new Map();
      let total = 0;
      for (const a of list) for (const b of list) for (const c of list) {
        const words = [a, b, c];
        for (const capIndex of cap ? [0, 1, 2] : [-1]) {
          for (const digit of digitEnabled ? Array.from({ length: 10 }, (_, i) => i) : [null]) {
            for (const sym of symEnabled ? symbols : [null]) {
              for (const digitPos of digitEnabled ? [0, 1, 2, 3] : [-1]) {
                for (const symPos of symEnabled ? [0, 1, 2, 3] : [-1]) {
                  const output = assemble(words, { sep, capIndex, digit, digitPos, sym, symPos });
                  frequencies.set(output, (frequencies.get(output) ?? 0) + 1);
                  total += 1;
                }
              }
            }
          }
        }
      }
      const maxFrequency = Math.max(...frequencies.values());
      assert.ok(maxFrequency / total <= 1 / (list.length ** 3));
      distributions += 1;
    }
  }
  t.diagnostic(`${distributions} exhaustive small-list output distributions checked (not a universal proof)`);
});

test('actual downloaded wordlists validate and use runtime estimates', t => {
  const paths = [new URL('../eff_short.txt', import.meta.url), new URL('../da_words.txt', import.meta.url),
    ...readdirSync(new URL('../words/', import.meta.url)).filter(name => name.endsWith('.txt')).map(name => new URL(`../words/${name}`, import.meta.url))];
  for (const path of paths) {
    const list = readFileSync(path, 'utf8').trimEnd().split(/\r?\n/);
    const result = buildPassword(list, { ...basic, cap: true, digit: true, sym: true }, () => 0);
    assert.equal(result.words.length, 3);
    assert.equal(entropyBits(list, basic), 3 * Math.log2(list.length));
  }
  t.diagnostic(`${paths.length} actual wordlist files exercised (including legacy paths)`);
});

test('Web Crypto caller integration produces valid output without relying on a distribution test', () => {
  const rand32 = () => webcrypto.getRandomValues(new Uint32Array(1))[0];
  const result = buildPassword(['alpha', 'bravo', 'charlie'], { ...basic, cap: true, digit: true, sym: true }, rand32);
  assert.equal(result.password, assemble(result.words, { sep: '.', capIndex: result.capIndex, digit: result.digit, digitPos: result.digitPos, sym: result.sym, symPos: result.symPos }));
});
