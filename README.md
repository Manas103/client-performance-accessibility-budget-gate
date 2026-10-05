# Client Performance and Accessibility Budget Gate

A CI gate for a small React and TypeScript app that fails a build when a route crosses its JavaScript bundle budget, when a 10,000-item image feed renders as a virtualized masonry grid without actually virtualizing, or when a component loses keyboard focus or WCAG AA contrast. Stack: TypeScript, React, Playwright, GitHub Actions. Every number below was measured on this machine, not targeted; every headline number, old and new, was reached by fixing a real bug this build uncovered, not by tuning the gate to a result.

## Why this exists

Almost no intern portfolio carries a measured accessibility artifact at all, and bundle-weight and virtualization regressions are usually caught by a human noticing the app feels slower, well after the change has shipped. This repository started as the gate for a small friends-list panel and was extended to gate a consumer image feed instead: a 10,000-item masonry grid, the kind of surface a Pinterest-style product actually ships, with the same four budgets (bundle weight, virtualization, keyboard focus, WCAG AA contrast) now exercised against it directly rather than against a simpler row list.

## Honest framing

- **The fixture app is a minimal stand-in, not a real product.** `fixture-app/` is a small two-route React app built to exercise all four checks: `/friends` (route slug kept from the original build; it now renders the image feed, not a friends list) and `/party`. It is deliberately light on dependencies so building it around 70 times (once per regression-matrix variant) stays fast.
- **Every photo in the feed is a synthetic CSS gradient, not a real or downloaded image.** `FeedTile.tsx`'s `placeholderGradient` derives a deterministic hue from each item's id; no network request and no real or stock photo exists anywhere in this repository.
- **The masonry grid is a fixed 7-column, non-responsive layout, not a real breakpoint-aware feed.** `masonryLayout.ts` hardcodes `MASONRY_COLUMNS = 7` and a 160px tile width regardless of viewport width, the same deliberate-simplification spirit as the original friends list's fixed `ROW_HEIGHT`/`CONTAINER_HEIGHT` constants.
- **Every budget number is a real, justified choice, not a default.** The bundle budget (30 KB gzip per route entry chunk) is roughly 15 to 26x the clean baseline's own route chunks (3.02 KB and 1.47 KB gzip, grown slightly from the original 2.44/1.46 KB after the masonry extension); the virtualization threshold (400 tiles against a 10,000-tile worst case) is set well above the roughly 142-147 tiles a correctly windowed feed actually mounts at a steady-state scroll position, and far below 10,000. Both are explained with the exact arithmetic in `gate.config.json`.
- **This repository is written by an AI coding assistant, gated behind the same tests and review as hand-written code.** Every change here passes `npm test` (22 unit tests) and the 70-variant regression matrix (`npm run matrix`) before being considered done, the same gate as every other repository in this portfolio, human-written or not.
- **Machine and toolchain.** Windows 11, Node v22.17.1, npm 10.9.2, React 18.3.1, TypeScript 5.6.3, Vite 5.4.11, Vitest 2.1.5, Playwright 1.49.0 (bundled Chromium, headless), `@axe-core/playwright` 4.10.1.

## Architecture

```
fixture-app/
  src/
    routes/FriendsRoute.tsx    The image feed route (slug /friends kept for compatibility
                                with the variant schema's route field): search, the
                                masonry feed, a profile modal, a real link rendered
                                against the panel background (the contrast check's
                                target; see Findings)
    routes/PartyRoute.tsx      The /party route: an RSVP dropdown, a details modal
    components/FriendsList.tsx The masonry grid and its virtualization: lays out every
                                item via masonryLayout.ts, then mounts only the tiles
                                visibleTileIndices() says overlap the viewport plus
                                overscan. Every virtualizationMode bug branch from the
                                original row-list version survives, reimplemented against
                                the grid (no-windowing, threshold-too-high, disabled-flag,
                                overscan-explosion, nan-fallback-full-render,
                                filter-bug-full-render, duplicate-render-print-view,
                                eager-load-more-all)
    components/masonryLayout.ts Pure layout and virtualization math: computeMasonryLayout
                                (shortest-column-first packing), visibleTileIndices
                                (binary search per column), unit tested directly
                                (masonryLayout.test.ts)
    components/FeedTile.tsx    One image tile: a synthetic gradient "photo" plus a
                                footer bar (favorite checkbox, name, message button).
                                Renamed from FriendRow.tsx when the surface changed from a
                                text row to an image card
    components/Dropdown.tsx, Modal.tsx, SearchBox.tsx, Checkbox.tsx, NavBar.tsx
    variantConfig.ts           Typed wrapper around the compile-time defines vite.config.ts
                                injects per variant (friend count, theme, which bug, if any)
    theme.ts                   4 base themes, each hand-picked comfortably AA-compliant, and
                                the 7 single-token-pair overrides that seed the contrast bugs
    bloat/gen.ts, data/friends.ts
  vite.config.ts                Resolves variants.json by VARIANT_ID at config time, injects
                                 the per-variant defines, and (for a bundle-bloat variant)
                                 swaps a virtual module's content so exactly one route's real
                                 shipped bytes grow; manifest:true so the gate can find each
                                 route's own chunk precisely
gate/
  checkBundle.mjs, bundleBudget.mjs      Gzip each route's manifest-mapped chunk for real,
                                          compare against the KB budget
  checkVirtualization.mjs, thresholds.mjs Load the image feed with exactly 10,000 entries
                                          (?count=10000), scroll its own scroll container
                                          to the midpoint (steady-state, not the top edge),
                                          count [data-feed-item] DOM nodes
  checkFocus.mjs                          Real Tab-key sweep plus 5 scripted interactions
                                          (modal, dropdown, message button, search clear, nav)
  checkContrast.mjs                       @axe-core/playwright, wcag2aa, color-contrast rule
  routeReady.mjs                          Shared navigation helper; documents two real
                                          Chromium/SPA-navigation timing findings (see Findings)
  previewServer.mjs                       In-process Vite preview server, port 0, closed by
                                          the same call that opened it
  report.mjs                              Runs bundle then launches one shared Chromium for
                                          the 3 browser checks, aggregates pass/fail
scripts/
  run-gate.mjs                 Gate a single already-built dist/
  run-regression-matrix.mjs    Build and gate all 70 variants.json entries, write
                                docs/regression_matrix.csv
  gen-variants.mjs             Deterministically regenerates variants.json (30 seeded
                                regressions across 4 categories, 40 clean variants)
  bloatContent.mjs             The actual oversized payload generators for each bundle-bloat
                                regression (base64 font, inline avatars, a duplicate dataset,
                                an icon barrel, a locale table, a generated palette, dev tools)
variants.json                  The 70-entry matrix, committed (deterministic, human-readable)
gate.config.json                Every threshold, with the arithmetic that justifies it
.github/workflows/gate.yml      Runs the unit tests and the gate against a clean build in CI
```

### Why the image feed uses a pixel-based overscan instead of a row count

The original row list used a 10-row overscan because a text row is nearly free to mount.
An image tile is not: `FriendsList.tsx`'s `OVERSCAN_PX` (1,050px, roughly 1.6
viewport-heights each side) trades a larger pixel-based preload buffer for keeping tiles
decoded before they scroll into view, the same reason a real image feed's windowing
tends to run a bigger buffer than a text list's. This is also why the correctly-windowed
mounted-tile count (roughly 142-147) is higher relative to the feed's 10,000-tile total
than the original row list's roughly 34-row window was relative to its 1,000-row total:
both are genuinely virtualized (over 98% fewer DOM nodes than the unwindowed case either
way), just tuned for a different cost model.

### Why a variant matrix over one flag, not 70 source trees

Every variant is the same `fixture-app` source, built 70 times with a different `VARIANT_ID` environment variable read once, at Vite config-resolution time, by `vite.config.ts`. A bundle-bloat regression is decided at that same config-resolution point, not by a runtime `if` a minifier is trusted to dead-code-eliminate: the resolver picks one real payload for one real route for a given build, so Rollup only ever sees the bytes that build is supposed to ship. This keeps 70 builds fast (one small app, no 70-way source duplication to maintain) while keeping every regression a genuine, statically-shipped difference in the built output, not a simulated one.

### Why the checks share one browser instance

`gate/report.mjs` launches exactly one Chromium instance per gate run and reuses it across the virtualization, focus and contrast checks (each opens its own page or context). A full gate run across 70 variants launches Chromium 70 times, not 210; this matters on a shared machine, where the project's own resource-courtesy rule caps how many heavy processes run concurrently. Only the bundle check needs no browser at all: it reads `dist/.vite/manifest.json` and gzips the file directly.

## Validation

`npm test` (Vitest, no browser): 22 tests passed, covering the pure comparators (`checkBundleBudget`, `checkVirtualizationThreshold`, `checkFocusNeverLost`) and the masonry layout math (`computeMasonryLayout`, `visibleTileIndices`, balanced-column and never-returns-a-non-overlapping-tile properties) directly, no browser needed for either. Raw output: `docs/test_output.txt`.

`npm run matrix` (`scripts/run-regression-matrix.mjs`): builds and gates all 70 `variants.json` entries, one at a time. Raw per-variant results: `docs/regression_matrix.csv`; run log: `docs/regression_matrix_run_log.txt`; tallies: `docs/regression_matrix_summary.txt`.

Two example single-variant gate runs are also committed directly: `docs/gate_sample_clean_output.txt` (the clean baseline, all 4 checks pass) and `docs/gate_sample_blocked_output.txt` (`virt-01-no-windowing`, the virtualization check fails and names the exact budget it crossed, now against the 10,000-item feed). `docs/virtualization_measurement.txt` has the exact scroll-and-count sequence for the mounted-tile number.

## Findings

**Scaling the virtualization target from 1,000 rows to 10,000 tiles accidentally scaled the focus check's generic tab sweep by the same factor, and it was slow enough to matter.** The first version of the masonry extension set every virtualization-regression variant's `friendCount` to 10,000, matching the new feed size. But `checkVirtualization.mjs` already always overrides the request with its own hardcoded `?count=10000` regardless of that field; `friendCount` only ever affected the app's own default render on `/friends`, which `checkFocus.mjs`'s generic tab sweep also exercises for every variant. Every one of the 8 virtualization-regression variants is a "renders everything unwindowed" bug by design, so each one mounted close to the full feed and the tab sweep pressed Tab roughly 20,000 times (two focusable elements per tile) per variant: a single worst-case variant that used to take about 4 seconds took minutes, and the full 70-variant matrix run was killed twice after hitting a 30-minute background time limit before this was found and fixed. The fix removed the unnecessary `friendCount: 10000` override (`scripts/gen-variants.mjs`): the virtualization check never read that field to begin with, so the fix cost nothing in correctness and took the worst-case variant back to about 4 seconds. The full matrix (`docs/regression_matrix_run_log.txt`) now completes in well under the time it used to take for one bad variant.

**A same-document SPA navigation left Chromium's Tab order in a state that produced two false FAILs on the clean baseline, and both are documented in `gate/routeReady.mjs`.** The first: switching routes with `page.goto()` on a hash-only URL is a same-document navigation, not a real page load, and `PartyRoute` is a `React.lazy()` chunk fetched asynchronously; the original `networkidle` wait resolved before the chunk request had even started, so a check sometimes tabbed through the previous route's still-mounted DOM. The fix was to wait for a route-specific marker element instead of a network heuristic. The second, found while building this gate: `NavBar` keeps a stable React key across a route change (it does not remount), so its two buttons stay the same DOM nodes while the rest of the previous route unmounts under them; when the element that had focus is removed mid-navigation, Chromium does not reliably restart sequential Tab navigation from the top of the document, and the generic tab sweep on `/party` skipped straight to the dropdown trigger and landed on `document.body` one step later, a full 2 elements before the real end of the page. That produced a `FAIL focus` on a page with no actual focus bug: a direct, isolated Chromium session tabbing through `/party` from a true fresh load reached all 4 elements correctly, which is what proved the bug was in the check's navigation method, not the app. The fix, `gotoRoute(..., { hardReload: true })`, forces an actual page reload before the checks that specifically mean to test "tabbing through a route from a fresh load," while the modal, dropdown, message-button and search-clear checks keep using the ordinary SPA navigation they are meant to test.

**A theme token was defined, overridden by a seeded regression, and never actually rendered, so the regression it was supposed to seed had no visible effect.** `theme.ts` defines `linkColor` and a `link-on-tinted-panel` contrast-bug override that drops it to roughly 2.0:1, but no component in the original build read `theme.linkColor` anywhere; the regression changed a value nothing displayed, so `axe-core` correctly found nothing wrong and `contrast-03-link-on-tinted-panel` measured as a false negative in the first full matrix run (29/30 seeded regressions blocked). The fix is a real, rendered link, "See friend suggestions" on `/friends`, styled with `theme.linkColor` against `theme.panelBg`; after the fix the same variant fails contrast with the actual measured ratio (1.97:1) in the failure message, and the matrix reached 30/30 on the next run.

## Measured results

Machine: Windows 11, Node v22.17.1, npm 10.9.2, Playwright 1.49.0 (bundled Chromium, headless).

| Claim | Measured |
|---|---|
| 10,000-item image feed as a virtualized masonry grid | Verified: 7-column masonry layout, 10,000 items, windowed rendering (`fixture-app/src/components/FriendsList.tsx`, `masonryLayout.ts`) |
| Roughly 140 mounted nodes while scrolling | **142-147 tiles**, measured at the feed's scroll midpoint across repeated runs (`docs/virtualization_measurement.txt`) |
| Fails the build when a route crosses its JavaScript bundle budget | Verified: all 8 bundle-category seeded regressions correctly blocked, `bundle` named; range 45.25 KB to 185.15 KB gzip against a 30 KB budget (`docs/bundle_regression_sizes.txt`) |
| Fails the build when the 10,000-item feed renders unvirtualized | Verified: all 8 virtualization-category seeded regressions correctly blocked, `virtualization` named; unwindowed variants render 10,000 DOM tiles against a 400-tile threshold (`docs/gate_sample_blocked_output.txt`) |
| Fails the build when a component loses keyboard focus or WCAG AA contrast | Verified: all 7 focus-category and all 7 contrast-category seeded regressions correctly blocked, `focus` or `contrast` named respectively |
| **30 of 30 seeded regressions blocked with the failing budget named** | **30/30**; full detail in `docs/regression_matrix.csv` |
| **0 false blocks across 40 clean builds** | **0/40**, across 2 routes x 5 friend-count buckets x 4 themes |

## Building and running

```
npm install
npx playwright install chromium   # once, if the bundled Chromium build is not already cached

npm test                           # 22 unit tests, no browser
VARIANT_ID=clean-01 npm run build  # build one variant (see variants.json for every id)
npm run gate                       # gate the build in fixture-app/dist
npm run matrix                     # build and gate all 70 variants, writes docs/regression_matrix.csv

npm run gen-variants                # regenerate variants.json deterministically, if ever needed
```

CI (`.github/workflows/gate.yml`) runs the unit tests, builds the clean baseline, and runs the gate against it on every push and pull request.

## Sibling comparison

[`ops-console-regression-gate`](https://github.com/Manas103/ops-console-regression-gate) is the closest sibling in the portfolio: a Selenium and REST Assured CI quality gate with seeded regressions measured in both directions. It gates API contract correctness and user-journey correctness; this repository gates a different, frontend-specific set of budgets, bundle weight, list virtualization, keyboard focus and WCAG AA contrast, none of which a journey-level Selenium suite is built to measure. Headline numbers side by side: `ops-console-regression-gate`'s regression matrix and this repository's both report both directions of a seeded-regression harness; this repository's are 30/30 blocked and 0/40 false blocks, over a 4-category matrix rather than a journey matrix.

## Limitations

- The fixture app's 4 clean themes and 5 friend-count buckets are the false-positive surface actually tested; a real product's much larger surface (every real component, every real theme, every real dataset) is not exhaustively covered by 40 clean builds, only sampled from it.
- The masonry grid is a fixed 7 columns at a fixed 160px tile width, never responsive to viewport size; a real image feed's column count and tile width would adapt to the device, which would change the exact mounted-tile count without changing the underlying virtualization technique.
- The virtualization check measures mounted tiles at one scroll position (the midpoint); a continuous scroll (every frame, top to bottom) is not swept, so a windowing bug that only manifests near the very top or bottom edge of the feed would not necessarily be caught.
- The focus check's generic Tab sweep and its 5 scripted interactions cover the interaction patterns this fixture app actually has (a modal, a dropdown, a message button, search clear, nav); a production feed with more interaction patterns would need the same generic-tab-sweep-plus-scripted-interactions approach extended to each new pattern, not a change to the underlying technique.
- The bundle check gzips the built JS with Node's `zlib` at level 9, matching a typical HTTP server's `Content-Encoding: gzip`; a server configured for Brotli or a different gzip level would ship a slightly different byte count than what this check measures.
- No real player, friend, party, or photo data exists anywhere in this repository; every name, RSVP, and image is synthetic.
