import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import {
  AuthNotConfiguredError,
  RECENT_SIGN_IN_MS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  allowedDomains,
  isAllowedEmail,
} from '@/lib/auth/config';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Login CSRF: only accept session creation from this site's own pages.
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** Exchange a fresh Google sign-in (Firebase ID token) for an httpOnly session cookie. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }

  try {
    const domains = allowedDomains();
    if (domains.length === 0) throw new AuthNotConfiguredError('ALLOWED_EMAIL_DOMAINS is not configured');
    const auth = getAdminAuth();

    const { idToken } = await req.json().catch(() => ({}));
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired sign-in' }, { status: 401 });
    }

    if (decoded.firebase?.sign_in_provider !== 'google.com') {
      return NextResponse.json({ error: 'Sign in with Google' }, { status: 403 });
    }
    if (!decoded.email_verified || !isAllowedEmail(decoded.email, domains)) {
      const list = domains.map((d) => `@${d}`).join(', ');
      return NextResponse.json({ error: `Only ${list} accounts can sign in` }, { status: 403 });
    }
    if (Date.now() - decoded.auth_time * 1000 > RECENT_SIGN_IN_MS) {
      return NextResponse.json({ error: 'Sign-in is too old; please sign in again' }, { status: 401 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    const res = NextResponse.json({ success: true, user: { email: decoded.email, name: decoded.name ?? null } });
    res.cookies.set(SESSION_COOKIE, sessionCookie, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS / 1000 });
    return res;
  } catch (error: unknown) {
    if (error instanceof AuthNotConfiguredError) {
      console.error(`Sign-in unavailable: ${error.message}`);
      return NextResponse.json({ error: 'Sign-in is not configured on this server', reason: error.message }, { status: 503 });
    }
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

/** Sign out: clear the session cookie. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
