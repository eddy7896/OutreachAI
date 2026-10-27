import { describe, expect, it } from 'vitest';
import { validateBranchName } from './validate-branch.mjs';
import { validatePrTitle } from './validate-pr-title.mjs';

describe('validateBranchName', () => {
  it.each([
    'main',
    'feat/google-sign-in',
    'fix/cron-product-lookup',
    'hotfix/inbox-xss',
    'docs/branching-guide',
    'feat/42-shared-templates',
    'claude/system-architecture-analysis-ovndry',
    'dependabot/npm_and_yarn/next-16.2.10',
    'release/1.2.0',
  ])('accepts %s', (name) => {
    expect(validateBranchName(name)).toEqual({ ok: true });
  });

  it.each([
    ['', /empty/],
    ['my-branch', /<type>\/<description>/],
    ['feature/google-sign-in', /unknown type "feature"/],
    ['feat/Google_Sign_In', /kebab-case/],
    ['feat/double--hyphen', /kebab-case/],
    ['feat/' + 'a'.repeat(60), /longer than 60/],
    ['develop', /<type>\/<description>/],
  ])('rejects %s', (name, reason) => {
    const result = validateBranchName(name);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(reason);
  });
});

describe('validatePrTitle', () => {
  it.each([
    'feat(auth): add Google sign-in',
    'fix: look up campaign products by name',
    'refactor(engine)!: merge the two sequence engines',
    'docs: add branching guide',
  ])('accepts "%s"', (title) => {
    expect(validatePrTitle(title)).toEqual({ ok: true });
  });

  it.each([
    ['', /empty/],
    ['Added Google sign-in', /expected/],
    ['feature: add sign-in', /unknown type "feature"/],
    ['hotfix: patch inbox', /unknown type "hotfix"/],
    ['fix: Patch the inbox', /lowercase/],
    ['fix: patch the inbox.', /period/],
    ['fix: ' + 'a'.repeat(70), /longer than 72/],
  ])('rejects "%s"', (title, reason) => {
    const result = validatePrTitle(title);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(reason);
  });
});
