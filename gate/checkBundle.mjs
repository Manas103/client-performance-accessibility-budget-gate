// Bundle-budget check: reads dist/.vite/manifest.json (produced by `build.manifest: true`
// in vite.config.ts) to find each route's own entry chunk precisely, gzips it for real
// (zlib, level 9, matching what an HTTP server serving Content-Encoding: gzip would send),
// and compares against gate.config.json's bundleBudgetKb via the pure comparator in
// bundleBudget.mjs.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { checkBundleBudget } from './bundleBudget.mjs';

const ROUTE_ENTRIES = [
  { route: 'friends', src: 'src/routes/FriendsRoute.tsx' },
  { route: 'party', src: 'src/routes/PartyRoute.tsx' },
];

export function checkBundle(distDir, config) {
  const manifestPath = path.join(distDir, '.vite', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const routeSizes = ROUTE_ENTRIES.map(({ route, src }) => {
    const entry = manifest[src];
    if (!entry) throw new Error(`manifest.json is missing an entry for ${src}`);
    const filePath = path.join(distDir, entry.file);
    const content = readFileSync(filePath);
    const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;
    return { route, file: entry.file, gzipBytes };
  });

  const violations = checkBundleBudget(
    routeSizes.map(({ route, gzipBytes }) => ({ route, gzipBytes })),
    config.bundleBudgetKb,
  );

  return {
    check: 'bundle',
    pass: violations.length === 0,
    routeSizes,
    violations,
    failureMessages: violations.map(
      (v) => `bundle budget exceeded on /${v.route}: ${v.gzipKb} KB gzip against a ${v.budgetKb} KB budget (over by ${v.overByKb} KB)`,
    ),
  };
}
