# System Context: Outreach AI CRM (as built)

> **Purpose:** the canonical, implementation-accurate context for humans and AI coding agents working in this repo. It **supersedes** the root `SYSTEM_CONTEXT.md` and the decision log in `MEMORY.md`. Those files record the *original plan* (2026-06-19) and are kept for history. They contain claims that are no longer true; see [DRIFT_REPORT.md](./DRIFT_REPORT.md).
> **Last verified:** 2026-10-26 against commit `d0bfee2`. Re-verify with `npm run check:system`.

---

## 1. What the system is

An internal, single-user **AI SDR tool**. It imports and enriches leads, generates personalized cold emails grounded in a product registry, sends them through Resend, automates follow-ups with branching sequences, ingests replies through a Resend webhook, classifies reply intent with an LLM, and reports funnel analytics.

**Users:** one internal operator (no accounts, no roles). **Volume target:** ~20–30 emails/day.

## 2. Stack (actual versions from `package.json`)

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.9** App Router, React 19.2, TypeScript 5 (strict) |
| UI | MUI **v9** (`@mui/material`, `@mui/x-data-grid`), Emotion, Recharts 3 |
| Data | Cloud Firestore through the **client** SDK `firebase@12` in browser *and* server routes. No Admin SDK |
| AI | `@google/generative-ai` → `gemini-2.0-flash`. Fallback through `openai@6` SDK to an OpenAI-compatible URL (OpenRouter/Ollama) with 5 hard-coded free models |
| Email | `resend@6`: send, inbound `emails.receiving.get`, webhooks |
| Enrichment | Hunter.io (verifier, domain-search, email-finder), Apollo.io (people/match) |
| Scheduling | Vercel Cron (daily) + `date-fns-tz` send-window logic |
| Import | SheetJS `xlsx` (client-side) and a Chrome MV3 extension (LinkedIn) |
| Auth | **None** (only the extension key and optional cron secret) |

> Agent note (from `AGENTS.md`): this Next.js version has breaking changes compared with older training data. Read `node_modules/next/dist/docs/` before writing framework code.

## 3. Domain vocabulary

| Term | Meaning in code |
|---|---|
| **Lead** | A prospect (`leads`). `status` is the pipeline stage: `new → contacted → replied → qualified → converted`, or `lost`. `contactStatus` is a free-text touch label (`First Contact`, `Follow Up N`, `Replied`, `Meeting Booked`, `Not Interested`) |
| **Product** | A registry entry whose text fields are the **only** facts the LLM may use about what we sell |
| **Campaign** | A group of leads, plus `targetProduct` (**product name**), optional `templateId`, `sequenceId`, timezone, and send window |
| **Sequence** | A tree of nodes (`email`, `delay`, `condition`, `end`). Children are linked by `branchLabel` (`Next Step`, `Yes`, `No`) |
| **Template** | Subject and HTML body with placeholders. Two syntaxes exist: `{{first_name}}` (resolver) and `{{firstName}}` (AI generator) |
| **Email** | Any outbound or inbound message (`emails`). `status`: `draft/scheduled/sent/delivered/opened/failed` |
| **Intent** | `POSITIVE_INTEREST`, `MORE_INFO_REQUESTED`, `NOT_INTERESTED`, `OUT_OF_OFFICE`, `BOUNCE`, `UNKNOWN` |

## 4. Where things happen

| Capability | Entry point(s) |
|---|---|
| Lead CRUD, import, bulk assign | `/leads`, `useLeads`, `utils/excelParser.ts`, `BulkCampaignDialog`, `BulkCompanyDialog` → `/api/enrich/bulk` |
| Single-lead enrichment | `LeadForm` → `/api/enrich` |
| LinkedIn capture | `extension/` → `/api/leads/import` |
| AI drafting | `/compose`, campaign "Run" → `/api/generate` or `/api/auto-format` |
| AI templates | `/templates/[id]` (`TemplateEditor`), `/guides` presets → `/api/generate-template` |
| Sending | `/compose`, `/inbox` reply, engines → `/api/send` |
| Open tracking | `<img src="/api/track?emailId=…">` and the Resend `email.opened` webhook |
| Replies | Resend → `/api/webhook/inbound` → classify → `emails` + lead status |
| Manual classification | `/classify` → `/api/classify` |
| Automation | Engine A `/api/cron/process-sequences` (button), Engine B `/api/cron/sequences` (cron), `/api/cron/send-scheduled` (no caller) |
| Reporting | `/` (DashboardStats, Funnel, Intent charts), `/analytics`, campaign detail stats |

Full diagrams are in [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md).

## 5. Invariants every change must respect

These are string-keyed contracts the type system does not enforce. `scripts/system-checks.mjs` checks most of them.

1. `campaign.targetProduct` stores the product **name**. Look products up by `name`.
2. Sequence branch labels are exactly `Next Step`, `Yes`, `No` (`SequenceBuilder.tsx`). Engines must match these.
3. Never write `undefined` to Firestore. Use `deleteField()` or `null` (the SDK is not configured with `ignoreUndefinedProperties`).
4. Intent labels must equal the `Email['intent']` union. LLM output must be validated against it before it is stored or routed.
5. Placeholders resolved server-side are `{{snake_case}}` (`utils/placeholders.ts`). Any generator must emit the same syntax.
6. Vercel Cron calls routes with **GET**. Cron routes must export GET and check `CRON_SECRET`.
7. Secrets live only in server env vars. Never read `settings.apiKeys` server-side or expose new keys through `NEXT_PUBLIC_*`.
8. Do not instantiate SDK clients that throw on empty keys at module scope (this breaks `next build`).

## 6. Known-broken or unfinished areas (do not assume they work)

| Area | State |
|---|---|
| Daily cron (Engine B) | Never sends (product key mismatch). Aborts on `end` nodes (undefined write). Condition branch label mismatch |
| Scheduled sending | `status:'scheduled'` emails are only sent if someone POSTs `/api/cron/send-scheduled` |
| Reply-To | `settings.profile.replyToEmail` is passed as `reply_to`, which Resend SDK v6 ignores (it expects `replyTo`) |
| Campaign stats | Only `sent` is ever incremented, and only by send-scheduled |
| Notifications | UI exists. Nothing creates notifications |
| PendingActionsNotifier | Only requests browser notification permission. The alert is disabled |
| Settings → API keys | Saved to Firestore (publicly readable). Not used by any server code |
| Firebase Cloud Functions | Planned. `firebase.json` references a `functions/` dir that does not exist |
| Auto-format on upload | Not implemented. The import only saves leads |
| Lint | 90 errors / 33 warnings (`npx eslint .`). Typecheck is clean |

## 7. How to verify this document

```bash
npm run check:system     # static drift + invariant checks (no network)
npx tsc --noEmit         # types
BASE_URL=http://localhost:3000 npm run eval   # live AI evals (needs keys, costs quota)
```

If you change behavior described here, update this file in the same PR. `check:system` flags documented routes or versions that no longer exist.
