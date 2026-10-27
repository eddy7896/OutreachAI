# System Checks

> Deterministic checks to run locally and in CI. They complement the probabilistic [evals](./SYSTEM_EVALS.md).

## 1. Check inventory

| Check | Command | Network | Current result (2026-10-26) |
|---|---|---|---|
| Type check | `npm run typecheck` | no | ✅ pass |
| Unit tests | `npm test` (vitest) | no | ✅ 41 passed, 1 todo |
| Branch / PR conventions | `node scripts/validate-branch.mjs`, `scripts/validate-pr-title.mjs` | no | ✅ (see [BRANCHING.md](./BRANCHING.md)) |
| Lint | `npm run lint` (`eslint`) | no | ❌ 90 errors / 33 warnings (backlog) |
| Lint budget | `npm run lint:budget` | no | ✅ at budget (90 / 33); fails on any increase |
| Build | `npm run build` | no | ✅ with no env vars set |
| **Drift & invariants** | `npm run check:system` | no | ❌ 6 errors / 20 warnings / 14 info (full report) |
| Drift & invariants vs baseline | `npm run check:system:ci` | no | ✅ 0 new errors; fails on anything not in `scripts/system-checks.baseline.json` |
| AI evals | `npm run eval` | **yes** (AI providers) | not yet baselined (needs keys) |
| Connectivity | `node test-conn.mjs`, `node list-models.mjs` | yes | manual; reads `.env.local` |

## 2. `scripts/system-checks.mjs`

Static, dependency-free, and fast (<1 s). It reads the repo and reports `ERROR` / `WARN` / `INFO`, and exits 1 on any `ERROR`. Add `--json` for machine output.

| ID | Level | What it catches |
|---|---|---|
| `DOC_ROUTE_MISSING` | ERROR in canonical docs (`docs/SYSTEM_CONTEXT.md`, `docs/SYSTEM_ARCHITECTURE.md`), WARN in legacy docs | Docs naming `/api/...` routes that have no handler |
| `VERSION_DRIFT` | same split | Docs stating a Next.js / MUI major that differs from `package.json` |
| `CRON_ROUTE_MISSING`, `CRON_METHOD` | ERROR | `vercel.json` cron path missing or not exporting `GET` |
| `CRON_UNSCHEDULED` | WARN | Routes under `/api/cron` that nothing schedules |
| `CRON_SCHEDULE` | INFO | Prints actual cron schedules (compare with docs) |
| `FETCH_ROUTE_MISSING`, `FETCH_METHOD` | ERROR | Client `fetch('/api/...')` to a missing route or wrong method |
| `ENV_UNDOCUMENTED`, `ENV_UNUSED` | WARN | `process.env.X` vs README env block |
| `BRANCH_LABEL` | ERROR | Sequence engines matching branch labels the builder never writes |
| `PRODUCT_KEY` | ERROR | `campaign.targetProduct` (a name) compared to a product id |
| `PLACEHOLDER_SYNTAX` | ERROR | AI template placeholders that `resolvePlaceholders` can't resolve |
| `FIRESTORE_UNDEFINED` | ERROR | Firestore writes of `undefined` (SDK throws at runtime) |
| `INTENT_ENUM` | ERROR | Prompt intent labels ≠ `Email['intent']` union |
| `PROMPT_DUPLICATED` | WARN | Same prompt constant defined in several files |
| `LLM_OUTPUT_UNVALIDATED` | WARN | LLM JSON returned/stored without enum validation |
| `BUILD_ENV_REQUIRED` | WARN | Module-scope SDK construction that breaks `next build` without secrets |
| `RESEND_OPTION_KEY` | ERROR | snake_case Resend options (`reply_to`, `scheduled_at`) that SDK v6 silently drops |
| `UNSANITIZED_HTML` | ERROR | `dangerouslySetInnerHTML` whose value isn't wrapped in `sanitizeHtml()` |
| `ROUTE_NO_AUTH` | WARN for send/cron/enrich/leads, INFO otherwise | Route handlers with no caller authentication |
| `MODEL_PINNED` | INFO | Hard-coded model ids to re-verify periodically |

### Current findings (baseline)

```
ERROR BRANCH_LABEL         engine matches "false" but SequenceBuilder only writes [Yes, No, Next Step]   cron/sequences:182
ERROR FIRESTORE_UNDEFINED  currentSequenceNodeId: undefined                                             cron/sequences:76, :197
ERROR FIRESTORE_UNDEFINED  resendMessageId: undefined                                                   cron/sequences:151
ERROR PLACEHOLDER_SYNTAX   {{firstName}}, {{lastName}}, {{productName}} unresolvable                    generate-template
ERROR PRODUCT_KEY          targetProduct (name) compared to p.id                                        cron/sequences:44
WARN  BUILD_ENV_REQUIRED   send/route.ts:6, webhook/inbound/route.ts:9
WARN  CRON_UNSCHEDULED     process-sequences, send-scheduled
WARN  DOC_ROUTE_MISSING    /api/send-bulk, /api/pending-actions (SYSTEM_CONTEXT.md, MEMORY.md)
WARN  LLM_OUTPUT_UNVALIDATED, PROMPT_DUPLICATED (classify + webhook)
WARN  ROUTE_NO_AUTH        send, enrich, enrich/bulk, process-sequences, send-scheduled
WARN  VERSION_DRIFT        README (Next 14), SYSTEM_CONTEXT (MUI v6), MEMORY (Next 15, MUI v6)
```

Every ERROR is a real, verified defect, documented in [SYSTEM_ANALYSIS.md §3](./SYSTEM_ANALYSIS.md#3-correctness-defects-verified). Fixing it turns the check green. Do **not** suppress a check to make it pass. If a finding is a false positive, refine the check's pattern.

### Known limits
Regex-based, not AST-based, so it can miss contracts expressed differently (e.g. a lookup through a helper function). Treat a clean run as necessary, not sufficient. Extend it when you add a new string-keyed contract. Better still, centralize the contract in `src/lib/contracts.ts` and make the check assert that literals are imported from there.

## 3. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on **every push to any branch and every pull request**:

| Job | Steps |
|---|---|
| Branch & PR conventions | branch name; PR targets `main` |
| PR title (`.github/workflows/pr-title.yml`) | Conventional Commits title; runs on its own so title edits don't cancel tests |
| Typecheck, tests & checks | `npm ci` → `typecheck` → `test` → `check:system:ci` → `lint:budget` |
| Production build | `npm ci` → `next build` (with a placeholder `RESEND_API_KEY` until PR 0.2) |

The same checks run locally through `npm run validate` and the pre-push hook (`.githooks/pre-push`). Branch rules, ratchets and the GitHub settings to enable are in [BRANCHING.md](./BRANCHING.md). AI evals stay manual (`npm run eval`) because they need provider keys and cost quota.

## 4. Manual operational checks (pre-release / weekly)

| # | Check | How | Expected |
|---|---|---|---|
| O1 | Deployment is not publicly writable | `curl -X POST https://<prod>/api/send -d '{}'` from outside | 401/403 (today: 400 "Missing required fields", which means it is reachable) |
| O2 | Cron ran | Vercel → Cron logs for `/api/cron/sequences` | 200 with `actionsTaken > 0` when leads are due |
| O3 | No stuck scheduled mail | Firestore: `emails where status=='scheduled' and scheduledAt < now-1h` | 0 docs |
| O4 | No false "sent" | Sample 10 `status=='sent'` emails | each has `resendMessageId` |
| O5 | Reply-To honored | Send a test email, check the headers | `Reply-To` equals the Settings value |
| O6 | Webhook healthy | Resend → Webhooks delivery log | 2xx. Inbound docs appear with an `intent` |
| O7 | Unclassified replies | `emails where direction=='inbound' and intent=='UNKNOWN'` | reviewed manually |
| O8 | Models resolvable | `node list-models.mjs`, then a fallback smoke test (`scratch/test-fallback.ts`) | pinned ids are listed / respond |
| O9 | Firestore rules | Firebase console → Rules | no `allow read, write: if true` in production |
| O10 | Secrets hygiene | `settings/global.apiKeys` | empty (keys belong in env only) |
