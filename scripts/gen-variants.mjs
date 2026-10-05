#!/usr/bin/env node
// Generates variants.json: 30 seeded regressions (8 bundle, 8 virtualization, 7 focus,
// 7 contrast) plus 40 clean variants (2 routes x 5 friend-count buckets x 4 themes).
// Committed output; re-run with `node scripts/gen-variants.mjs` to regenerate deterministically.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'variants.json');

const base = (overrides) => ({
  route: 'friends',
  friendCount: 30,
  theme: 'light',
  bundleBloat: 'none',
  virtualizationMode: 'ok',
  focusBug: 'none',
  contrastBug: 'none',
  ...overrides,
});

const bundleRegressions = [
  ['embedded-font', 'friends', 'A base64-encoded custom display font embedded as a JS string instead of a woff2 file'],
  ['inline-avatars', 'friends', 'Avatar images inlined as base64 data URIs in JS instead of static files under /public'],
  ['duplicate-seed-dataset', 'friends', 'The full synthetic seed dataset accidentally imported into the client bundle'],
  ['moment-full', 'friends', 'Full moment.js with 4 extra locales imported for a single date format call'],
  ['icon-barrel', 'party', 'A barrel import pulls in an entire icon set for 2 icons actually used'],
  ['locale-table', 'party', 'A hand-rolled IANA-scale timezone table shipped instead of using Intl'],
  ['generated-palette', 'party', 'Every color-shade combination pre-generated at module scope instead of on demand'],
  ['debug-devtools', 'party', 'A dev-only diagnostics recorder module bundled without an environment guard'],
].map(([id, route, desc], i) => ({
  id: `bundle-${String(i + 1).padStart(2, '0')}-${id}`,
  category: 'bundle',
  name: desc,
  expected_result: 'fail',
  expected_failing_check: 'bundle',
  ...base({ route, bundleBloat: id }),
}));

const virtRegressions = [
  ['no-windowing', 'The masonry image feed renders all 10,000 tiles directly with no windowing at all'],
  ['threshold-too-high', 'The enable-windowing threshold was left at 50,000, so 10,000 tiles still render unwindowed'],
  ['disabled-flag', 'A debug-only feature flag forcing windowing off was left enabled in the production build'],
  ['overscan-explosion', 'Windowing overscan is set to the full feed height, defeating windowing in practice'],
  ['nan-fallback-full-render', 'A zero-height container read falls back to rendering the entire feed instead of a sane default'],
  ['filter-bug-full-render', 'An empty search term bypasses windowing entirely and renders the raw full array'],
  ['duplicate-render-print-view', 'A misapplied print-only class renders every tile a second time, visibly, alongside the windowed grid'],
  ['eager-load-more-all', 'An infinite-scroll loader is missing its page-size cap and loads all 10,000 tiles on mount'],
].map(([id, desc], i) => ({
  id: `virt-${String(i + 1).padStart(2, '0')}-${id}`,
  category: 'virtualization',
  name: desc,
  expected_result: 'fail',
  expected_failing_check: 'virtualization',
  // friendCount stays at base()'s small default here on purpose: checkVirtualization.mjs
  // always overrides with its own ?count=10000 regardless of this field (see its comment),
  // so this field only ever affects the app's own default render that checkFocus and
  // checkContrast exercise on /friends for every variant. Setting it to 10,000 here would
  // make every one of those checks mount and keyboard-tab through roughly 20,000 focusable
  // elements per virtualization-regression variant, 8 variants' worth, for zero gain: the
  // actual virtualization measurement never reads this field.
  ...base({ route: 'friends', virtualizationMode: id }),
}));

const focusRegressions = [
  ['modal-no-restore', 'friends', 'Closing the profile modal does not restore focus to the button that opened it'],
  ['checkbox-blurs-on-focus', 'friends', 'A custom favorite-checkbox blurs itself the instant it receives keyboard focus'],
  ['explicit-blur-after-action', 'friends', 'The message button blurs itself immediately after its click handler runs'],
  ['modal-trap-tabindex-removed', 'party', 'A broken focus trap strips tabindex from every element inside the open modal'],
  ['nav-link-remount-loses-focus', 'friends', 'The nav bar remounts on every navigation, dropping focus from the clicked link'],
  ['dropdown-blurs-on-select', 'party', 'The RSVP dropdown blurs its trigger instead of returning focus after a selection'],
  ['search-clear-remounts-input', 'friends', 'Clearing the search box remounts it without ever restoring focus afterward'],
].map(([id, route, desc], i) => ({
  id: `focus-${String(i + 1).padStart(2, '0')}-${id}`,
  category: 'focus',
  name: desc,
  expected_result: 'fail',
  expected_failing_check: 'focus',
  ...base({ route, focusBug: id }),
}));

const contrastRegressions = [
  ['light-gray-body-text', 'light', 'friends', 'Body text set to a light gray that fails AA against a white background'],
  ['primary-button-low-contrast', 'light', 'friends', 'Primary button text set to white on a too-light blue background'],
  ['link-on-tinted-panel', 'light', 'friends', 'A link color that fails AA against a light-blue tinted panel background'],
  ['status-badge-low-contrast', 'light', 'party', 'The RSVP status badge text fails AA against its own badge background'],
  ['filter-chip-active-low-contrast', 'light', 'party', 'The active filter chip text fails AA against its chip background'],
  ['dark-theme-error-text', 'dark', 'party', 'Dark-theme error text fails AA against its own dark-red background'],
  ['nav-active-tab-low-contrast', 'brand-blue', 'party', 'The active nav tab text fails AA against the nav background'],
].map(([id, theme, route, desc], i) => ({
  id: `contrast-${String(i + 1).padStart(2, '0')}-${id}`,
  category: 'contrast',
  name: desc,
  expected_result: 'fail',
  expected_failing_check: 'contrast',
  ...base({ route, theme, contrastBug: id }),
}));

const THEMES = ['light', 'dark', 'high-contrast', 'brand-blue'];
const ROUTES = ['friends', 'party'];
const SIZE_BUCKETS = [5, 15, 30, 60, 90];

const clean = [];
let cleanIndex = 0;
for (const route of ROUTES) {
  for (const size of SIZE_BUCKETS) {
    for (const theme of THEMES) {
      cleanIndex += 1;
      clean.push({
        id: `clean-${String(cleanIndex).padStart(2, '0')}`,
        category: 'clean',
        name: `${theme} theme, /${route}, ${size} friends`,
        expected_result: 'pass',
        expected_failing_check: null,
        ...base({ route, friendCount: size, theme }),
      });
    }
  }
}

const variants = [...bundleRegressions, ...virtRegressions, ...focusRegressions, ...contrastRegressions, ...clean];

if (bundleRegressions.length !== 8) throw new Error('expected 8 bundle regressions');
if (virtRegressions.length !== 8) throw new Error('expected 8 virtualization regressions');
if (focusRegressions.length !== 7) throw new Error('expected 7 focus regressions');
if (contrastRegressions.length !== 7) throw new Error('expected 7 contrast regressions');
if (clean.length !== 40) throw new Error('expected 40 clean variants');
if (variants.length !== 70) throw new Error('expected 70 total variants');

writeFileSync(OUT, JSON.stringify({ variants }, null, 2) + '\n');
console.log(`Wrote ${variants.length} variants to ${OUT}`);
