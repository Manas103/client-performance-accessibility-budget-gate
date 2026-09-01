// Aggregates the 4 checks into one report per variant: pass, or fail with every failing
// budget named. Owns the one browser instance shared by the 3 Playwright-based checks
// (virtualization, focus, contrast) so a full gate run launches Chromium once, not three
// times; checkBundle needs no browser at all (it reads the already-built dist output).
import { chromium } from 'playwright';
import { checkBundle } from './checkBundle.mjs';
import { checkVirtualization } from './checkVirtualization.mjs';
import { checkFocus } from './checkFocus.mjs';
import { checkContrast } from './checkContrast.mjs';
import { startPreviewServer } from './previewServer.mjs';

export async function runGate({ fixtureAppRoot, distDir, config }) {
  const bundleResult = checkBundle(distDir, config);

  const server = await startPreviewServer(fixtureAppRoot, distDir);
  const browser = await chromium.launch();
  let virtualizationResult;
  let focusResult;
  let contrastResult;
  try {
    virtualizationResult = await checkVirtualization(browser, server.baseUrl, config);
    focusResult = await checkFocus(browser, server.baseUrl);
    contrastResult = await checkContrast(browser, server.baseUrl);
  } finally {
    await browser.close();
    await server.close();
  }

  const checks = {
    bundle: bundleResult,
    virtualization: virtualizationResult,
    focus: focusResult,
    contrast: contrastResult,
  };

  const failingChecks = Object.values(checks).filter((c) => !c.pass);
  const pass = failingChecks.length === 0;
  const failingBudgets = failingChecks.flatMap((c) => c.failureMessages);

  return { pass, checks, failingBudgets };
}
