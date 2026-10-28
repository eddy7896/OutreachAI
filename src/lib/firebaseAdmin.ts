import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { AuthNotConfiguredError } from '@/lib/auth/config';

// Server only. Never import this from a client component.

let app: App | null = null;

/**
 * Admin app from FIREBASE_SERVICE_ACCOUNT, which holds the service-account JSON
 * either as-is or base64-encoded (handy for env UIs that mangle newlines).
 * Created on first use so builds and unrelated routes don't need the secret.
 */
export function getAdminApp(): App {
  if (app) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) throw new AuthNotConfiguredError('FIREBASE_SERVICE_ACCOUNT is not configured');

  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(json);
  app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
