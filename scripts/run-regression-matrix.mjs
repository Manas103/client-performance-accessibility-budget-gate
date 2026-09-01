#!/usr/bin/env node
// Builds all 70 variants.json entries (30 seeded regressions + 40 clean builds), one at a
// time, and runs the real 4-check gate against each real build output. Writes
// docs/regression_matrix.csv (variant_id, category, expected_result, gate_result,
// failing_budget_named, match) and prints the two tallies that matter: how many of the 30
// seeded regressions were correctly blocked with the right check named (claim 4), and how
// many of the 40 clean builds were incorrectly blocked (claim 5, should be 0).
//
// Builds run sequentially, one at a time (not in parallel), per this project's shared-machine
// resource-courtesy rule: only one Vite build and one Chromium instance alive at once.
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from '../gate/report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_APP = path.join(REPO_ROOT, 'fixture-app');
const DIST = path.join(FIXTURE_APP, 'dist');
const CONFIG_PATH = path.join(REPO_ROOT, 'gate.config.json');
const VARIANTS_PATH = path.join(REPO_ROOT, 'variants.json');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const { variants } = JSON.parse(readFileSync(VARIANTS_PATH, 'utf8'));

function csvField(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function buildVariant(variantId) {
  process.env.VARIANT_ID = variantId;
  await build({
    root: FIXTURE_APP,
    configFile: path.join(FIXTURE_APP, 'vite.config.ts'),
    logLevel: 'silent',
  });
}

async function main() {
  mkdirSync(DOCS_DIR, { recursive: true });
  const rows = [];
  let i = 0;
  for (const variant of variants) {
    i += 1;
    process.stderr.write(`[${i}/${variants.length}] ${variant.id} (${variant.category})...\n`);
    await buildVariant(variant.id);
    const report = await runGate({ fixtureAppRoot: FIXTURE_APP, distDir: DIST, config });
    const gateResult = report.pass ? 'pass' : 'fail';
    const failingChecks = Object.entries(report.checks)
      .filter(([, c]) => !c.pass)
      .map(([name]) => name);

    let match;
    if (variant.category === 'clean') {
      // A clean variant matches iff the gate did not fail it at all.
      match = gateResult === 'pass';
    } else {
      // A seeded regression matches iff the gate failed it AND named the exact check its
      // designer intended to break (not just any failure; the right one).
      match = gateResult === 'fail' && failingChecks.includes(variant.expected_failing_check);
    }

    rows.push({
      variant_id: variant.id,
      category: variant.category,
      expected_result: variant.expected_result,
      expected_failing_check: variant.expected_failing_check ?? null,
      gate_result: gateResult,
      failing_budget_named: failingChecks.length ? failingChecks.join('|') : 'none',
      match,
    });
  }

  const header = 'variant_id,category,expected_result,gate_result,failing_budget_named,match';
  const csv = [header, ...rows.map((r) =>
    [r.variant_id, r.category, r.expected_result, r.gate_result, r.failing_budget_named, r.match]
      .map(csvField)
      .join(','),
  )].join('\n');
  writeFileSync(path.join(DOCS_DIR, 'regression_matrix.csv'), csv + '\n');

  const seeded = rows.filter((r) => r.category !== 'clean');
  const clean = rows.filter((r) => r.category === 'clean');
  const seededBlocked = seeded.filter((r) => r.match).length;
  const falseBlocks = clean.filter((r) => !r.match).length;

  const summaryLines = [
    `Seeded regressions blocked with the correct budget named: ${seededBlocked}/${seeded.length}`,
    `False blocks across clean builds: ${falseBlocks}/${clean.length}`,
    '',
    'Seeded regressions not correctly blocked:',
    ...seeded.filter((r) => !r.match).map((r) => `  ${r.variant_id}: expected ${r.expected_failing_check}, gate said ${r.gate_result} (${r.failing_budget_named})`),
    'Clean builds falsely blocked:',
    ...clean.filter((r) => !r.match).map((r) => `  ${r.variant_id}: gate said ${r.gate_result} (${r.failing_budget_named})`),
  ];
  const summary = summaryLines.join('\n');
  console.log('\n' + summary);
  writeFileSync(path.join(DOCS_DIR, 'regression_matrix_summary.txt'), summary + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
