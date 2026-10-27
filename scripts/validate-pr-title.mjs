#!/usr/bin/env node
/**
 * Validates a pull request title as a Conventional Commit header, because PRs
 * are squash-merged and the title becomes the commit message on main.
 *
 * Usage: PR_TITLE="feat(auth): add Google sign-in" node scripts/validate-pr-title.mjs
 *        node scripts/validate-pr-title.mjs "fix: ..."
 * Exit:  1 if the title is invalid.
 */
import { fileURLToPath } from 'node:url';
import { BRANCH_TYPES } from './validate-branch.mjs';

// hotfix is a branch type only; its PR title uses "fix".
export const TITLE_TYPES = BRANCH_TYPES.filter((t) => t !== 'hotfix');
const MAX_LENGTH = 72;

export function validatePrTitle(title) {
  const t = (title || '').trim();
  if (!t) return { ok: false, reason: 'title is empty' };
  if (t.length > MAX_LENGTH) return { ok: false, reason: `longer than ${MAX_LENGTH} characters` };

  const match = /^([a-z]+)(\([a-z0-9-]+\))?(!)?: (.+)$/.exec(t);
  if (!match) return { ok: false, reason: 'expected "<type>(<optional scope>): <summary>", e.g. "fix(cron): look up products by name"' };
  const [, type, , , summary] = match;
  if (!TITLE_TYPES.includes(type)) return { ok: false, reason: `unknown type "${type}" (allowed: ${TITLE_TYPES.join(', ')})` };
  if (/^[A-Z]/.test(summary)) return { ok: false, reason: 'summary should start with a lowercase letter' };
  if (/\.$/.test(summary)) return { ok: false, reason: 'summary should not end with a period' };
  return { ok: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const title = process.argv[2] ?? process.env.PR_TITLE ?? '';
  const result = validatePrTitle(title);
  if (result.ok) {
    console.log(`PR title OK: ${title}`);
  } else {
    console.error(`Invalid PR title "${title}": ${result.reason}. See docs/BRANCHING.md.`);
    process.exit(1);
  }
}
