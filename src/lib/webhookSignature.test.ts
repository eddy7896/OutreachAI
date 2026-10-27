import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature, WEBHOOK_TOLERANCE_SECONDS } from './webhookSignature';

// Fixed vector generated with svix@2.8.0 `new Webhook(secret).sign(id, date, body)`, so this
// suite checks compatibility with Resend's signer, not just self-consistency.
const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const TIMESTAMP = 1614265330;
const BODY = '{"test": 2432232314}';
const SVIX_SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

const headers = (sig: string, overrides: Record<string, string> = {}) =>
  new Headers({ 'svix-id': ID, 'svix-timestamp': String(TIMESTAMP), 'svix-signature': sig, ...overrides });

const sign = (body: string, secret = SECRET, id = ID, ts = TIMESTAMP) =>
  'v1,' + createHmac('sha256', Buffer.from(secret.slice('whsec_'.length), 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

describe('verifyWebhookSignature', () => {
  it('accepts the svix reference signature', () => {
    expect(verifyWebhookSignature(BODY, headers(SVIX_SIGNATURE), SECRET, TIMESTAMP)).toEqual({ ok: true });
  });

  it('accepts standard-webhooks header names', () => {
    const h = new Headers({ 'webhook-id': ID, 'webhook-timestamp': String(TIMESTAMP), 'webhook-signature': SVIX_SIGNATURE });
    expect(verifyWebhookSignature(BODY, h, SECRET, TIMESTAMP).ok).toBe(true);
  });

  it('accepts when any one of several signatures matches (secret rotation)', () => {
    const h = headers(`v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${SVIX_SIGNATURE}`);
    expect(verifyWebhookSignature(BODY, h, SECRET, TIMESTAMP).ok).toBe(true);
  });

  it('rejects a modified body', () => {
    expect(verifyWebhookSignature(BODY.replace('2432232314', '1'), headers(SVIX_SIGNATURE), SECRET, TIMESTAMP)).toEqual({
      ok: false,
      reason: 'signature mismatch',
    });
  });

  it('rejects a signature made with another secret', () => {
    const other = sign(BODY, 'whsec_' + Buffer.from('another-secret-value').toString('base64'));
    expect(verifyWebhookSignature(BODY, headers(other), SECRET, TIMESTAMP).ok).toBe(false);
  });

  it('rejects a replay outside the tolerance window', () => {
    const late = TIMESTAMP + WEBHOOK_TOLERANCE_SECONDS + 1;
    expect(verifyWebhookSignature(BODY, headers(SVIX_SIGNATURE), SECRET, late)).toEqual({ ok: false, reason: 'timestamp outside tolerance' });
  });

  it('rejects missing headers and unknown signature versions', () => {
    expect(verifyWebhookSignature(BODY, new Headers(), SECRET, TIMESTAMP)).toEqual({ ok: false, reason: 'missing signature headers' });
    expect(verifyWebhookSignature(BODY, headers(SVIX_SIGNATURE.replace('v1,', 'v2,')), SECRET, TIMESTAMP).ok).toBe(false);
    expect(verifyWebhookSignature(BODY, headers('garbage'), SECRET, TIMESTAMP).ok).toBe(false);
  });
});
