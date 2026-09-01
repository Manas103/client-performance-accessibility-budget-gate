// Pure comparator: given a list of { route, gzipBytes } entries and a budget in KB,
// returns the routes that exceed it, each with the exact numbers, so a failure can name
// "route X used Y KB against a Z KB budget" rather than just "bundle too big".
// No file system, no build tool, no browser: this is the part unit tests can hit directly.

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function checkBundleBudget(routeSizes, budgetKb) {
  const budgetBytes = budgetKb * 1024;
  const violations = [];
  for (const entry of routeSizes) {
    if (entry.gzipBytes > budgetBytes) {
      const gzipKb = round2(entry.gzipBytes / 1024);
      violations.push({
        route: entry.route,
        gzipKb,
        budgetKb,
        overByKb: round2(gzipKb - budgetKb),
      });
    }
  }
  return violations;
}
