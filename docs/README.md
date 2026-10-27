# Outreach AI: System Documentation

Start with **SYSTEM_CONTEXT** (what is true now), then **SYSTEM_ARCHITECTURE** (how it fits together), then **SYSTEM_ANALYSIS** (what is wrong and what to do).

| Document | Purpose |
|---|---|
| [SYSTEM_CONTEXT.md](./SYSTEM_CONTEXT.md) | Canonical, as-built context: stack, vocabulary, entry points, invariants, known-broken areas. Supersedes root `SYSTEM_CONTEXT.md` / `MEMORY.md` |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | C4 context and container diagrams, data model, API catalogue, runtime sequence diagrams, AI engine, deployment |
| [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md) | Comprehensive assessment: scorecard, verified defects, security posture, AI and reliability review, roadmap |
| [DRIFT_REPORT.md](./DRIFT_REPORT.md) | Doc → code, code → code and config → code drift, with severities and automated-detection mapping |
| [HALLUCINATION_CHECKS.md](./HALLUCINATION_CHECKS.md) | LLM fabrication and integrity risks, implemented checks, runtime guardrails, false claims in docs |
| [SYSTEM_EVALS.md](./SYSTEM_EVALS.md) | Eval datasets, metrics, gates, how to run and extend |
| [SYSTEM_CHECKS.md](./SYSTEM_CHECKS.md) | Static check inventory, baseline results, CI recipe, operational checklist |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased, PR-sized fix plan with decisions, acceptance criteria and test plan |

## Tooling added

| Command | What it does |
|---|---|
| `npm run check:system` | `scripts/system-checks.mjs`: static drift and contract checks. No network. Exits 1 on errors |
| `npm run eval` | `scripts/run-evals.mjs`: live intent-classification and generation-grounding evals against `BASE_URL` |

Datasets: `evals/intent-classification.jsonl` (26 labeled replies incl. prompt-injection cases), `evals/generation-fixtures.json` (3 lead/product fixtures).
