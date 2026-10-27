import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const constructed: string[] = [];

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
    constructor(key: string) {
      // Mirror the real SDK, which throws on a missing key.
      if (!key) throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');
      constructed.push(key);
    }
  },
}));

let settings: Record<string, unknown> | null = null;
vi.mock('@/lib/firestore', () => ({
  fetchOne: vi.fn(async () => settings),
}));

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/send', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, json: await res.json() };
};

const email = { to: 'dana@example.com', subject: 'Hi', body: '<p>Hello</p>' };

beforeEach(() => {
  vi.resetModules(); // fresh cached Resend client per test
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  send.mockReset().mockResolvedValue({ data: { id: 'msg-1' }, error: null });
  constructed.length = 0;
  settings = { profile: { name: 'Faheem', senderEmail: 'faheem@easyio.tech', replyToEmail: 'reply@reply.easyio.tech' } };
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/send', () => {
  it('passes Reply-To using the camelCase key the Resend SDK reads', async () => {
    const { status, json } = await post(email);

    expect(status).toBe(200);
    expect(json).toEqual({ success: true, messageId: 'msg-1' });
    const options = send.mock.calls[0][0];
    expect(options.replyTo).toBe('reply@reply.easyio.tech');
    expect(options).not.toHaveProperty('reply_to');
    expect(options.from).toBe('Faheem <faheem@easyio.tech>');
  });

  it('omits Reply-To when none is configured', async () => {
    settings = { profile: { name: 'Faheem', senderEmail: 'faheem@easyio.tech' } };
    await post(email);
    expect(send.mock.calls[0][0]).not.toHaveProperty('replyTo');
  });

  it('can be imported without RESEND_API_KEY and reports it at request time', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const { status, json } = await post(email);

    expect(status).toBe(500);
    expect(json.error).toBe('RESEND_API_KEY is not configured');
    expect(send).not.toHaveBeenCalled();
  });

  it('creates the Resend client once and reuses it', async () => {
    const { POST } = await import('./route');
    const req = () => new Request('http://localhost/api/send', { method: 'POST', body: JSON.stringify(email) });
    await POST(req());
    await POST(req());
    expect(constructed).toEqual(['re_test_key']);
  });

  it('returns 400 when required fields are missing', async () => {
    const { status } = await post({ to: 'dana@example.com' });
    expect(status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 400 with the provider message when Resend rejects the email', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
    const { status, json } = await post(email);
    expect(status).toBe(400);
    expect(json.error).toBe('domain not verified');
  });
});
