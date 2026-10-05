// Virtualization check: loads the image feed (route slug kept as /friends, see
// FriendsRoute.tsx) with exactly 10,000 entries (?count=10000, overriding whatever a
// variant's own default display count is), scrolls to a mid-feed position so the
// measurement reflects steady-state scrolling rather than the top-of-feed edge (where
// there is nothing above to overscan into, so fewer tiles mount than at any other scroll
// position), and counts DOM nodes matching the stable [data-feed-item] marker. A correct
// windowed implementation renders roughly one window's worth (see gate.config.json's
// virtualizationNote for the exact math); an unwindowed one renders all 10,000. Real page,
// real scroll, real DOM query, no simulation.
import { checkVirtualizationThreshold } from './thresholds.mjs';

export async function checkVirtualization(browser, baseUrl, config) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/#/friends?count=10000`);
    await page.waitForSelector(config.virtualizationRowMarker, { timeout: 10_000 });
    // Give windowed implementations a moment to settle after mount, then scroll the feed's
    // own scroll container (not the page) to a mid-feed position and let the resulting
    // re-render settle too.
    await page.waitForTimeout(150);
    const scrollContainer = page.locator(config.virtualizationRowMarker).first().locator('xpath=ancestor::div[2]');
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });
    await page.waitForTimeout(150);
    const renderedRowCount = await page.locator(config.virtualizationRowMarker).count();
    const result = checkVirtualizationThreshold(renderedRowCount, config.virtualizationRowThreshold);
    return {
      check: 'virtualization',
      pass: !result.violated,
      renderedRowCount,
      threshold: config.virtualizationRowThreshold,
      failureMessages: result.violated
        ? [
            `virtualization budget exceeded on the image feed with 10,000 entries: ${renderedRowCount} DOM tiles rendered against a ${config.virtualizationRowThreshold}-tile threshold`,
          ]
        : [],
    };
  } finally {
    await page.close();
  }
}
