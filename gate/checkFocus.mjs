// Keyboard focus check: real Playwright keyboard events against the real loaded page, no
// simulation of focus outcomes. Two layers, both real interactions:
//
// 1. A generic tab sweep from page load: press Tab exactly once per focusable element found
//    on the page, recording document.activeElement's tag at every step, and asserting it is
//    never BODY. This alone catches a control that blurs itself the moment it receives
//    keyboard focus (checkbox-blurs-on-focus). It presses Tab exactly `focusableCount` times,
//    not once more: pressing Tab past the last real element legitimately lands on
//    document.body in every browser (there is nothing left to focus), which is normal, not a
//    bug. An earlier version of this loop added a "+3 safety buffer" past the real count and
//    produced a false FAIL on the clean baseline by tripping over exactly that; see the
//    README's Findings section for the full story.
// 2. A scripted interaction for every stable [data-focus-trigger="..."] control the page
//    exposes (the same generic script runs for every variant; it only reacts to whichever
//    controls are actually present, keyed by control TYPE, never by variant id or name).
//    This catches bugs that only manifest after a specific action: closing a modal, picking
//    a dropdown option, clearing search, activating a row action, or navigating.
import { checkFocusNeverLost } from './thresholds.mjs';
import { gotoRoute } from './routeReady.mjs';

const FOCUSABLE_SELECTOR = 'a[href], button, input, [tabindex]:not([tabindex="-1"])';

async function activeTag(page) {
  return page.evaluate(() => document.activeElement?.tagName ?? 'NONE');
}

async function focusBySelector(page, selector) {
  const handle = page.locator(selector).first();
  if ((await handle.count()) === 0) return false;
  await handle.evaluate((el) => el.focus());
  return true;
}

async function genericTabSweep(page, routeLabel, failures) {
  const focusableCount = await page.locator(FOCUSABLE_SELECTOR).count();
  const sequence = [];
  for (let i = 0; i < focusableCount; i++) {
    await page.keyboard.press('Tab');
    sequence.push(await activeTag(page));
  }
  const result = checkFocusNeverLost(sequence);
  if (result.lost) {
    failures.push(
      `generic tab sweep on /${routeLabel} lost focus to document.body at step(s) ${result.lostAtSteps.join(', ')} of ${result.stepsChecked}`,
    );
  }
}

async function checkModal(page, routeLabel, failures) {
  const opened = await focusBySelector(page, '[data-focus-trigger="modal-open"]');
  if (!opened) return;
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="modal"]', { timeout: 5000 });
  const afterOpen = await activeTag(page);
  if (afterOpen === 'BODY') {
    failures.push(`opening the modal on /${routeLabel} left focus on document.body (broken focus trap)`);
    return;
  }
  await page.keyboard.press('Enter'); // activates whatever the modal focused on open (its close button)
  await page.waitForSelector('[data-testid="modal"]', { state: 'detached', timeout: 5000 });
  const afterClose = await activeTag(page);
  if (afterClose === 'BODY') {
    failures.push(`closing the modal on /${routeLabel} left focus on document.body instead of restoring it`);
  }
}

async function checkDropdown(page, routeLabel, failures) {
  const found = await focusBySelector(page, '[data-focus-trigger="dropdown-trigger"]');
  if (!found) return;
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const after = await activeTag(page);
  if (after === 'BODY') {
    failures.push(`selecting a dropdown option on /${routeLabel} left focus on document.body`);
  }
}

async function checkMessageButton(page, routeLabel, failures) {
  const found = await focusBySelector(page, '[data-focus-trigger="message-button"]');
  if (!found) return;
  await page.keyboard.press('Enter');
  const after = await activeTag(page);
  if (after === 'BODY') {
    failures.push(`activating the message button on /${routeLabel} left focus on document.body`);
  }
}

async function checkSearchClear(page, routeLabel, failures) {
  const foundInput = await focusBySelector(page, '[data-focus-trigger="search-input"]');
  if (!foundInput) return;
  await page.keyboard.type('abc');
  await focusBySelector(page, '[data-focus-trigger="search-clear"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const after = await activeTag(page);
  if (after === 'BODY') {
    failures.push(`clearing search on /${routeLabel} left focus on document.body`);
  }
}

async function checkNavigation(page, failures) {
  const found = await focusBySelector(page, '[data-focus-trigger="nav-link"][data-route="party"]');
  if (!found) return;
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-focus-trigger="dropdown-trigger"]', { timeout: 5000 });
  const afterToParty = await activeTag(page);
  if (afterToParty === 'BODY') {
    failures.push('navigating from /friends to /party left focus on document.body');
  }
  const foundBack = await focusBySelector(page, '[data-focus-trigger="nav-link"][data-route="friends"]');
  if (!foundBack) return;
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-focus-trigger="search-input"]', { timeout: 5000 });
  const afterToFriends = await activeTag(page);
  if (afterToFriends === 'BODY') {
    failures.push('navigating from /party to /friends left focus on document.body');
  }
}

export async function checkFocus(browser, baseUrl) {
  const page = await browser.newPage();
  const failures = [];
  try {
    for (const route of ['friends', 'party']) {
      // hardReload: true because this sweep means to test "tabbing through a route from a
      // true fresh load"; see routeReady.mjs's Finding 2 for why a plain SPA hash nav is not
      // reliable enough for this specific check.
      await gotoRoute(page, baseUrl, route, '', { hardReload: true });
      await genericTabSweep(page, route, failures);

      await gotoRoute(page, baseUrl, route);
      await checkModal(page, route, failures);

      await gotoRoute(page, baseUrl, route);
      await checkDropdown(page, route, failures);
      await checkMessageButton(page, route, failures);
      await checkSearchClear(page, route, failures);
    }

    await gotoRoute(page, baseUrl, 'friends');
    await checkNavigation(page, failures);
  } finally {
    await page.close();
  }

  return {
    check: 'focus',
    pass: failures.length === 0,
    failureMessages: failures,
  };
}
