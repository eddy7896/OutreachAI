import { NextResponse, type NextRequest } from 'next/server';
import { AuthNotConfiguredError, SESSION_COOKIE, isPublicPath } from '@/lib/auth/config';
import { verifySession } from '@/lib/auth/session';

/**
 * Requires a valid company session for every page and API route except the
 * public ones in isPublicPath(). This is the coarse gate; route handlers also
 * check with requireUser().
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith('/api/');
  let user;
  try {
    user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    if (error instanceof AuthNotConfiguredError) {
      // Fail closed, but say why instead of looping through /login.
      console.error(`Auth not configured: ${error.message}`);
      return isApi
        ? NextResponse.json({ error: 'Sign-in is not configured on this server' }, { status: 503 })
        : new NextResponse('Sign-in is not configured on this server. Set FIREBASE_SERVICE_ACCOUNT and ALLOWED_EMAIL_DOMAINS.', { status: 503 });
    }
    throw error;
  }

  if (user) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const loginUrl = new URL('/login', req.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  const res = NextResponse.redirect(loginUrl);
  if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE); // expired or invalid
  return res;
}

export const config = {
  // Skip framework assets and static files; everything else goes through the gate.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)'],
};
