import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { AuthNotConfiguredError } from '@/lib/auth/config';

// Server only. Never import this from a client component.

export type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * Parses FIREBASE_SERVICE_ACCOUNT: the downloaded key file's JSON as-is, or base64 of it.
 * Tolerates the usual paste mistakes (surrounding quotes, `\n` escaped twice) and turns
 * anything unusable into AuthNotConfiguredError, whose message never contains the key.
 */
export function parseServiceAccount(raw: string | undefined): ServiceAccount {
  let value = raw?.trim();
  if (!value) throw new AuthNotConfiguredError('FIREBASE_SERVICE_ACCOUNT is not configured');

  const quoted = value.match(/^(['"])([\s\S]*)\1$/);
  if (quoted) value = quoted[2].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(value.startsWith('{') ? value : Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    throw new AuthNotConfiguredError(
      'FIREBASE_SERVICE_ACCOUNT is not valid JSON (paste the downloaded key file as-is, without surrounding quotes, or base64-encode it)',
    );
  }

  const account = (parsed ?? {}) as Partial<Record<keyof ServiceAccount, unknown>>;
  const missing = (['project_id', 'client_email', 'private_key'] as const).filter((k) => typeof account[k] !== 'string' || !account[k]);
  if (missing.length) {
    throw new AuthNotConfiguredError(`FIREBASE_SERVICE_ACCOUNT is missing ${missing.join(', ')} (use the service-account key file from Firebase)`);
  }

  let privateKey = account.private_key as string;
  // Pasting through some env editors leaves literal "\n" sequences instead of newlines.
  if (!privateKey.includes('\n') && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

  return { project_id: account.project_id as string, client_email: account.client_email as string, private_key: privateKey };
}

let app: App | null = null;

/** Admin app, created on first use so builds and unrelated routes don't need the secret. */
export function getAdminApp(): App {
  if (app) return app;
  const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  try {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }),
        projectId: account.project_id,
      });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new AuthNotConfiguredError(`FIREBASE_SERVICE_ACCOUNT could not be loaded: ${reason}`);
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
