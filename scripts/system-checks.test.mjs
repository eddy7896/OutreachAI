import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/system-checks.mjs');
const BASELINE = path.join(ROOT, 'scripts/system-checks.baseline.json');

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

describe('system-checks', () => {
  it('passes against the committed baseline (no new contract or drift errors)', () => {
    const result = run('--json', '--baseline', BASELINE);
    const report = JSON.parse(result.stdout);
    expect(report.newErrors).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('keeps canonical docs free of drift errors', () => {
    const report = JSON.parse(run('--json').stdout);
    const canonical = report.findings.filter((f) => f.level === 'ERROR' && f.where.startsWith('docs/'));
    expect(canonical).toEqual([]);
  });

  it('fails when an error is missing from the baseline', () => {
    const empty = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'checks-')), 'baseline.json');
    fs.writeFileSync(empty, '[]');
    const result = run('--json', '--baseline', empty);
    const report = JSON.parse(result.stdout);
    if (report.counts.ERROR) {
      expect(result.status).toBe(1);
      expect(report.newErrors.length).toBe(report.counts.ERROR);
    } else {
      expect(result.status).toBe(0);
    }
  });
});
