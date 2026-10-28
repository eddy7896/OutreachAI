import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthNotConfiguredError } from '@/lib/auth/config';

const verifySession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ verifySession }));

const { proxy } = await import('./proxy');

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'https://outreach.example'), { headers: cookie ? { cookie: `__session=${cookie}` } : {} });

beforeEach(() => {
  verifySession.mockReset().mockResolvedValue(null);
});

describe('proxy', () => {
  it('lets public paths through without checking the session', async () => {
    const res = await proxy(request('/api/webhook/inbound'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(verifySession).not.toHaveBeenCalled();
  });

  it('redirects anonymous page requests to /login, keeping the destination', async () => {
    const res = await proxy(request('/campaigns/abc?tab=leads'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/campaigns/abc?tab=leads');
  });

  it('returns 401 JSON for anonymous API requests', async () => {
    const res = await proxy(request('/api/send'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('clears an invalid session cookie when redirecting', async () => {
    const res = await proxy(request('/leads', 'forged'));
    expect(verifySession).toHaveBeenCalledWith('forged');
    expect(res.headers.get('set-cookie')).toMatch(/__session=;/);
  });

  it('allows requests with a valid session', async () => {
    verifySession.mockResolvedValue({ uid: 'u1', email: 'faheem@easyio.tech' });
    const res = await proxy(request('/leads', 'valid'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('fails closed with 503 when auth is not configured', async () => {
    verifySession.mockRejectedValue(new AuthNotConfiguredError('FIREBASE_SERVICE_ACCOUNT is not configured'));
    expect((await proxy(request('/leads'))).status).toBe(503);
    expect((await proxy(request('/api/send'))).status).toBe(503);
  });
});
