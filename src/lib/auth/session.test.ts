import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthNotConfiguredError } from './config';

const verifySessionCookie = vi.fn();
const getAdminAuth = vi.fn(() => ({ verifySessionCookie }));
vi.mock('@/lib/firebaseAdmin', () => ({ getAdminAuth }));

const { verifySession, requireUser } = await import('./session');

beforeEach(() => {
  vi.stubEnv('ALLOWED_EMAIL_DOMAINS', 'easyio.tech');
  getAdminAuth.mockClear();
  verifySessionCookie.mockReset().mockResolvedValue({ uid: 'u1', email: 'faheem@easyio.tech', email_verified: true, name: 'Faheem' });
});

afterEach(() => vi.unstubAllEnvs());

describe('verifySession', () => {
  it('returns the user for a valid in-domain session', async () => {
    expect(await verifySession('cookie')).toEqual({ uid: 'u1', email: 'faheem@easyio.tech', name: 'Faheem', picture: undefined });
  });

  it('returns null without a cookie, or for an invalid one', async () => {
    expect(await verifySession(undefined)).toBeNull();
    verifySessionCookie.mockRejectedValue(new Error('auth/session-cookie-expired'));
    expect(await verifySession('expired')).toBeNull();
  });

  it('re-applies the domain rule, so removing a domain revokes its sessions', async () => {
    vi.stubEnv('ALLOWED_EMAIL_DOMAINS', 'partner.com');
    expect(await verifySession('cookie')).toBeNull();
  });

  it('rejects unverified emails', async () => {
    verifySessionCookie.mockResolvedValue({ uid: 'u1', email: 'faheem@easyio.tech', email_verified: false });
    expect(await verifySession('cookie')).toBeNull();
  });

  it('throws AuthNotConfiguredError without allowed domains', async () => {
    vi.stubEnv('ALLOWED_EMAIL_DOMAINS', '');
    await expect(verifySession('cookie')).rejects.toBeInstanceOf(AuthNotConfiguredError);
  });
});

describe('requireUser', () => {
  it('reads the __session cookie from the request', async () => {
    const req = new Request('https://outreach.example/api/x', { headers: { cookie: 'other=1; __session=abc%3D; x=2' } });
    expect((await requireUser(req))?.uid).toBe('u1');
    expect(verifySessionCookie).toHaveBeenCalledWith('abc=');
  });
});
