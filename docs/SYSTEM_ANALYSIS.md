# Comprehensive System Analysis: Outreach AI CRM

> **Date:** 2026-10-26 · **Commit analysed:** `d0bfee2` · **Method:** full read of `src/`, `extension/`, config and docs. Static checks (`tsc`, `eslint`, `next build`, `scripts/system-checks.mjs`). Targeted runtime probes (Firestore SDK behavior, Resend SDK option mapping). Live AI evals were **not** run because no API keys are available in the analysis environment. The harness is provided and was smoke-tested against a mock server.

Companion docs: [Architecture](./SYSTEM_ARCHITECTURE.md) · [Context](./SYSTEM_CONTEXT.md) · [Drift](./DRIFT_REPORT.md) · [Hallucination checks](./HALLUCINATION_CHECKS.md) · [Evals](./SYSTEM_EVALS.md) · [Checks](./SYSTEM_CHECKS.md)

---

## 1. Executive summary

The product surface is broad and coherent: 15 pages covering the whole SDR loop, a clean typed domain model, and a sensible AI fallback layer. The **manual path works**: import → compose with AI → send → reply webhook → classification → inbox.

The **automated path does not work in production**, and the **security model assumes a private network that a Vercel deployment does not provide**:

| # | Headline | Severity |
|---|---|---|
| 1 | Anyone on the internet can send email from your verified domain (`POST /api/send`, no auth) and read or write the whole CRM (Firestore must be world-writable for the client SDK to work). Inbound email HTML is rendered unsanitized in the Inbox (stored XSS) | **Critical** |
| 2 | The scheduled automation (Vercel Cron → `/api/cron/sequences`) never sends an email and crashes when a lead reaches an `end` node | **High** |
| 3 | The manual sequence engine queues emails as `scheduled` that nothing ever sends | **High** |
| 4 | Two sequence engines with contradictory semantics (branching, A/B, scheduling, terminal states) | **High** |
| 5 | Emails are marked `sent` *before* the send succeeds (compose, inbox, cron), so analytics and the CRM state report false sends | **High** |
| 6 | Reply-To from Settings is silently dropped (wrong SDK key), so replies may not reach the inbound webhook | **Medium–High** |
| 7 | LLM output is trusted blindly: no schema validation, prompt-injectable classification drives CRM state, and generation prompts invite fabricated claims | **Medium** |
| 8 | Planning docs (`SYSTEM_CONTEXT.md`, `MEMORY.md`, README) have drifted far from the code and will mislead people and AI agents | **Medium** |

**Health scorecard**

| Dimension | Score (0–5) | Why |
|---|---|---|
| Feature completeness (manual) | 4 | All main screens work end-to-end |
| Feature completeness (automation) | 1 | Cron path inert; scheduled sends orphaned |
| Correctness | 2 | Six verified contract and logic defects (§3) |
| Security | 0.5 | No auth, open relay, public DB, unsigned webhook |
| AI quality controls | 1.5 | Fallback exists. No validation, evals, or grounding |
| Reliability / ops | 1.5 | No idempotency, no run logs, build depends on secrets |
| Code hygiene | 3 | `tsc` clean. 90 lint errors (mostly `any`). No tests |
| Documentation accuracy | 1.5 | README is close. Context and memory docs are stale |

---

## 2. How the system works (condensed)

1. **Data plane:** the browser reads and writes Firestore directly through hooks (`onSnapshot`). The same client SDK runs inside API routes, so the server has **no more privilege than an anonymous browser**.
2. **AI plane:** `generateWithFallback(prompt, isJSON)` tries Gemini 2.0 Flash, then five free OpenRouter models in order. JSON is extracted with a regex. Four prompts exist: classify (duplicated in the webhook), generate (polish template), auto-format (write from scratch), and generate-template.
3. **Email plane:** `/api/send` wraps Resend. The sender identity comes from `settings/global`. Opens are tracked twice (pixel → `/api/track`, and Resend `email.opened`). Replies arrive through `/api/webhook/inbound`, which fetches the body, matches the lead by address substring, classifies it, and updates `lead.status`.
4. **Automation plane:** sequences are trees of `email/delay/condition/end` nodes stored on the sequence doc. Each lead tracks `currentSequenceNodeId` and `sequenceLastActionAt`. Two engines advance leads (see [Architecture §6.3](./SYSTEM_ARCHITECTURE.md#63-sequence-automation-two-engines)).
5. **Ingestion plane:** XLSX import (client), Hunter domain search (server), and the LinkedIn extension (server, key-protected).

---

## 3. Correctness defects (verified)

Each item has a reproduction or evidence. IDs match `scripts/system-checks.mjs` where applicable.

### C1. Cron engine never finds the product → never sends (`PRODUCT_KEY`)
- `CampaignForm.tsx:124` stores `value={p.name}`. `cron/sequences/route.ts:44` looks up `p.id === campaign.targetProduct`, so `product` is always `undefined`.
- `route.ts:115` requires `template && product`, so every email node takes the `else` branch (`console.warn('Missing template or product')`) and the lead **never advances**.
- Engine A (`process-sequences:39`) correctly uses `p.name`.
- **Fix:** look up by name (or migrate to storing `productId`, and update all three readers together).

### C2. Writing `undefined` to Firestore aborts the cron run (`FIRESTORE_UNDEFINED`)
- `cron/sequences/route.ts:76, 151, 197` write `currentSequenceNodeId: undefined` / `resendMessageId: … || undefined`.
- Verified locally: `updateDoc(..., {f: undefined})` throws `Unsupported field value: undefined`.
- The per-lead loop sits inside one outer `try`, so **the first lead at an `end` node (or with an invalid node id) aborts processing for every later lead and campaign**. The cron returns 500.
- Line 151 only throws when Resend returned no id, i.e. after a failed send that was already recorded as `sent`.
- **Fix:** use `deleteField()` or `null`, and wrap each lead in its own `try/catch`.

### C3. Condition branch label mismatch (`BRANCH_LABEL`)
- The builder writes `Yes`/`No` (`SequenceBuilder.tsx:147-150`). Engine B looks for `'false'` (`cron/sequences:182`) → `nextNodeId = undefined` → C2.
- **Fix:** match `No`. Better, export the label constants from one module.

### C4. Scheduled emails are orphaned (`CRON_UNSCHEDULED`)
- Engine A writes `status:'scheduled'` (`process-sequences:108`). Only `/api/cron/send-scheduled` sends them, and it is POST-only, unauthenticated, and has no caller and no cron entry.
- **Fix:** export `GET` with a `CRON_SECRET` check and add it to `vercel.json`. Mind plan limits: Vercel Hobby allows daily crons only.

### C5. "Sent" recorded before sending (false positives)
- Compose (`compose/page.tsx:195-202`), inbox reply (`inbox/page.tsx:148-156`), and Engine B (`cron/sequences:128-137`) create the email with `status:'sent'` and then call `/api/send`. On failure, compose shows an error but leaves the doc as `sent`. The inbox ignores `!res.ok`. Engine B ignores the send result and still advances the lead.
- **Fix:** write `status:'sending'`, then set `sent`/`failed` from the result. Advance sequences only on success.

### C6. Reply-To silently dropped
- `/api/send` passes `reply_to` (`send/route.ts:33`). In `resend@6.14.0`, `emails.send` maps only `email.replyTo` (`node_modules/resend/dist/index.mjs:195`), so the field never reaches the API.
- Impact: if the sender domain differs from the inbound subdomain (as the README setup suggests), **replies bypass the webhook**, and classification and status routing never happen.
- **Fix:** `replyTo: replyToEmail`.

### C7. Placeholder syntax split (`PLACEHOLDER_SYNTAX`)
- AI templates use `{{firstName}}`/`{{lastName}}`/`{{productName}}` (`generate-template:12-15`). The server resolver handles `{{first_name}}` etc. (`utils/placeholders.ts`). Compose's "Load template directly" handles the camelCase form, but `/api/generate` does not. Without product context (`generate:18`), raw `{{firstName}}` is returned and can be **sent verbatim**. With product context, the LLM is relied on to fill them in.
- **Fix:** one syntax. Make the generator emit `{{first_name}}` and teach the resolver both forms for existing templates.

### C8. Analytics undercounts sends once opened
- The pixel sets `status:'opened'` (`track/route.ts:18`). Analytics counts sent as `status === 'sent'` (`analytics/page.tsx:40`), so opened emails **leave the denominator**, and the `status==='opened'` branch in `totalOpened` can never be hit. Dashboard has the same filter (`DashboardStats.tsx:18`).
- **Fix:** treat `sent|delivered|opened` as sent, and keep `opened` as a separate boolean only (do not overwrite `status`).

### C9. Other logic issues
| Issue | Location | Effect |
|---|---|---|
| Campaign stats `replied/positive/...` never written | webhook doesn't update campaign | Campaign cards always show 0 |
| Engine A evaluates `condition` immediately | `process-sequences:74-95` | Without a preceding delay node, "No" fires instantly |
| Engine A ignores `templateIdB`/A-B | `process-sequences:98` | A/B tests only in Engine B, which never sends → A/B analytics always empty |
| Engine B ignores `scheduleWindow`/`timezone` | `cron/sequences` | Sends at 10:00 UTC whatever the campaign settings |
| Engine B ignores `contactStatus` "Meeting Booked" / "Not Interested" set in Inbox | `cron/sequences:50-56` | Leads marked done manually keep receiving follow-ups |
| Lead matching by substring | `webhook/inbound:105` | `ann@x.com` matches `joann@x.com`. First match wins |
| Webhook `[DEBUG]` text stored as email body and classified | `webhook/inbound:72,76` | Debug JSON is shown in the Inbox and fed to the LLM |
| `openedAt` stored as ISO string | `webhook/inbound:53` | Mixed types with `Timestamp`/`Date` elsewhere |
| `getNextValidSendTime` returns `now` if no valid day in 14 days | `scheduling.ts:49` | Empty `days[]` sends immediately, ignoring the window |
| Campaign "Run" processes only the first 3 leads and leaves status `new` | `campaigns/[id]/page.tsx:114,139` | Re-running regenerates drafts for the same leads |
| `useSettings.updateSettings` replaces nested objects | `useSettings.ts` | Partial saves can wipe sibling fields |
| `FALLBACK_MODEL` env read but unused | `ai.ts:11` | Config has no effect |

---

## 4. Security posture

| # | Finding | Evidence | Risk |
|---|---|---|---|
| S1 | **Open email relay**: `POST /api/send {to, subject, body}` sends arbitrary HTML from your verified domain with no auth | `send/route.ts` | Spam/phishing from your domain, domain reputation loss, Resend account suspension |
| S2 | **Public database**: the client SDK runs unauthenticated on server and browser, so Firestore rules must allow anonymous read/write, and the web config is public by design | `lib/firebase.ts`, all hooks | Any visitor can dump leads (PII), edit sequences, or delete data |
| S3 | **Secrets in a public DB**: Settings stores `resendApiKey`/`geminiApiKey` in `settings/global` | `settings/page.tsx:54` | Key exfiltration (unused by the server anyway) |
| S4 | **Unsigned webhook**: no Svix signature verification | `webhook/inbound:89` | Forged replies flip lead status (`lost`/`replied`) and inject content into the Inbox |
| S5 | **Unauthenticated cost endpoints**: `/api/generate*`, `/api/auto-format`, `/api/classify`, `/api/enrich*` | route files | LLM/Hunter/Apollo quota burn. `enrich/bulk` also writes leads |
| S6 | **Unauthenticated automation**: `process-sequences` and `send-scheduled` | route files | Anyone can trigger mass sends |
| S7 | **`CRON_SECRET` optional**: if unset, the cron route is open | `cron/sequences:12` | Same as S6 |
| S8 | **Stored XSS from inbound email**: prospect-controlled HTML is rendered unsanitized with `dangerouslySetInnerHTML` (signatures are rendered the same way) | `inbox/page.tsx:332`, `signatures/page.tsx:87`, `signatures/[id]/page.tsx:137` | Any email sent to the inbound address runs script in the operator's session, with full Firestore access (S2). Sanitize with DOMPurify or render in a sandboxed `<iframe srcdoc>` |
| S9 | **Prompt injection**: raw inbound email is concatenated into the classification prompt, and the result drives CRM state | `webhook/inbound:113` | A prospect (or forger) can steer intent. See [Hallucination checks](./HALLUCINATION_CHECKS.md) |
| S10 | **Tracking pixel IDOR**: `/api/track?emailId=` marks any email opened | `track/route.ts` | Analytics tampering (low) |
| S11 | API keys in query strings (Hunter) | enrich routes | Keys can end up in proxy logs (low) |
| S12 | Committed 40k-line Firebase debug log | `.firebase/logs/vsce-debug.log` | Possible account and project metadata leak. Remove it and add `.firebase/` to `.gitignore` |

**Minimum viable hardening (in order):**
1. Put the whole app behind auth (Vercel Password Protection / Deployment Protection, or Firebase Auth + Next.js middleware). Exempt only `/api/webhook/inbound`, `/api/track`, cron routes, and `/api/leads/import`.
2. Move server data access to the **Firebase Admin SDK** with a service account. Lock Firestore rules to `request.auth != null` (or deny all client access and serve data through API routes).
3. Verify Resend webhook signatures. Require `CRON_SECRET`. Remove `apiKeys` from Settings.
4. Rate-limit AI and enrichment routes.

---

## 5. AI subsystem assessment

| Aspect | State | Recommendation |
|---|---|---|
| Model choice | `gemini-2.0-flash` pinned. Five `:free` OpenRouter ids hard-coded | Move to config. Periodically verify availability (free model ids on OpenRouter churn, and older Gemini versions get retired). `check:system` lists the pinned ids |
| Output contract | Regex `{...}` + `JSON.parse`. No schema validation | Use Gemini `responseMimeType: 'application/json'` + `responseSchema`. Validate with a schema (e.g. zod) and coerce unknown intents to `UNKNOWN` |
| Grounding | Prompts provide product facts but never say "use only these facts". Guides presets explicitly ask for metrics, name-drops, and compliance claims | Add a grounding clause and a post-generation claim check. See [Hallucination checks](./HALLUCINATION_CHECKS.md) |
| Prompt hygiene | User and email content concatenated into one string. Classification prompt duplicated | Separate system and user roles. Delimit untrusted input. Single prompt module |
| Determinism | Default temperature | `temperature: 0` for classification |
| Failure behavior | Classification failure → `UNKNOWN` → lead set to `replied` | On failure, keep the status and flag the email for manual review |
| Latency / timeouts | No timeouts. Up to 6 sequential provider attempts | Per-attempt timeout. Respect route `maxDuration` |
| Evals | None | `npm run eval` (added). Gate prompt and model changes on it |

---

## 6. Reliability, performance & operations

- **Idempotency:** no dedupe key on sends. A double click or retried cron sends duplicates. Add an `idempotencyKey` (Resend supports one) derived from `leadId+nodeId`.
- **Atomicity:** multi-document updates (email + lead + campaign) are not batched. Use `writeBatch` or transactions.
- **Scans:** the webhook loads *all* leads and *all* emails (for `email.opened`). Engine B loads every collection each run. Use indexed queries (`where('email','==',…)`, `where('resendMessageId','==',…)`).
- **Self-HTTP calls:** engines call `/api/generate` and `/api/send` over HTTP. Engine A builds the URL from the `Origin` header (absent for server callers → `localhost:3000`). Call the functions directly instead.
- **Timeouts:** no `maxDuration` on cron routes. Sequential LLM + send per lead will exceed default function limits as volume grows.
- **Build coupling:** `next build` fails without `RESEND_API_KEY` (module-scope `new Resend('')`). This likely explains the repeated "deployment error" commits. Instantiate lazily inside the handler.
- **Observability:** add a `cron_runs` collection (start, end, counts, errors) and surface it on the dashboard.

---

## 7. Code quality

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ pass |
| `RESEND_API_KEY=dummy next build` | ✅ pass (31 routes). ❌ fails without the env var |
| `npx eslint .` | ❌ 123 problems: 70 `no-explicit-any`, 33 `no-unused-vars`, 8 `no-unescaped-entities`, 5 `react-hooks/set-state-in-effect`, 5 `prefer-const`, 1 `ban-ts-comment`, 1 `no-require-imports` |
| `npm run check:system` | ❌ 6 errors / 20 warnings (all are real defects or drift, listed in §3 and the [Drift report](./DRIFT_REPORT.md)) |
| Tests | none |

Conventions in `MEMORY.md` ("no `any`", "components never call Firestore directly", "no inline hex colors") are not followed: inbox, outbox, drafts, and BulkCampaignDialog import Firestore directly. These are minor, but they show that the memory file is not being enforced.

---

## 8. Recommended roadmap

**Phase 0: stop the bleeding (≈1 day)**
1. Gate the deployment behind auth / Vercel protection (S1, S2, S5, S6).
2. Fix C1, C2, C3 (three small edits in `cron/sequences`) and C6 (`replyTo`).
3. Lazy-init Resend so builds don't need secrets.
4. Delete `.firebase/logs/` from git.

**Phase 1: one correct engine (≈1 week)**
1. Merge Engines A and B into one `src/lib/sequenceEngine.ts`: name-based product lookup, `Yes`/`No` labels, schedule window, A/B, signature + pixel, `contactStatus` terminal check, per-lead try/catch, `deleteField()`.
2. Schedule it with a `GET` cron (plus `send-scheduled`, or send inline at the computed time).
3. Write `sending → sent|failed` correctly everywhere (C5). Fix analytics (C8). Update campaign stats from the webhook.

**Phase 2: trustworthy AI (≈1 week)**
1. Structured output plus schema validation. Single prompt module. Temperature 0 for classification.
2. Grounding clause plus claim checker (see [Hallucination checks](./HALLUCINATION_CHECKS.md)).
3. Run `npm run eval` in CI on prompt or model changes, with thresholds from [SYSTEM_EVALS.md](./SYSTEM_EVALS.md).

**Phase 3: platform (ongoing)**
Admin SDK + locked rules, webhook signatures, idempotent sends, run logs, unit tests for `scheduling.ts`, `placeholders.ts`, and the engine (pure functions are easy to test). Burn down the lint backlog. Retire the stale docs.
