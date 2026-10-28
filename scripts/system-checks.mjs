#!/usr/bin/env node
/**
 * Static system checks: drift between docs/config and code, and cross-module
 * invariants that the type system cannot catch (string-keyed contracts).
 *
 * Usage:  node scripts/system-checks.mjs [--json] [--baseline <file>] [--write-baseline <file>]
 * Exit:   1 if any ERROR-level finding (not listed in --baseline), else 0.
 *
 * No dependencies; reads the repo from disk only. See docs/SYSTEM_CHECKS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const asJson = process.argv.includes('--json');
const baselinePath = argValue('--baseline');
const writeBaselinePath = argValue('--write-baseline');
const findings = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const add = (level, id, message, where = '') => findings.push({ level, id, message, where });

function walk(dir, filter) {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, filter));
    else if (filter(rel)) out.push(rel);
  }
  return out;
}

const srcFiles = walk('src', (f) => /\.(ts|tsx)$/.test(f));
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// ---------------------------------------------------------------------------
// 1. API route inventory
// ---------------------------------------------------------------------------
const routes = {};
for (const file of srcFiles.filter((f) => f.endsWith('route.ts') && f.includes(`${path.sep}api${path.sep}`))) {
  const urlPath = '/' + path.dirname(file).split(path.sep).slice(2).join('/'); // drop "src/app"
  const text = read(file);
  const methods = [...text.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
  routes[urlPath] = { file, methods, text };
}

// ---------------------------------------------------------------------------
// 2. Documented API routes must exist (docs that claim to describe the system)
// ---------------------------------------------------------------------------
const DOCS = ['README.md', 'SYSTEM_CONTEXT.md', 'MEMORY.md', 'docs/SYSTEM_CONTEXT.md', 'docs/SYSTEM_ARCHITECTURE.md'];
const CANONICAL_DOCS = new Set(['docs/SYSTEM_CONTEXT.md', 'docs/SYSTEM_ARCHITECTURE.md']);
for (const doc of DOCS.filter(exists)) {
  const text = read(doc);
  const seen = new Set();
  // Skip host-qualified URLs (e.g. https://openrouter.ai/api/v1) and [param] patterns.
  for (const m of text.matchAll(/(?<![\w.])(\/api\/[a-z0-9\-/[\]]+)/gi)) {
    const route = m[1].replace(/\/$/, '');
    if (seen.has(route) || route.includes('[')) continue;
    seen.add(route);
    if (!routes[route]) {
      add(CANONICAL_DOCS.has(doc) ? 'ERROR' : 'WARN', 'DOC_ROUTE_MISSING',
        `${doc} references ${route}, which has no route handler`, `${doc}:${lineOf(text, m.index)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Vercel cron targets must exist and accept GET (Vercel invokes crons via GET)
// ---------------------------------------------------------------------------
if (exists('vercel.json')) {
  const vercel = JSON.parse(read('vercel.json'));
  for (const cron of vercel.crons || []) {
    const r = routes[cron.path];
    if (!r) add('ERROR', 'CRON_ROUTE_MISSING', `vercel.json cron ${cron.path} has no handler`, 'vercel.json');
    else if (!r.methods.includes('GET')) add('ERROR', 'CRON_METHOD', `vercel.json cron ${cron.path} does not export GET`, r.file);
    else add('INFO', 'CRON_SCHEDULE', `cron ${cron.path} runs on "${cron.schedule}"`, 'vercel.json');
  }
  const scheduled = new Set((vercel.crons || []).map((c) => c.path));
  for (const route of Object.keys(routes).filter((r) => r.startsWith('/api/cron/'))) {
    if (!scheduled.has(route)) {
      add('WARN', 'CRON_UNSCHEDULED', `${route} lives under /api/cron but no scheduler invokes it`, routes[route].file);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Internal fetch() calls must target an existing route + method
// ---------------------------------------------------------------------------
for (const file of srcFiles) {
  const text = read(file);
  for (const m of text.matchAll(/fetch\(\s*[`'"](?:\$\{[^}]+\})?(\/api\/[a-z0-9\-/]+)[^`'"]*[`'"]\s*(?:,\s*\{([\s\S]{0,200}?)\})?/gi)) {
    const route = m[1];
    const method = (/method:\s*['"](\w+)['"]/.exec(m[2] || '') || [, 'GET'])[1].toUpperCase();
    const r = routes[route];
    if (!r) add('ERROR', 'FETCH_ROUTE_MISSING', `fetch to ${route} has no handler`, `${file}:${lineOf(text, m.index)}`);
    else if (!r.methods.includes(method)) add('ERROR', 'FETCH_METHOD', `${method} ${route} but handler exports ${r.methods.join(',')}`, `${file}:${lineOf(text, m.index)}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Environment variables: used vs documented in README
// ---------------------------------------------------------------------------
const usedEnv = new Map();
for (const file of srcFiles) {
  for (const m of read(file).matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (m[1] === 'NODE_ENV') continue;
    if (!usedEnv.has(m[1])) usedEnv.set(m[1], file);
  }
}
const readme = exists('README.md') ? read('README.md') : '';
const documentedEnv = new Set([...readme.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
for (const [name, file] of usedEnv) {
  if (!documentedEnv.has(name)) add('WARN', 'ENV_UNDOCUMENTED', `${name} is read by code but not in README env block`, file);
}
for (const name of documentedEnv) {
  if (!usedEnv.has(name)) add('WARN', 'ENV_UNUSED', `${name} is documented in README but never read in src/`, 'README.md');
}

// ---------------------------------------------------------------------------
// 6. Sequence branch labels: what the builder writes vs what engines read
// ---------------------------------------------------------------------------
const builderFile = 'src/components/sequences/SequenceBuilder.tsx';
if (exists(builderFile)) {
  const builder = read(builderFile);
  const written = new Set([...builder.matchAll(/handleAddChild\([^,]+,\s*'([^']+)'\)/g)].map((m) => m[1]));
  const def = /branchLabel:\s*string\s*=\s*'([^']+)'/.exec(builder);
  if (def) written.add(def[1]);
  for (const file of srcFiles.filter((f) => f.includes(`${path.sep}cron${path.sep}`))) {
    const text = read(file);
    for (const m of text.matchAll(/branchLabel(\.toLowerCase\(\))?\s*===\s*'([^']+)'/g)) {
      const lower = !!m[1];
      const label = m[2];
      const ok = [...written].some((w) => (lower ? w.toLowerCase() : w) === label);
      if (!ok) {
        add('ERROR', 'BRANCH_LABEL', `engine matches branchLabel "${label}" but SequenceBuilder only writes [${[...written].join(', ')}]`,
          `${file}:${lineOf(text, m.index)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Campaign.targetProduct key: name (as written by CampaignForm) vs id lookups
// ---------------------------------------------------------------------------
const formFile = 'src/components/campaigns/CampaignForm.tsx';
if (exists(formFile)) {
  const storesName = /<MenuItem key=\{p\.id\} value=\{p\.name\}/.test(read(formFile));
  for (const file of srcFiles) {
    const text = read(file);
    for (const m of text.matchAll(/p\.id\s*===\s*campaign\.targetProduct/g)) {
      if (storesName) add('ERROR', 'PRODUCT_KEY', 'campaign.targetProduct holds a product NAME (CampaignForm) but is compared to p.id', `${file}:${lineOf(text, m.index)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Placeholder syntax: AI template prompt vs resolver
// ---------------------------------------------------------------------------
if (exists('src/utils/placeholders.ts') && routes['/api/generate-template']) {
  const resolver = new Set([...read('src/utils/placeholders.ts').matchAll(/'(\{\{[a-z_]+\}\})'/g)].map((m) => m[1]));
  const prompt = routes['/api/generate-template'].text;
  const emitted = new Set([...prompt.matchAll(/(\{\{[A-Za-z_]+\}\})\s*-/g)].map((m) => m[1]));
  const unresolved = [...emitted].filter((p) => !resolver.has(p));
  if (unresolved.length) {
    add('ERROR', 'PLACEHOLDER_SYNTAX', `AI templates emit ${unresolved.join(', ')} which resolvePlaceholders() does not resolve (it expects ${[...resolver].slice(0, 3).join(', ')}, ...)`,
      routes['/api/generate-template'].file);
  }
}

// ---------------------------------------------------------------------------
// 9. Firestore writes of `undefined` (client SDK rejects them at runtime)
// ---------------------------------------------------------------------------
const ignoresUndefined = srcFiles.some((f) => read(f).includes('ignoreUndefinedProperties'));
if (!ignoresUndefined) {
  for (const file of srcFiles) {
    const text = read(file);
    for (const m of text.matchAll(/(updateDocument|createDocument|updateDoc|addDoc|setDoc)\(([\s\S]{0,400}?)\}\s*\)/g)) {
      const u = /(\w+):\s*(?:[\w.?]+\s*\|\|\s*)?undefined\b/.exec(m[2]);
      if (u) add('ERROR', 'FIRESTORE_UNDEFINED', `${m[1]}() writes ${u[1]}: undefined; Firestore throws "Unsupported field value: undefined"`, `${file}:${lineOf(text, m.index)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 10. Prompt / enum consistency
// ---------------------------------------------------------------------------
const promptDefs = srcFiles.filter((f) => /const CLASSIFICATION_PROMPT\s*=/.test(read(f)));
if (promptDefs.length > 1) add('WARN', 'PROMPT_DUPLICATED', `CLASSIFICATION_PROMPT is defined in ${promptDefs.length} files; copies can drift`, promptDefs.join(', '));
if (exists('src/types/index.ts') && promptDefs.length) {
  const types = read('src/types/index.ts');
  const enumMatch = /intent\?:\s*([^;]+);/.exec(types);
  const typeIntents = new Set(enumMatch ? [...enumMatch[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]) : []);
  for (const file of promptDefs) {
    const promptIntents = new Set([...read(file).matchAll(/\d\.\s*"([A-Z_]+)"/g)].map((m) => m[1]));
    const diff = [...promptIntents].filter((i) => !typeIntents.has(i)).concat([...typeIntents].filter((i) => !promptIntents.has(i)));
    if (diff.length) add('ERROR', 'INTENT_ENUM', `intent labels differ between prompt and Email.intent type: ${diff.join(', ')}`, file);
  }
}
for (const file of promptDefs) {
  const text = read(file);
  if (/generateWithFallback\(prompt, true\)/.test(text) && !/INTENTS|includes\(.*intent|VALID_INTENTS/.test(text)) {
    add('WARN', 'LLM_OUTPUT_UNVALIDATED', 'LLM JSON is returned/stored without checking intent is one of the allowed labels', file);
  }
}

// ---------------------------------------------------------------------------
// 11. Build-time hazards and unauthenticated server endpoints
// ---------------------------------------------------------------------------
for (const file of srcFiles) {
  const text = read(file);
  const m = /^(?:export )?const \w+ = new Resend\(/m.exec(text);
  if (m) add('WARN', 'BUILD_ENV_REQUIRED', 'Resend client constructed at module scope; `next build` fails when RESEND_API_KEY is unset (use getResend())', `${file}:${lineOf(text, m.index)}`);
  // Resend SDK v6 reads camelCase options; snake_case keys are silently dropped.
  for (const s of text.matchAll(/\b(reply_to|scheduled_at)\s*:/g)) {
    add('ERROR', 'RESEND_OPTION_KEY', `${s[1]} is ignored by the Resend SDK (use ${s[1] === 'reply_to' ? 'replyTo' : 'scheduledAt'})`, `${file}:${lineOf(text, s.index)}`);
  }
}
// With src/proxy.ts, every route except the public list in src/lib/auth/config.ts needs a
// session. Public routes must authenticate callers themselves.
const hasProxy = exists('src/proxy.ts') && exists('src/lib/auth/config.ts');
const publicBlock = hasProxy ? /PUBLIC_EXACT = new Set\(\[([\s\S]*?)\]\)/.exec(read('src/lib/auth/config.ts')) : null;
const publicPaths = new Set(publicBlock ? [...publicBlock[1].matchAll(/'(\/[^']*)'/g)].map((m) => m[1]) : []);
const INTENTIONALLY_OPEN = new Set(['/api/track']); // tracking pixel fetched by email clients
for (const [route, r] of Object.entries(routes)) {
  const ownAuth = /authorization|verifyWebhookSignature|verifyIdToken|requireUser\(/i.test(r.text);
  const label = `${r.methods.join(',')} ${route}`;
  if (hasProxy && !publicPaths.has(route)) {
    if (!ownAuth) add('INFO', 'ROUTE_PROXY_ONLY', `${label} relies on the proxy alone; add requireUser() in the handler`, r.file);
  } else if (!ownAuth && !INTENTIONALLY_OPEN.has(route)) {
    const level = hasProxy || /\/api\/(send|cron|enrich|leads)/.test(route) ? 'WARN' : 'INFO';
    add(level, 'ROUTE_NO_AUTH', `${label} is public and performs no caller authentication`, r.file);
  }
}

// Server code must call shared functions (src/lib/*), not the app's own API over HTTP:
// internal requests carry no user session and are rejected once routes require sign-in.
for (const file of srcFiles.filter((f) => f.includes(`${path.sep}api${path.sep}`) && !/\.test\.ts$/.test(f))) {
  const text = read(file);
  for (const m of text.matchAll(/fetch\(\s*`\$\{[^}]+\}(\/api\/[a-z0-9\-/]+)/gi)) {
    add('ERROR', 'INTERNAL_HTTP_CALL', `server code calls ${m[1]} over HTTP; import the shared function instead`, `${file}:${lineOf(text, m.index)}`);
  }
}

// Stored HTML (inbound email, signatures) is attacker-controlled: it must pass through sanitizeHtml().
for (const file of srcFiles) {
  const text = read(file);
  for (const m of text.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+?)\s*\}\}/g)) {
    if (!/^sanitizeHtml\(/.test(m[1])) {
      add('ERROR', 'UNSANITIZED_HTML', `dangerouslySetInnerHTML renders ${m[1]} without sanitizeHtml()`, `${file}:${lineOf(text, m.index)}`);
    }
  }
}

// Runtime Node version: every direct dependency's minimum must fit package.json "engines".
// (Vercel picks Node from engines; firebase-admin 14 needs >=22 for require() of ESM-only jose.)
{
  const rootPkg = JSON.parse(read('package.json'));
  const declared = rootPkg.engines?.node;
  const declaredMajor = Number(/(\d+)/.exec(declared || '')?.[1]);
  if (!declared) add('ERROR', 'NODE_ENGINE', 'package.json has no "engines.node"; the host may run an older Node than dependencies need', 'package.json');
  for (const dep of Object.keys(rootPkg.dependencies || {})) {
    const depPkgPath = `node_modules/${dep}/package.json`;
    if (!exists(depPkgPath)) continue;
    const need = JSON.parse(read(depPkgPath)).engines?.node;
    const needMajor = Number(/>=\s*(\d+)/.exec(need || '')?.[1]);
    if (declared && needMajor && declaredMajor < needMajor) {
      add('ERROR', 'NODE_ENGINE', `${dep} requires node ${need} but package.json engines.node is "${declared}"`, 'package.json');
    }
  }
}

// ---------------------------------------------------------------------------
// 12. Hard-coded model identifiers (review for deprecation / availability)
// ---------------------------------------------------------------------------
for (const file of srcFiles) {
  const text = read(file);
  for (const m of text.matchAll(/'((?:gemini-[\w.-]+)|(?:[\w-]+\/[\w.-]+:free)|openrouter\/free)'/g)) {
    add('INFO', 'MODEL_PINNED', `hard-coded model id ${m[1]}`, `${file}:${lineOf(text, m.index)}`);
  }
}

// ---------------------------------------------------------------------------
// 13. Stated framework versions vs package.json
// ---------------------------------------------------------------------------
const pkg = JSON.parse(read('package.json'));
const major = (v) => (v || '').replace(/^[^\d]*/, '').split('.')[0];
const actual = { 'Next.js': major(pkg.dependencies.next), MUI: major(pkg.dependencies['@mui/material']) };
for (const doc of DOCS.filter(exists)) {
  const text = read(doc);
  for (const m of text.matchAll(/Next\.js\]?\(?[^)\s]*\)?\s*(\d+)/g)) {
    if (m[1] !== actual['Next.js']) add(CANONICAL_DOCS.has(doc) ? 'ERROR' : 'WARN', 'VERSION_DRIFT', `${doc} says Next.js ${m[1]}, package.json has ${actual['Next.js']}`, `${doc}:${lineOf(text, m.index)}`);
  }
  for (const m of text.matchAll(/(?:MUI|Material UI)[^\n|]*?\bv(\d+)/g)) {
    if (m[1] !== actual.MUI) add(CANONICAL_DOCS.has(doc) ? 'ERROR' : 'WARN', 'VERSION_DRIFT', `${doc} says MUI v${m[1]}, package.json has v${actual.MUI}`, `${doc}:${lineOf(text, m.index)}`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const order = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.id.localeCompare(b.id));
const counts = findings.reduce((c, f) => ({ ...c, [f.level]: (c[f.level] || 0) + 1 }), {});

// Baseline: known ERRORs that are accepted until fixed. Keys ignore line numbers
// so unrelated edits don't invalidate them.
const keyOf = (f) => `${f.id}|${f.where.replace(/:\d+$/, '')}|${f.message}`;
const errorKeys = [...new Set(findings.filter((f) => f.level === 'ERROR').map(keyOf))].sort();

if (writeBaselinePath) {
  fs.writeFileSync(path.resolve(writeBaselinePath), JSON.stringify(errorKeys, null, 2) + '\n');
  console.log(`Wrote ${errorKeys.length} baseline entries to ${writeBaselinePath}`);
  process.exit(0);
}

let failing = findings.filter((f) => f.level === 'ERROR');
let fixed = [];
if (baselinePath) {
  const baseline = new Set(JSON.parse(fs.readFileSync(path.resolve(baselinePath), 'utf8')));
  failing = failing.filter((f) => !baseline.has(keyOf(f)));
  fixed = [...baseline].filter((k) => !errorKeys.includes(k));
}

if (asJson) {
  console.log(JSON.stringify({ counts, findings, newErrors: failing, fixedBaselineEntries: fixed }, null, 2));
} else {
  for (const f of findings) {
    const known = baselinePath && f.level === 'ERROR' && !failing.includes(f) ? ' (baseline)' : '';
    console.log(`${f.level.padEnd(5)} ${f.id.padEnd(22)} ${f.message}${f.where ? `  [${f.where}]` : ''}${known}`);
  }
  console.log(`\n${counts.ERROR || 0} error(s), ${counts.WARN || 0} warning(s), ${counts.INFO || 0} info`);
  if (baselinePath) {
    console.log(`${failing.length} new error(s) not in baseline ${baselinePath}`);
    if (fixed.length) {
      console.log(`${fixed.length} baseline entr${fixed.length === 1 ? 'y is' : 'ies are'} fixed; remove with --write-baseline ${baselinePath}:`);
      for (const k of fixed) console.log(`  - ${k}`);
    }
  }
}
process.exit(failing.length ? 1 : 0);
