#!/usr/bin/env node
/**
 * Validates a branch name against the convention in docs/BRANCHING.md.
 *
 * Usage: node scripts/validate-branch.mjs [branch]   (defaults to the current git branch)
 * Exit:  1 if the name is invalid.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BRANCH_TYPES = ['feat', 'fix', 'hotfix', 'chore', 'docs', 'refactor', 'test', 'ci', 'perf', 'build', 'revert'];

// Long-lived or tool-owned branches that don't follow <type>/<description>.
const EXEMPT = [/^main$/, /^dependabot\/.+/, /^claude\/[a-z0-9][a-z0-9._-]*$/, /^release\/\d+\.\d+\.\d+$/, /^gh-readonly-queue\/.+/];

const MAX_LENGTH = 60;

export function validateBranchName(name) {
  if (!name) return { ok: false, reason: 'branch name is empty' };
  if (EXEMPT.some((re) => re.test(name))) return { ok: true };
  if (name.length > MAX_LENGTH) return { ok: false, reason: `longer than ${MAX_LENGTH} characters` };

  const match = /^([a-z]+)\/(.+)$/.exec(name);
  if (!match) return { ok: false, reason: `expected <type>/<description>, e.g. feat/google-sign-in` };
  const [, type, description] = match;
  if (!BRANCH_TYPES.includes(type)) return { ok: false, reason: `unknown type "${type}" (allowed: ${BRANCH_TYPES.join(', ')})` };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(description)) {
    return { ok: false, reason: 'description must be lowercase kebab-case (letters, digits, single hyphens)' };
  }
  return { ok: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let name = process.argv[2];
  if (!name) {
    try {
      name = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      name = '';
    }
  }
  if (name === 'HEAD') {
    console.log('Detached HEAD; skipping branch name check.');
    process.exit(0);
  }
  const result = validateBranchName(name);
  if (result.ok) {
    console.log(`Branch name OK: ${name}`);
  } else {
    console.error(`Invalid branch name "${name}": ${result.reason}. See docs/BRANCHING.md.`);
    process.exit(1);
  }
}
