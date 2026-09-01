// Virtualization check: loads /friends with exactly 1,000 entries (?count=1000, overriding
// whatever a variant's own default display count is) and counts DOM nodes matching the
// stable [data-friend-row] marker. A correct windowed implementation renders roughly one
// window's worth (see gate.config.json's virtualizationNote for the exact math); an
// unwindowed one renders all 1,000. Real page, real DOM query, no simulation.
import { checkVirtualizationThreshold } from './thresholds.mjs';

export async function checkVirtualization(browser, baseUrl, config) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/#/friends?count=1000`);
    await page.waitForSelector(config.virtualizationRowMarker, { timeout: 10_000 });
    // Give windowed implementations a moment to settle after mount/scroll-position effects.
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
            `virtualization budget exceeded on /friends with 1,000 entries: ${renderedRowCount} DOM rows rendered against a ${config.virtualizationRowThreshold}-row threshold`,
          ]
        : [],
    };
  } finally {
    await page.close();
  }
}
