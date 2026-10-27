## What and why

<!-- What does this change, and which finding or plan item does it address (e.g. C1, PR 0.2 in docs/IMPLEMENTATION_PLAN.md)? -->

## How it was tested

<!-- Commands run, manual steps, screenshots for UI changes. -->

## Checklist

- [ ] PR title follows Conventional Commits (`type(scope): summary`); it becomes the squash commit on `main`
- [ ] `npm run validate` passes locally (branch name, typecheck, tests, system checks, lint budget)
- [ ] Tests added or updated for changed logic
- [ ] If a known issue was fixed: removed it from `scripts/system-checks.baseline.json` and lowered `scripts/lint-budget.json` where counts dropped
- [ ] Docs updated if behavior changed (`docs/SYSTEM_CONTEXT.md` is the source of truth)
- [ ] AI prompt or model changes: `npm run eval` results attached
- [ ] No secrets, keys or customer data in code, logs, fixtures or screenshots (this repo is public)
