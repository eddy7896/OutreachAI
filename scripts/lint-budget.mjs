#!/usr/bin/env node
/**
 * Lint ratchet: fails if ESLint reports more errors or warnings than the
 * budget in scripts/lint-budget.json. Lets CI block new lint problems while
 * the existing backlog is paid down. Lower the budget whenever counts drop.
 *
 * Usage: node scripts/lint-budget.mjs [--update]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_FILE = path.join(ROOT, 'scripts/lint-budget.json');
const eslintBin = path.join(ROOT, 'node_modules/.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');

const run = spawnSync(eslintBin, ['.', '-f', 'json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
if (run.error || !run.stdout) {
  console.error('Failed to run ESLint:', run.error?.message || run.stderr);
  process.exit(2);
}

const results = JSON.parse(run.stdout);
const actual = results.reduce((c, r) => ({ errors: c.errors + r.errorCount, warnings: c.warnings + r.warningCount }), { errors: 0, warnings: 0 });

if (process.argv.includes('--update')) {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(actual, null, 2) + '\n');
  console.log(`Lint budget set to ${actual.errors} errors, ${actual.warnings} warnings.`);
  process.exit(0);
}

const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
console.log(`ESLint: ${actual.errors} errors (budget ${budget.errors}), ${actual.warnings} warnings (budget ${budget.warnings})`);

const over = actual.errors > budget.errors || actual.warnings > budget.warnings;
if (over) {
  // Show only the files that have problems, to keep the log readable.
  for (const r of results.filter((x) => x.errorCount || x.warningCount)) {
    for (const m of r.messages) {
      console.log(`${path.relative(ROOT, r.filePath)}:${m.line}:${m.column} ${m.severity === 2 ? 'error' : 'warn '} ${m.ruleId} ${m.message}`);
    }
  }
  console.error('\nLint budget exceeded: fix the new problems above (run `npx eslint <file>` locally).');
  process.exit(1);
}
if (actual.errors < budget.errors || actual.warnings < budget.warnings) {
  console.log('Counts are below budget. Lock in the progress with: npm run lint:budget -- --update');
}
