// Auth rules shared by the proxy, route handlers and tests. No Firebase imports here.

export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (Firebase allows 5 min to 14 days)
/** A session cookie may only be minted from a sign-in this recent. */
export const RECENT_SIGN_IN_MS = 5 * 60 * 1000;

export class AuthNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthNotConfiguredError';
  }
}

/** Domains from ALLOWED_EMAIL_DOMAINS, e.g. "easyio.tech" or "easyio.tech,partner.com". */
export function allowedDomains(raw = process.env.ALLOWED_EMAIL_DOMAINS): string[] {
  return (raw || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Exact domain match only: "evil-easyio.tech" and "easyio.tech.evil.com" are rejected. */
export function isAllowedEmail(email: string | undefined | null, domains: string[] = allowedDomains()): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  return domains.includes(email.slice(at + 1).toLowerCase());
}

// Reachable without a session. Each of these authenticates its callers in its own way.
const PUBLIC_EXACT = new Set([
  '/login',
  '/api/auth/session', // creates and clears the session itself
  '/api/webhook/inbound', // Resend signature
  '/api/track', // tracking pixel loaded by email clients
  '/api/leads/import', // Chrome extension key
  '/api/cron/sequences', // CRON_SECRET bearer token
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname.replace(/\/+$/, '') || '/');
}

/** Only same-site relative paths are allowed as post-login redirects (no open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) return '/';
  return next;
}
