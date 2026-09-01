// Deterministic content generators shared by the bundle-bloat fixture modules. Every
// bundle-* regression is a real, measured increase in shipped bytes (nothing here is read
// lazily or tree-shaken away when selected); this file only supplies realistic-looking
// filler content so each module's byte size is predictable and reproducible across builds.

// mulberry32: small deterministic PRNG so the same variant always generates byte-identical
// content (a real build should be reproducible; a random Math.random() seed would not be).
export function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// A base64-alphabet string of exactly `length` characters. Genuinely high entropy (6 bits
// per symbol), so gzip cannot collapse it much: this is what an accidentally-inlined
// binary asset (image, font) looks like once base64-encoded into a JS string literal.
export function randomBase64String(seed: number, length: number): string {
  const rand = mulberry32(seed);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE64_ALPHABET[Math.floor(rand() * BASE64_ALPHABET.length)];
  }
  return out;
}

const SYLLABLES = [
  'ka', 'ri', 'mo', 'ta', 'lu', 'ven', 'dor', 'sil', 'bren', 'quo',
  'zan', 'thi', 'plo', 'mar', 'ist', 'oro', 'fen', 'gul', 'wex', 'yon',
];

function randomWord(rand: () => number): string {
  const len = 2 + Math.floor(rand() * 3);
  let w = '';
  for (let i = 0; i < len; i++) w += SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
  return w;
}

// A pseudo-English sentence of `wordCount` generated words. Used where the fixture module
// is standing in for real (mistakenly bundled) text content, e.g. bios or help copy, rather
// than binary data, so the "why is this route so big" story reads true in a bundle analyzer.
export function randomSentence(seed: number, wordCount: number): string {
  const rand = mulberry32(seed);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(randomWord(rand));
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

export function randomWordList(seed: number, count: number): string[] {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(randomWord(rand));
  return out;
}
