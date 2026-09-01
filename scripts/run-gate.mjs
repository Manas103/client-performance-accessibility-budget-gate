#!/usr/bin/env node
// Runs the 4-check gate against the already-built fixture-app/dist (run `npm run build`
// first, optionally with VARIANT_ID=<id> to select which variants.json entry to build).
// Usage: node scripts/run-gate.mjs
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from '../gate/report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_APP = path.join(REPO_ROOT, 'fixture-app');
const DIST = path.join(FIXTURE_APP, 'dist');
const CONFIG = JSON.parse(readFileSync(path.join(REPO_ROOT, 'gate.config.json'), 'utf8'));

async function main() {
  if (!existsSync(path.join(DIST, '.vite', 'manifest.json'))) {
    console.error(
      `No build found at ${DIST}. Run \`npm run build\` first (optionally VARIANT_ID=<id>, see variants.json).`,
    );
    process.exit(1);
  }

  const report = await runGate({ fixtureAppRoot: FIXTURE_APP, distDir: DIST, config: CONFIG });

  for (const [name, result] of Object.entries(report.checks)) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${name}`);
    for (const msg of result.failureMessages ?? []) console.log(`      ${msg}`);
  }

  if (report.pass) {
    console.log('\nGate passed.');
    process.exit(0);
  }
  console.log('\nGate FAILED.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
