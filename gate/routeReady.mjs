// Shared navigation helper for the Playwright-based checks.
//
// Finding: the first version of checkFocus.mjs used `page.goto(url-with-new-hash)` followed
// by `page.waitForLoadState('networkidle')` to switch between /friends and /party inside one
// check. That produced a false FAIL on the clean baseline: a hash-only URL change is a
// same-document SPA navigation, not a real page load, and the new route's component is a
// React.lazy() chunk fetched asynchronously. 'networkidle' resolved (nothing was in flight
// yet) before the chunk request even started, so the check sometimes counted and tabbed
// through the PREVIOUS route's still-mounted DOM. The fix is to wait for a route-specific
// marker element instead of a network-idle heuristic.
const ROUTE_READY_SELECTOR = {
  friends: '[data-focus-trigger="search-input"]',
  party: '[data-focus-trigger="dropdown-trigger"]',
};

// Finding 2: the generic tab sweep in checkFocus.mjs uses this same helper to move between
// routes, and it produced a second, different false FAIL on the clean baseline: NavBar keeps
// a stable React key across a route change (it does not remount), so its two buttons stay the
// SAME DOM nodes across a /friends -> /party hash navigation while the rest of the previous
// route unmounts under them. When the element that had focus (a /friends control) is removed
// mid-navigation, Chromium does not always restart sequential Tab navigation from the top of
// the document; it can resume from wherever its internal focus bookkeeping was left, which
// skipped straight to the dropdown trigger and landed on document.body one step later, well
// before the whole page had actually been tabbed through. That is a real Chromium timing
// quirk triggered by a same-document SPA navigation, not a bug in the fixture app: a genuine
// full page load of /party tabs through all 4 elements correctly (verified directly). The fix
// is `hardReload`: for any check that means to test "tabbing through a route from a true fresh
// load" (the generic sweep), force an actual reload after navigating, rather than trusting the
// SPA's in-place route swap to leave Tab order in a document-start state.
export async function gotoRoute(page, baseUrl, route, query = '', { hardReload = false } = {}) {
  const marker = ROUTE_READY_SELECTOR[route];
  if (!marker) throw new Error(`Unknown route: ${route}`);
  await page.goto(`${baseUrl}/#/${route}${query}`);
  if (hardReload) {
    await page.reload();
  }
  await page.waitForSelector(marker, { timeout: 10_000 });
}
