import { Resend } from 'resend';

let client: Resend | null = null;

/**
 * Returns a shared Resend client, created on first use.
 * The SDK throws on an empty key, so constructing it at module scope broke
 * `next build` whenever RESEND_API_KEY was unset.
 */
export function getResend(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    client = new Resend(apiKey);
  }
  return client;
}
