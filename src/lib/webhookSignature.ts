import { createHmac, timingSafeEqual } from 'node:crypto';

/** Maximum age (and clock skew) accepted for a webhook timestamp, in seconds. */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type WebhookVerification = { ok: true } | { ok: false; reason: string };

/**
 * Verifies a Resend webhook, which is signed with Svix (the Standard Webhooks scheme):
 * HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`, keyed with the base64 part of the
 * `whsec_...` secret. The signature header holds space-separated `v1,<base64>` entries.
 *
 * `rawBody` must be the exact request body; re-serialized JSON will not verify.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): WebhookVerification {
  const id = headers.get('svix-id') ?? headers.get('webhook-id');
  const timestamp = headers.get('svix-timestamp') ?? headers.get('webhook-timestamp');
  const signatureHeader = headers.get('svix-signature') ?? headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing signature headers' };

  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(nowSeconds - sentAt) > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret, 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  const matches = signatureHeader.split(' ').some((entry) => {
    const [version, signature] = entry.split(',');
    if (version !== 'v1' || !signature) return false;
    const received = Buffer.from(signature, 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
  return matches ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}
