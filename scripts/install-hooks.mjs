#!/usr/bin/env node
/**
 * Points git at the versioned hooks in .githooks/. Runs from `npm install`
 * (the `prepare` script) and never fails the install: on Vercel or other
 * environments without a .git directory it does nothing.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

if (process.env.CI || !fs.existsSync('.git')) process.exit(0);
try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  fs.chmodSync('.githooks/pre-push', 0o755);
} catch {
  // Hooks are a convenience; CI enforces the same checks.
}
