// WCAG AA contrast check: axe-core, run for real against the real loaded page via
// @axe-core/playwright, restricted to the wcag2aa ruleset and specifically the
// color-contrast rule (axe's actual computed-contrast engine decides pass/fail; nothing
// here hand-computes a ratio). Runs against both routes since a contrast regression can
// live on either one.
import AxeBuilder from '@axe-core/playwright';
import { gotoRoute } from './routeReady.mjs';

export async function checkContrast(browser, baseUrl) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const failureMessages = [];
  const byRoute = {};
  try {
    for (const route of ['friends', 'party']) {
      await gotoRoute(page, baseUrl, route);
      const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
      const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
      byRoute[route] = contrastViolations.map((v) => ({
        id: v.id,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      }));
      for (const v of contrastViolations) {
        for (const node of v.nodes) {
          failureMessages.push(`WCAG AA contrast violation on /${route}: ${node.target.join(' ')} - ${node.failureSummary?.replace(/\n/g, ' ')}`);
        }
      }
    }
  } finally {
    await context.close();
  }

  return {
    check: 'contrast',
    pass: failureMessages.length === 0,
    byRoute,
    failureMessages,
  };
}
