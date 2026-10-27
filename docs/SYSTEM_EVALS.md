# System Evals

> How to measure whether the AI-dependent parts of Outreach AI behave correctly, and when a change is safe to ship. Evals cover the **probabilistic** parts (LLM). Deterministic logic is covered by [SYSTEM_CHECKS.md](./SYSTEM_CHECKS.md) and the unit tests recommended below.

---

## 1. What we evaluate and why

| Capability | Route | Failure cost | Eval suite |
|---|---|---|---|
| Reply intent classification | `/api/classify` (same prompt as `/api/webhook/inbound`) | Wrong CRM state: interested leads marked `lost`, or follow-ups sent to people who said stop | `intent` |
| Cold email writing | `/api/auto-format` | Fabricated claims sent to prospects; generic or off-brand copy | `generation` |
| Template polishing | `/api/generate` | Same as above, plus placeholder leakage | `generation` (extend: §5) |
| Template authoring | `/api/generate-template` | Fabrication baked into reusable templates | manual rubric (§4) |

## 2. Running

```bash
npm run dev                                  # or point BASE_URL at a preview deploy
BASE_URL=http://localhost:3000 npm run eval  # all suites, 1 run
node scripts/run-evals.mjs --suite intent --runs 3      # stability
node scripts/run-evals.mjs --suite generation --json > eval-report.json
```

Exit code is `1` if any gate fails. Each run calls real providers: 26 classify calls + 3 generation calls per run.

**Pin the provider when evaluating.** `generateWithFallback` silently switches to fallback models on any Gemini error, so a "pass" can come from a different model than production normally uses. For a clean primary-model eval, leave `FALLBACK_*` unset. For a fallback eval, set `GEMINI_API_KEY=invalid` (as in `scratch/test-fallback.ts`). Record which one you ran.

## 3. Datasets

### 3.1 `evals/intent-classification.jsonl` (26 cases)
| Slice | Count | Purpose |
|---|---|---|
| `pos-*` | 4 | Meeting/demo requests |
| `info-*` | 4 | Pricing, comparison, integration questions |
| `neg-*` | 4 | Rejections, unsubscribes |
| `ooo-*` | 3 | Auto-replies, leave notices |
| `bounce-*` | 3 | DSN / 550 / mailbox full |
| `unk-*` | 2 | Empty (API contract: expects HTTP 400), gibberish |
| `edge-*` | 3 | Mixed signals: "not now, send info", OOO + yes, left company |
| `inj-*` | 3 | Prompt injection embedded in replies (adversarial) |

Schema: `{"id", "expected", "action_required", "text", "adversarial"?, "expect_http"?}`.

**Labeling policy** (keep consistent when adding cases):
- Any explicit request to schedule → `POSITIVE_INTEREST`, even inside an OOO.
- A question or "send more" without commitment → `MORE_INFO_REQUESTED`.
- "Left the company" / "wrong person, don't contact" → `NOT_INTERESTED`.
- Delivery failure of any kind, including mailbox full → `BOUNCE`.
- `action_required` is true only for `POSITIVE_INTEREST` and `MORE_INFO_REQUESTED`.

**Growing the set:** export real inbound emails (`emails` where `direction=='inbound'`), redact PII, have a human label them, and append. Aim for ≥ 30 per class. Keep the adversarial slice at ≥ 10%.

### 3.2 `evals/generation-fixtures.json` (3 fixtures)
Logistics VP (rich context), healthcare CTO (compliance-bait industry with **no** compliance facts provided), and sparse context (stress test for padding with fabrication).

## 4. Metrics & gates

### Intent suite
| Metric | Definition | Gate |
|---|---|---|
| `accuracy` | exact label match on labeled cases | ≥ 0.85 |
| `schemaValid` | HTTP 200, `intent` ∈ enum, `summary` string, `action_required` boolean | = 1.0 |
| `hallucinatedLabels` | count of labels outside the enum | = 0 |
| `adversarialPass` | accuracy on `inj-*` | = 1.0 |
| `consistency` | same label across `--runs N` | ≥ 0.90 |
| `actionRequiredAgreement` | matches labeled `action_required` | reported (target ≥ 0.9) |
| `httpContractPass` | empty input → 400 | = 1.0 |
| confusion matrix | expected → got | review the `POSITIVE↔NOT_INTERESTED` cell; any count there is a release blocker |

### Generation suite (per sample; suite passes at 100%)
| Check | Definition |
|---|---|
| `contract` | HTTP 200 with string `subject` and `body` |
| `underWordLimit` | stripped body ≤ 150 words (the prompt's own promise) |
| `noPlaceholderLeak` | no `{{…}}` or `[Name]`/`[Company]`/`[Your Name]` |
| `mentionsProspect` / `mentionsProduct` | personalization actually happened |
| `grounding` | no unsupported figures, compliance/award claims, or fabricated social proof (see [HALLUCINATION_CHECKS.md](./HALLUCINATION_CHECKS.md)) |

The grounding checks are deliberately **high-recall heuristics**. A flag means "a human must look", not "definitely false". Tune `CLAIM_TERMS` and the number regex in `run-evals.mjs` as false positives appear.

### Human rubric (template authoring and periodic spot checks)
Score 10 random generated emails per release, 1–5 each: **Relevance** (uses lead industry/role), **Accuracy** (no unsupported claims, hard fail), **Clarity**, **CTA** (single, low-friction), **Tone**. Ship if mean ≥ 4 and zero accuracy failures.

## 5. Extending the evals

| Gap | Suggested addition |
|---|---|
| `/api/generate` polishing | Fixtures with a template containing `{{first_name}}` *and* `{{firstName}}`. Assert no leakage and that the core message is preserved (embedding similarity or keyword overlap with the template) |
| Webhook routing | Unit-test the intent → `lead.status` mapping with a pure function extracted from `webhook/inbound` |
| Fallback parity | Run the intent suite with Gemini forced off and compare per-class accuracy. Block if any class drops > 10 pts |
| Latency SLO | Gate p95 classify latency < 8 s (route `maxDuration` is 60 s on the webhook) |
| Regression tracking | Commit `--json` output under `evals/results/<date>-<model>.json` and diff accuracy between runs |
| LLM-as-judge grounding | Second-pass judge prompt: "List every factual claim in EMAIL not supported by CONTEXT". Use as a complement to the regex heuristics, not a replacement |

## 6. Deterministic logic that needs unit tests (not evals)

No test runner is configured. Adding `vitest` would cover these pure functions cheaply:

| Unit | Cases |
|---|---|
| `lib/scheduling.getNextValidSendTime` | before window → start hour same day; inside window → now; after window → next allowed day; weekend skip; DST boundary; empty `days` (currently returns `now`, likely a bug) |
| `utils/placeholders.resolvePlaceholders` | all keys, repeated keys, missing fields, camelCase tokens (currently unresolved) |
| `utils/excelParser` header mapping | Substring matching: `"first"` also matches a `"First Contact Date"` column and `"last"` matches `"Last Contacted"`, whichever comes first wins. Missing email column error |
| Sequence engine (after extraction) | delay not elapsed/elapsed; condition yes/no; end node; invalid node; terminal statuses; A/B split determinism with a seeded RNG |
| `lib/ai` JSON extraction | fenced JSON, prose + JSON, two JSON objects (greedy regex merges them, so the parse fails) |
