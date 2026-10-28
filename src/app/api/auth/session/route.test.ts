import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthNotConfiguredError } from '@/lib/auth/config';

const verifyIdToken = vi.fn();
const createSessionCookie = vi.fn();
const getAdminAuth = vi.fn(() => ({ verifyIdToken, createSessionCookie }));
vi.mock('@/lib/firebaseAdmin', () => ({ getAdminAuth }));

const { POST, DELETE } = await import('./route');

const nowSeconds = () => Math.floor(Date.now() / 1000);
const token = (overrides: Record<string, unknown> = {}) => ({
  uid: 'u1',
  email: 'faheem@easyio.tech',
  email_verified: true,
  name: 'Faheem',
  auth_time: nowSeconds(),
  firebase: { sign_in_provider: 'google.com' },
  ...overrides,
});

const signIn = (body: unknown = { idToken: 'id-token' }, origin: string | null = 'https://outreach.example') =>
  POST(
    new Request('https://outreach.example/api/auth/session', {
      method: 'POST',
      headers: origin ? { origin, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.stubEnv('ALLOWED_EMAIL_DOMAINS', 'easyio.tech');
  getAdminAuth.mockClear();
  verifyIdToken.mockReset().mockResolvedValue(token());
  createSessionCookie.mockReset().mockResolvedValue('session-cookie-value');
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/auth/session', () => {
  it('sets an httpOnly session cookie for a fresh @easyio.tech Google sign-in', async () => {
    const res = await signIn();

    expect(res.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith('id-token', true);
    expect(createSessionCookie).toHaveBeenCalledWith('id-token', { expiresIn: 5 * 24 * 60 * 60 * 1000 });
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/^__session=session-cookie-value;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it.each([
    ['another domain', { email: 'someone@gmail.com' }],
    ['a look-alike domain', { email: 'x@evil-easyio.tech' }],
    ['an unverified email', { email_verified: false }],
    ['a non-Google provider', { firebase: { sign_in_provider: 'password' } }],
  ])('refuses %s with 403 and no cookie', async (_label, overrides) => {
    verifyIdToken.mockResolvedValue(token(overrides));
    const res = await signIn();
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it('names the allowed domain in the refusal', async () => {
    verifyIdToken.mockResolvedValue(token({ email: 'someone@gmail.com' }));
    expect((await (await signIn()).json()).error).toBe('Only @easyio.tech accounts can sign in');
  });

  it('refuses a sign-in older than five minutes', async () => {
    verifyIdToken.mockResolvedValue(token({ auth_time: nowSeconds() - 10 * 60 }));
    const res = await signIn();
    expect(res.status).toBe(401);
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it('refuses an invalid or revoked ID token', async () => {
    verifyIdToken.mockRejectedValue(new Error('auth/id-token-revoked'));
    expect((await signIn()).status).toBe(401);
  });

  it.each([
    ['another origin', 'https://evil.example'],
    ['no Origin header', null],
  ])('rejects %s (login CSRF)', async (_label, origin) => {
    const res = await signIn({ idToken: 'id-token' }, origin);
    expect(res.status).toBe(403);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('returns 400 without an ID token', async () => {
    expect((await signIn({})).status).toBe(400);
  });

  it('returns 503 when auth is not configured', async () => {
    vi.stubEnv('ALLOWED_EMAIL_DOMAINS', '');
    expect((await signIn()).status).toBe(503);

    vi.stubEnv('ALLOWED_EMAIL_DOMAINS', 'easyio.tech');
    getAdminAuth.mockImplementationOnce(() => {
      throw new AuthNotConfiguredError('FIREBASE_SERVICE_ACCOUNT is not configured');
    });
    expect((await signIn()).status).toBe(503);
  });
});

describe('DELETE /api/auth/session', () => {
  it('clears the session cookie', async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/^__session=;.*Max-Age=0/i);
  });
});
