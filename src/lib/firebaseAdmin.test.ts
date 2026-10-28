import { describe, expect, it } from 'vitest';
import { AuthNotConfiguredError } from '@/lib/auth/config';
import { parseServiceAccount } from './firebaseAdmin';

// Placeholder values only; parseServiceAccount never validates the key material itself.
const KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----\n';
const account = { type: 'service_account', project_id: 'outreach-test', client_email: 'sa@outreach-test.iam.gserviceaccount.com', private_key: KEY };
const json = JSON.stringify(account);
const expected = { project_id: 'outreach-test', client_email: account.client_email, private_key: KEY };

const failure = (raw: string | undefined) => {
  try {
    parseServiceAccount(raw);
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected parseServiceAccount to throw');
};

describe('parseServiceAccount', () => {
  it.each([
    ['the key file as-is', json],
    ['pretty-printed JSON with surrounding whitespace', `\n  ${JSON.stringify(account, null, 2)}\n`],
    ['base64 of the key file', Buffer.from(json).toString('base64')],
    ['JSON wrapped in single quotes', `'${json}'`],
    ['JSON wrapped in double quotes', `"${json}"`],
    ['base64 wrapped in quotes', `"${Buffer.from(json).toString('base64')}"`],
  ])('accepts %s', (_label, raw) => {
    expect(parseServiceAccount(raw)).toEqual(expected);
  });

  it('repairs a private key whose newlines were escaped twice', () => {
    const doubled = JSON.stringify({ ...account, private_key: KEY.replace(/\n/g, '\\n') });
    expect(parseServiceAccount(doubled).private_key).toBe(KEY);
  });

  it('reports a missing value as not configured', () => {
    expect(failure(undefined)).toBeInstanceOf(AuthNotConfiguredError);
    expect(failure('   ').message).toBe('FIREBASE_SERVICE_ACCOUNT is not configured');
  });

  it('reports invalid JSON with a hint, as not configured', () => {
    const error = failure('{"type": "service_account", ');
    expect(error).toBeInstanceOf(AuthNotConfiguredError);
    expect(error.message).toMatch(/not valid JSON/);
  });

  it('names missing fields', () => {
    const error = failure(JSON.stringify({ type: 'service_account', project_id: 'outreach-test' }));
    expect(error).toBeInstanceOf(AuthNotConfiguredError);
    expect(error.message).toMatch(/missing client_email, private_key/);
  });

  it('never includes key material in error messages', () => {
    for (const raw of [`${json}x`, JSON.stringify({ ...account, client_email: '' })]) {
      const message = failure(raw).message;
      expect(message).not.toContain('PRIVATE KEY');
      expect(message).not.toContain('MIIEvQ');
    }
  });
});
