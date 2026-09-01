// Node-side (build-time) generators for the 7 self-authored bundle-bloat fixtures. Each
// function returns the actual payload (a string or an array), computed once, deterministic
// given its seed. fixture-app/vite.config.ts's bloatModulePlugin JSON.stringifies whichever
// one a variant selects directly into that variant's generated virtual module source, so the
// real bytes land in the built JS the same way an accidentally-committed literal would; this
// file itself (the generator code) stays out of the shipped bundle entirely.
//
// This is deliberately separate from fixture-app/src/bloat/gen.ts (which fixture-app/src/
// data/friends.ts uses at runtime, in the browser, to generate the friends list itself) even
// though the algorithm is the same: this file runs in Node at build time and its output
// becomes literal bundled bytes; gen.ts runs in the browser at page-load time and its output
// never appears in the built JS as static text.

function mulberry32(seed) {
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

function randomBase64String(seed, length) {
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

function randomWord(rand) {
  const len = 2 + Math.floor(rand() * 3);
  let w = '';
  for (let i = 0; i < len; i++) w += SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
  return w;
}

function randomSentence(seed, wordCount) {
  const rand = mulberry32(seed);
  const words = [];
  for (let i = 0; i < wordCount; i++) words.push(randomWord(rand));
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

// bundle-01: a custom display font embedded as a base64 string constant and injected via a
// <style> tag, instead of a woff2 file referenced with @font-face and loaded (and cached)
// separately from the JS bundle.
export function generateEmbeddedFont() {
  return randomBase64String(2024, 230_000);
}

// bundle-02: avatar images inlined as base64 data URIs directly in a JS module instead of
// files under /public referenced by URL.
export function generateInlineAvatars() {
  const count = 40;
  const charsPerAvatar = 6000;
  return Array.from({ length: count }, (_, i) => `data:image/png;base64,${randomBase64String(1000 + i, charsPerAvatar)}`);
}

// bundle-03: the client accidentally imports the same large synthetic seed dataset used to
// populate a demo/staging backend, instead of fetching a small page of real data at runtime.
export function generateDuplicateSeedDataset() {
  const count = 2600;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Seed Friend ${i}`,
    bio: randomSentence(3000 + i, 10),
  }));
}

// bundle-05: `import * as Icons from './iconBarrel'` pulls in an entire icon set's SVG path
// data even though the route only renders two icons.
export function generateIconBarrel() {
  const iconCount = 900;
  const out = {};
  for (let i = 0; i < iconCount; i++) {
    const rand = mulberry32(5000 + i);
    const commands = ['M0 0'];
    for (let s = 0; s < 30; s++) {
      commands.push(`L${Math.round(rand() * 100)} ${Math.round(rand() * 100)}`);
    }
    out[`icon-${i}`] = commands.join(' ') + ' Z';
  }
  return out;
}

// bundle-06: a "friend's local time" feature imports a full IANA-scale timezone/locale data
// table for client-side offset math, instead of relying on the browser's built-in Intl APIs.
export function generateLocaleTable() {
  const count = 2600;
  return Array.from({ length: count }, (_, i) => ({
    id: `zone-${i}`,
    label: randomSentence(7000 + i, 4),
    offsetMinutes: ((i * 17) % 27) * 60 - 720,
    dst: i % 3 === 0,
  }));
}

// bundle-07: a full color-shade palette (every hue at every lightness step) generated and
// exported at module scope instead of computed on demand for the handful of shades a route
// actually renders.
function hslToHex(h, s, l) {
  const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateGeneratedPalette() {
  const hueSteps = 144;
  const lightnessSteps = 60;
  const out = [];
  for (let h = 0; h < hueSteps; h++) {
    for (let l = 0; l < lightnessSteps; l++) {
      const hue = h * 5;
      const lightness = 2 + l * 2.4;
      out.push({ hue, lightness, hex: hslToHex(hue, 65, lightness) });
    }
  }
  return out;
}

// bundle-08: a diagnostic/devtools recorder module, meant to be dev-only, imported
// unconditionally (no `if (import.meta.env.DEV)` guard) so it and its help-text bank ship in
// the production bundle too.
export function generateDebugDevtools() {
  const count = 900;
  return Array.from({ length: count }, (_, i) => ({
    code: `DIAG-${1000 + i}`,
    help: randomSentence(9000 + i, 16),
  }));
}
