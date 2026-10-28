import { getAdminAuth } from '@/lib/firebaseAdmin';
import { AuthNotConfiguredError, SESSION_COOKIE, allowedDomains, isAllowedEmail } from './config';

export type SessionUser = { uid: string; email: string; name?: string; picture?: string };

/**
 * Verifies a Firebase session cookie (signature and expiry, against Google's
 * cached public keys; no database call) and re-applies the domain rule.
 * Returns null for a missing, expired, forged or out-of-domain session.
 * Throws AuthNotConfiguredError when the server can't verify anything at all.
 */
export async function verifySession(cookieValue: string | undefined): Promise<SessionUser | null> {
  const domains = allowedDomains();
  if (domains.length === 0) throw new AuthNotConfiguredError('ALLOWED_EMAIL_DOMAINS is not configured');
  const auth = getAdminAuth(); // throws AuthNotConfiguredError without a service account
  if (!cookieValue) return null;

  try {
    const decoded = await auth.verifySessionCookie(cookieValue);
    if (!decoded.email_verified || !isAllowedEmail(decoded.email, domains)) return null;
    return { uid: decoded.uid, email: decoded.email!, name: decoded.name, picture: decoded.picture };
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/**
 * For route handlers: the signed-in user, or null. The proxy already blocks
 * anonymous requests, but handlers check again so a matcher change can't
 * silently expose them (see the Next.js auth guide on Route Handlers).
 */
export async function requireUser(req: Request): Promise<SessionUser | null> {
  return verifySession(readCookie(req, SESSION_COOKIE));
}
