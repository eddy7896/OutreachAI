# Branching & Pull Request Workflow

> Trunk-based development: `main` is always deployable, and all work happens on short-lived branches that merge back through a pull request after CI passes. Enforced by `.github/workflows/ci.yml` and an optional local pre-push hook.

## 1. Branches

| Branch | Purpose | Lifetime | Who merges |
|---|---|---|---|
| `main` | Production. Vercel deploys it automatically | Permanent, protected | Only through a PR |
| `<type>/<description>` | One feature, fix or chore | Hours to a few days | Author, after CI + review |
| `hotfix/<description>` | Urgent production fix | Hours | Author, after CI (review can follow) |
| `release/x.y.z` | Optional: freeze a version for a tagged release | Until tagged | Maintainer |
| `claude/*`, `dependabot/*` | Created by tools | Until merged | Reviewed like any PR |

There is no `develop` branch. Vercel preview deployments (one per PR) take its place as the staging environment.

### Naming rules (checked by `scripts/validate-branch.mjs`)

```
<type>/<lowercase-kebab-description>       max 60 characters
types: feat fix hotfix chore docs refactor test ci perf build revert
```

| ✅ Valid | ❌ Invalid (reason) |
|---|---|
| `feat/google-sign-in` | `feature/google-sign-in` (unknown type) |
| `fix/cron-product-lookup` | `fix/Cron_Product` (not kebab-case) |
| `feat/42-shared-templates` | `my-branch` (no type) |
| `hotfix/inbox-xss` | `develop` (not part of this workflow) |

Map plan items to branches, e.g. PR 0.1 → `fix/cron-engine-hotfixes`, PR 1.1 → `feat/google-sign-in`.

## 2. Day-to-day flow

```bash
git switch main && git pull
git switch -c fix/cron-engine-hotfixes
# ...work, commit often...
npm run validate          # same checks CI runs, except the build
git push -u origin fix/cron-engine-hotfixes
# open a PR to main; title: "fix(cron): look up campaign products by name"
```

- **Keep branches small and short-lived.** One plan item per PR. Rebase on or merge `main` daily to avoid drift.
- **Merge method: squash.** The PR title becomes the single commit on `main`, so it must follow Conventional Commits.
- **Delete the branch after merging** (enable "Automatically delete head branches" in repo settings).
- **Hotfixes** branch from `main`, merge back into `main`, then deploy.

### PR titles (checked by `scripts/validate-pr-title.mjs`)

```
<type>(<optional-scope>)<optional !>: <lowercase summary, no trailing period>
```
Examples: `feat(auth): add Google sign-in`, `fix(cron): stop writing undefined to Firestore`, `refactor(engine)!: merge the two sequence engines`. Use `!` for breaking changes, such as a data migration. `hotfix` is only a branch type, so a hotfix PR is titled `fix: …`.

## 3. Validation checks

| Check | Command | Local pre-push | CI on push | CI on PR | Blocks merge |
|---|---|---|---|---|---|
| Branch name | `node scripts/validate-branch.mjs` | ✅ | ✅ | ✅ | ✅ |
| PR title | `node scripts/validate-pr-title.mjs` | — | — | ✅ | ✅ |
| PR targets `main` | (workflow step) | — | — | ✅ | ✅ |
| Typecheck | `npm run typecheck` | ✅ | ✅ | ✅ | ✅ |
| Unit tests (vitest) | `npm test` | ✅ | ✅ | ✅ | ✅ |
| System checks (drift & contracts) | `npm run check:system:ci` | ✅ | ✅ | ✅ | ✅ (new errors only) |
| Lint budget | `npm run lint:budget` | — | ✅ | ✅ | ✅ (new problems only) |
| Production build | `npm run build` | — | ✅ | ✅ | ✅ |
| AI evals | `npm run eval` | manual | — | — | Manual, for AI changes |

**Ratchets:** `check:system:ci` compares results with `scripts/system-checks.baseline.json`, and `lint:budget` with `scripts/lint-budget.json`. Known problems don't fail CI, but anything new does. When you fix a known problem, shrink the baseline in the same PR:

```bash
npm run check:system -- --write-baseline scripts/system-checks.baseline.json
npm run lint:budget -- --update
```

Never *add* entries to the baseline to get a PR through. Fix the problem, or explain in the PR why the check is wrong and refine the check instead.

**Local hook:** `npm install` points git at `.githooks/`, so `git push` runs the pre-push checks (~10 s). Skip once with `SKIP_PREPUSH=1 git push`; CI still runs everything.

## 4. Repository settings to enable (GitHub → Settings)

These need a repo admin and can't be set from code:

1. **Rules → Rulesets → New branch ruleset** targeting `main`:
   - Require a pull request before merging. 1 approval once there's a second contributor; 0 while working solo.
   - Require status checks to pass: `Branch & PR conventions`, `Typecheck, tests & checks`, `Production build`. Also require branches to be up to date before merging.
   - Block force pushes and deletions.
   - Require linear history.
2. **General → Pull Requests:** allow **squash merging** only; default commit message "Pull request title"; enable "Automatically delete head branches".
3. **Actions → General:** for fork PRs, require approval to run workflows for first-time contributors (the repo is public). Workflow permissions: read-only by default.
4. **Code security:** enable secret scanning and push protection. Both are free for public repos.

## 5. Releases (optional)

Tag `main` when a phase from `docs/IMPLEMENTATION_PLAN.md` ships: `git tag v0.1.0 && git push --tags`. Use `release/x.y.z` only if a version needs fixes while `main` moves on.
