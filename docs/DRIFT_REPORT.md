# Drift Report: Documentation & Config vs Implementation

> **Date:** 2026-10-26 · **Commit:** `d0bfee2`
> **Definition:** *drift* means a documented, configured, or assumed behavior that no longer matches the code. It covers three kinds: **doc → code** (docs claim something false), **code → code** (two modules disagree on a contract), and **config → code** (deploy config points at something that doesn't behave as configured).
> **Automated detection:** `npm run check:system` (see [SYSTEM_CHECKS.md](./SYSTEM_CHECKS.md)). Items marked 🤖 are caught automatically. Items marked 👁 need review.

Legend: 🔴 misleading / breaks behavior · 🟠 stale, causes confusion · 🟢 cosmetic

---

## 1. Doc → code drift

### 1.1 `SYSTEM_CONTEXT.md` (root, "Pre-development (plan approved)", 2026-06-19)

| # | Claim | Reality | Sev | Det |
|---|---|---|---|---|
| D1 | Status "Pre-development" | Fully built, 15 pages, 13 API routes | 🟠 | 👁 |
| D2 | Next.js 15, MUI v6, Firebase v10+ | Next.js 16.2.9, MUI v9, firebase 12 | 🟠 | 🤖 `VERSION_DRIFT` |
| D3 | Background jobs via **Firebase Cloud Functions** (15 min sends, hourly follow-ups) | No `functions/` dir. Vercel Cron, daily, one route | 🔴 | 👁 |
| D4 | API routes `/api/send-bulk`, `/api/pending-actions` | Do not exist | 🔴 | 🤖 `DOC_ROUTE_MISSING` |
| D5 | Routes listed omit `track`, `webhook/inbound`, `enrich*`, `leads/import`, `generate-template`, three cron routes | Exist | 🟠 | 👁 |
| D6 | `PendingActionsNotifier` queries Firestore for overdue sends and shows notifications | Only requests permission. The alert is never opened | 🔴 | 👁 |
| D7 | Navigation: 9 items | 14 sidebar items (+ Guides, Drafts, Inbox, Outbox, Signatures) and Settings | 🟢 | 👁 |
| D8 | Collections: 6 | 9 (`signatures`, `notifications`, `settings` added) | 🟠 | 👁 |
| D9 | Lead fields | Adds `contactStatus`, `currentSequenceNodeId`, `sequenceLastActionAt`, `hasUnread` | 🟠 | 👁 |
| D10 | Email status flow `draft → scheduled → sent → delivered/failed` | Adds `opened`. Inbound uses `delivered` | 🟢 | 👁 |
| D11 | Import requires Target Product, Industry, Names, Company, Phone | Only `Email` is required (`excelParser.ts:56`) | 🟠 | 👁 |
| D12 | Auto-format on upload: AI generates per-lead email at import | Not implemented (`leads/page.tsx:68` comment) | 🔴 | 👁 |
| D13 | AI = Gemini only ("not OpenAI/Claude") | Gemini + OpenAI-SDK fallback to OpenRouter/Ollama | 🟠 | 👁 |
| D14 | Env vars: Gemini, Resend, Firebase only | Also `FALLBACK_*`, `HUNTER_API_KEY`, `APOLLO_API_KEY`, `EXTENSION_API_KEY`, `CRON_SECRET` | 🟠 | 👁 |
| D15 | Generation receives "tone/style preference from user" | No tone parameter on any route | 🟠 | 👁 |
| D16 | Sequences are a "visual drag-and-drop tree" | Form-based nested builder. `position{x,y}` is stored but unused | 🟢 | 👁 |

### 1.2 `MEMORY.md`

| # | Claim | Reality | Sev |
|---|---|---|---|
| M1 | Decision: Cloud Functions + desktop notification fallback | Neither exists (see D3, D6) | 🔴 |
| M2 | "Components never call Firestore directly" | `inbox`, `outbox`, `drafts`, `BulkCampaignDialog`, `useSignatures` call the SDK directly | 🟠 |
| M3 | "No `any` type" | 70 `no-explicit-any` lint errors | 🟠 |
| M4 | "No inline hex colors" | 19 inline hex literals in `src/app` and `src/components` (e.g. `analytics/page.tsx:15`) | 🟢 |
| M5 | `src/components/shared/` exists | Does not exist | 🟢 |
| M6 | Parked: "Email open tracking", "Webhook-based reply ingestion" | Both implemented | 🟠 |
| M7 | Phase 9 "Cloud Functions 🔄 In progress" | Abandoned in favor of Vercel Cron | 🟠 |
| M8 | Firestore index list (5) | Only `emails(status, scheduledAt)` is actually needed. Others are avoided by in-memory sorts. No `firestore.indexes.json` | 🟢 |
| M9 | Dependencies table "will be populated" | Empty | 🟢 |
| M10 | Known issues table empty | See [SYSTEM_ANALYSIS §3](./SYSTEM_ANALYSIS.md#3-correctness-defects-verified) | 🟠 |

### 1.3 `README.md`

| # | Claim | Reality | Sev | Det |
|---|---|---|---|---|
| R1 | "Next.js 14" | 16.2.9 | 🟠 | 🤖 |
| R2 | Cron "triggers the job **hourly**" | `vercel.json`: `0 10 * * *` (daily) | 🔴 | 👁 |
| R3 | "Automatically progresses leads … sending follow-ups after 3 days if no reply" | Cron engine never sends (C1) and aborts on end nodes (C2) | 🔴 | 🤖 `PRODUCT_KEY`, `FIRESTORE_UNDEFINED` |
| R4 | "A/B Testing: identifies the highest converting messaging" | Only in the cron engine (which never sends). Analytics attributes templates by campaign, not variant | 🔴 | 👁 |
| R5 | "Classify … and update the CRM state" | True, but via the unsigned webhook. `UNKNOWN`/failures → `replied` | 🟢 | 👁 |
| R6 | "Bulk Company Search … type in a domain (e.g. stripe.com)" | Calls Hunter `domain-search?company=`, so it searches by company **name** param | 🟢 | 👁 |
| R7 | `FALLBACK_MODEL` "Optional" (implies it's honored) | Read but unused. Waterfall is hard-coded | 🟠 | 👁 |
| R8 | "All AI and Email operations securely happen on the server" | True for keys, but the endpoints are unauthenticated (open relay) | 🔴 | 🤖 `ROUTE_NO_AUTH` |
| R9 | "Manually: navigate to `/api/cron/sequences` in your browser" | Works only if `CRON_SECRET` unset (then publicly open) | 🟠 | 👁 |
| R10 | Webhook setup lists only `email.received` | Handler also uses `email.opened` | 🟢 | 👁 |

### 1.4 In-app copy

| # | Where | Claim | Reality |
|---|---|---|---|
| U1 | `PendingActionsNotifier` | "You have pending emails to send (Cloud Function Fallback)" | Never shown. No Cloud Functions |
| U2 | Settings → API Keys | Suggests keys configure the app | Server reads env vars only |
| U3 | Campaign detail stats (Replied/Positive) | Look live | Never written (always 0) |

---

## 2. Code → code drift (contract mismatches)

| # | Contract | Producer | Consumer(s) | Mismatch | Det |
|---|---|---|---|---|---|
| X1 | `campaign.targetProduct` | `CampaignForm` → **name** | Engine A (name ✅), Engine B (**id** ❌), Campaign "Run" (name ✅) | Engine B never finds the product | 🤖 `PRODUCT_KEY` |
| X2 | Condition `branchLabel` | Builder → `Yes`/`No`/`Next Step` | Engine A `Yes`/`No` ✅, Engine B `false` ❌ | Engine B dead-ends | 🤖 `BRANCH_LABEL` |
| X3 | Placeholder syntax | `generate-template` → `{{firstName}}` | `resolvePlaceholders` → `{{first_name}}`, Compose "Load directly" → camelCase | Unresolved tokens can be sent | 🤖 `PLACEHOLDER_SYNTAX` |
| X4 | Classification prompt | `api/classify` | `api/webhook/inbound` (copy) | Identical today. Will diverge | 🤖 `PROMPT_DUPLICATED` |
| X5 | Email "sent" semantics | Pixel sets `status:'opened'` | Analytics/Dashboard count `status==='sent'` | Opened mails drop out of sent counts | 👁 |
| X6 | Terminal lead state | Inbox writes `contactStatus` | Engine A reads `contactStatus`. Engine B reads `status` only | Manual "Meeting Booked" ignored by cron | 👁 |
| X7 | Resend options | `/api/send` passes `reply_to` | SDK v6 reads `replyTo` | Reply-To dropped | 👁 |
| X8 | Timestamps | `Timestamp`, `serverTimestamp`, `Date`, ISO string | Readers assume `.toMillis()`/`.seconds` | Fragile sorting/formatting | 👁 |
| X9 | Sequence scheduling | Campaign `timezone`/`scheduleWindow` | Engine A ✅, Engine B ignores | Inconsistent send times | 👁 |
| X10 | `FALLBACK_MODEL` | README/env | `ai.ts` reads, never uses | Config ignored | 👁 |

---

## 3. Config → code drift

| # | Config | Points at | Problem | Det |
|---|---|---|---|---|
| K1 | `vercel.json` cron | `/api/cron/sequences` GET | Works, but see X1/X2 and C2 | 🤖 `CRON_SCHEDULE` |
| K2 | — | `/api/cron/process-sequences`, `/api/cron/send-scheduled` | Under `/api/cron` but unscheduled and POST-only | 🤖 `CRON_UNSCHEDULED` |
| K3 | `firebase.json` | `functions/` | Directory does not exist | 👁 |
| K4 | `extension/manifest.json` host_permissions | `localhost:3000`, `*.vercel.app` | Custom production domains are blocked by CORS/host permissions | 👁 |
| K5 | Build | `RESEND_API_KEY` | `next build` fails if unset (module-scope client) | 🤖 `BUILD_ENV_REQUIRED` |
| K6 | `.gitignore` | `.log*` | Doesn't cover `.firebase/logs/*.log`, so a 40k-line debug log is committed | 👁 |
| K7 | Pinned models | `gemini-2.0-flash`, 5 `:free` OpenRouter ids | Provider catalogues change. Verify availability periodically | 🤖 `MODEL_PINNED` (info) |

---

## 4. Preventing future drift

1. **One source of truth:** `docs/SYSTEM_CONTEXT.md` is canonical. Root `SYSTEM_CONTEXT.md`/`MEMORY.md` now carry a "superseded" banner.
2. **Shared constants module** (`src/lib/contracts.ts`): branch labels, intent list, placeholder keys, terminal statuses, product-key accessor. Import them everywhere instead of string literals.
3. **Run `npm run check:system` in CI.** It exits non-zero on contract or doc-route drift.
4. **PR checklist item:** "Updated docs/SYSTEM_CONTEXT.md if behavior changed".
5. **Quarterly model check:** confirm pinned model ids still resolve (`node list-models.mjs`), then run `npm run eval`.
