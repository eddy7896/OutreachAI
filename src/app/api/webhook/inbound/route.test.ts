import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAll = vi.fn();
const createDocument = vi.fn();
const updateDocument = vi.fn();
vi.mock('@/lib/firestore', () => ({ fetchAll, createDocument, updateDocument }));

const generateWithFallback = vi.fn();
vi.mock('@/lib/ai', () => ({ generateWithFallback }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { receiving: { get: vi.fn(async () => ({ data: { text: 'Yes, let us talk Tuesday.', html: '' }, error: null })) } };
  },
}));

const SECRET = 'whsec_' + Buffer.from('test-webhook-signing-secret').toString('base64');

function signedRequest(payload: unknown, { secret = SECRET, tamper = false } = {}) {
  const body = JSON.stringify(payload);
  const id = 'msg_test';
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', Buffer.from(secret.slice('whsec_'.length), 'base64')).update(`${id}.${ts}.${body}`).digest('base64');
  return new Request('http://localhost/api/webhook/inbound', {
    method: 'POST',
    headers: { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` },
    body: tamper ? body.replace('dana', 'mallory') : body,
  });
}

const received = { type: 'email.received', data: { email_id: 'em_1', from: 'Dana <dana@example.com>', subject: 'Re: Hello' } };

async function post(req: Request) {
  const { POST } = await import('./route');
  const res = await POST(req);
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('RESEND_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('RESEND_API_KEY', 're_test');
  fetchAll.mockReset().mockResolvedValue([{ id: 'lead-1', email: 'dana@example.com', status: 'contacted', campaignId: 'camp-1' }]);
  createDocument.mockReset().mockResolvedValue({ id: 'email-1' });
  updateDocument.mockReset().mockResolvedValue(undefined);
  generateWithFallback.mockReset().mockResolvedValue({ intent: 'POSITIVE_INTEREST', summary: 'Wants a call', action_required: true });
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/webhook/inbound', () => {
  it('processes a correctly signed reply', async () => {
    const { status } = await post(signedRequest(received));

    expect(status).toBe(200);
    expect(createDocument).toHaveBeenCalledWith('emails', expect.objectContaining({ leadId: 'lead-1', direction: 'inbound', intent: 'POSITIVE_INTEREST' }));
    expect(updateDocument).toHaveBeenCalledWith('leads', 'lead-1', { status: 'replied', hasUnread: true });
  });

  it('rejects an unsigned request without touching the database', async () => {
    const req = new Request('http://localhost/api/webhook/inbound', { method: 'POST', body: JSON.stringify(received) });
    const { status } = await post(req);

    expect(status).toBe(401);
    expect(fetchAll).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it('rejects a tampered body', async () => {
    const { status } = await post(signedRequest(received, { tamper: true }));
    expect(status).toBe(401);
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('rejects a request signed with a different secret', async () => {
    const forged = signedRequest(received, { secret: 'whsec_' + Buffer.from('attacker').toString('base64') });
    const { status } = await post(forged);
    expect(status).toBe(401);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it('fails closed when RESEND_WEBHOOK_SECRET is not configured', async () => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '');
    const { status, json } = await post(signedRequest(received));

    expect(status).toBe(500);
    expect(json.error).toBe('Webhook verification is not configured');
    expect(fetchAll).not.toHaveBeenCalled();
  });
});
