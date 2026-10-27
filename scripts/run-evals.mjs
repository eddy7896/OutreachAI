#!/usr/bin/env node
/**
 * Live evals against a running instance (npm run dev / a preview deploy).
 * Calls real AI providers, so it costs quota. See docs/SYSTEM_EVALS.md.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/run-evals.mjs [--suite intent|generation|all] [--runs 3] [--json]
 *
 * Exit: 1 if any suite misses its gate, else 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const SUITE = arg('suite', 'all');
const RUNS = Number(arg('runs', '1'));
const asJson = process.argv.includes('--json');

const INTENTS = ['POSITIVE_INTEREST', 'MORE_INFO_REQUESTED', 'NOT_INTERESTED', 'OUT_OF_OFFICE', 'BOUNCE', 'UNKNOWN'];
const GATES = {
  intentAccuracy: 0.85,
  intentSchemaValid: 1.0,
  intentAdversarialPass: 1.0,
  intentConsistency: 0.9,
  generationPass: 1.0,
};

async function post(route, body) {
  const started = Date.now();
  const res = await fetch(`${BASE_URL}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  return { status: res.status, data, ms: Date.now() - started };
}

// ---------------------------------------------------------------------------
// Intent classification: accuracy, schema validity, adversarial robustness, stability
// ---------------------------------------------------------------------------
async function intentSuite() {
  const cases = fs.readFileSync(path.join(ROOT, 'evals/intent-classification.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const rows = [];
  const confusion = {};

  for (const c of cases) {
    const outputs = [];
    for (let r = 0; r < RUNS; r++) outputs.push(await post('/api/classify', { emailText: c.text }));

    if (c.expect_http) {
      rows.push({ id: c.id, pass: outputs.every((o) => o.status === c.expect_http), detail: `HTTP ${outputs.map((o) => o.status).join(',')}` });
      continue;
    }

    const first = outputs[0];
    const d = first.data || {};
    const schemaValid = first.status === 200 && INTENTS.includes(d.intent) && typeof d.summary === 'string' && typeof d.action_required === 'boolean';
    const correct = d.intent === c.expected;
    const actionOk = d.action_required === c.action_required;
    const labels = outputs.map((o) => o.data?.intent);
    const consistent = labels.every((l) => l === labels[0]);
    const hallucinatedLabel = first.status === 200 && !INTENTS.includes(d.intent);

    confusion[c.expected] ??= {};
    confusion[c.expected][d.intent ?? `HTTP_${first.status}`] = (confusion[c.expected][d.intent ?? `HTTP_${first.status}`] || 0) + 1;
    rows.push({ id: c.id, adversarial: !!c.adversarial, expected: c.expected, got: d.intent, schemaValid, correct, actionOk, consistent, hallucinatedLabel, ms: first.ms });
  }

  const scored = rows.filter((r) => r.expected);
  const rate = (xs, k) => (xs.length ? xs.filter((x) => x[k]).length / xs.length : 1);
  const adversarial = scored.filter((r) => r.adversarial);
  const metrics = {
    cases: rows.length,
    accuracy: rate(scored, 'correct'),
    schemaValid: rate(scored, 'schemaValid'),
    actionRequiredAgreement: rate(scored, 'actionOk'),
    adversarialPass: rate(adversarial, 'correct'),
    consistency: RUNS > 1 ? rate(scored, 'consistent') : null,
    hallucinatedLabels: scored.filter((r) => r.hallucinatedLabel).length,
    httpContractPass: rate(rows.filter((r) => !r.expected), 'pass'),
    p50ms: scored.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(scored.length / 2)] ?? null,
  };
  const pass = metrics.accuracy >= GATES.intentAccuracy
    && metrics.schemaValid >= GATES.intentSchemaValid
    && metrics.adversarialPass >= GATES.intentAdversarialPass
    && (metrics.consistency === null || metrics.consistency >= GATES.intentConsistency)
    && metrics.httpContractPass === 1;
  return { suite: 'intent', pass, metrics, confusion, failures: rows.filter((r) => r.expected ? !r.correct || !r.schemaValid : !r.pass) };
}

// ---------------------------------------------------------------------------
// Generation: contract, length, placeholder leakage, grounding (hallucination heuristics)
// ---------------------------------------------------------------------------
const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const CLAIM_TERMS = ['HIPAA', 'SOC 2', 'SOC2', 'HITRUST', 'ISO 27001', 'GDPR', 'award', 'Fortune 500', 'guarantee'];

function groundingIssues(text, fixture) {
  const context = JSON.stringify(fixture).toLowerCase();
  const issues = [];
  // Numbers / percentages / money that do not appear anywhere in the supplied context
  for (const m of text.matchAll(/(?:\$\s?)?\d[\d,.]*\s?(?:%|x\b|percent|hours?|days?|minutes?)?/gi)) {
    const token = m[0].trim();
    const digits = token.replace(/[^\d.]/g, '');
    if (digits && !context.includes(digits) && !/^\d{1,2}$/.test(token)) issues.push(`unsupported figure "${token}"`);
  }
  for (const term of CLAIM_TERMS) {
    if (text.toLowerCase().includes(term.toLowerCase()) && !context.includes(term.toLowerCase())) issues.push(`unsupported claim "${term}"`);
  }
  // Customer/case-study name-drops are a common fabrication
  if (/\b(we (recently )?helped|customers? like|clients? such as|companies like)\b/i.test(text)) issues.push('possible fabricated case study / name-drop');
  return issues;
}

async function generationSuite() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals/generation-fixtures.json'), 'utf8'));
  const rows = [];
  for (const f of fixtures) {
    for (let r = 0; r < RUNS; r++) {
      const { status, data, ms } = await post('/api/auto-format', { lead: f.lead, productContext: f.productContext });
      const body = stripHtml(data?.body);
      const words = body ? body.split(' ').length : 0;
      const checks = {
        contract: status === 200 && typeof data?.subject === 'string' && typeof data?.body === 'string',
        underWordLimit: words <= 150,
        noPlaceholderLeak: !/\{\{[^}]+\}\}|\[(?:Name|Company|Your Name)[^\]]*\]/i.test(`${data?.subject} ${data?.body}`),
        mentionsProspect: body.includes(f.lead.firstName) || body.includes(f.lead.company),
        mentionsProduct: body.includes(f.productContext.name),
      };
      const grounding = groundingIssues(`${data?.subject || ''} ${body}`, f);
      rows.push({ id: f.id, run: r + 1, ms, words, ...checks, grounding, pass: Object.values(checks).every(Boolean) && grounding.length === 0 });
    }
  }
  const passRate = rows.filter((r) => r.pass).length / rows.length;
  return {
    suite: 'generation',
    pass: passRate >= GATES.generationPass,
    metrics: { samples: rows.length, passRate, groundingFlags: rows.reduce((n, r) => n + r.grounding.length, 0) },
    failures: rows.filter((r) => !r.pass),
  };
}

const results = [];
if (SUITE === 'all' || SUITE === 'intent') results.push(await intentSuite());
if (SUITE === 'all' || SUITE === 'generation') results.push(await generationSuite());

if (asJson) {
  console.log(JSON.stringify({ baseUrl: BASE_URL, runs: RUNS, gates: GATES, results }, null, 2));
} else {
  for (const r of results) {
    console.log(`\n=== ${r.suite} ${r.pass ? 'PASS' : 'FAIL'}`);
    console.log(r.metrics);
    if (r.confusion) console.log('confusion (expected -> got):', r.confusion);
    for (const f of r.failures) console.log('  x', JSON.stringify(f));
  }
}
process.exit(results.every((r) => r.pass) ? 0 : 1);
