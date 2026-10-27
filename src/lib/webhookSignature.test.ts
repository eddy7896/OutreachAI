import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature, WEBHOOK_TOLERANCE_SECONDS } from './webhookSignature';

// Fixed vector generated with svix@2.8.0 `new Webhook(secret).sign(id, date, body)`, so this
// suite checks compatibility with Resend's signer, not just self-consistency.
// The secret is built at runtime from an obviously fake key so no secret-shaped literal is committed.
const SECRET = `whsec_${Buffer.from('outreach-ai-test-signing-key-not-a-real-secret').toString('base64')}`;
const ID = 'msg_test_vector_1';
const TIMESTAMP = 1761559200;
const BODY = '{"type":"email.received","data":{"email_id":"em_1"}}';
const SVIX_SIGNATURE = 'v1,EcMQ6YZ+/MsLoC3Px1v71cJTSmACjkfKh9Bcow/JuX4=';

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
    expect(verifyWebhookSignature(BODY.replace('em_1', 'em_2'), headers(SVIX_SIGNATURE), SECRET, TIMESTAMP)).toEqual({
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
