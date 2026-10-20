// Reads server-side configuration from the Worker environment (bindings, vars and secrets).
// Nothing here is shipped to the browser.
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ResendEmailSender, type EmailSender } from './email';
import { D1AccessRequestStore, type AccessRequestStore, type D1DatabaseLike } from './store';

export const DEFAULT_ACCESS_REQUEST_DESTINATION = 'aryan.hd@outlook.com';
export const DEFAULT_RETENTION_DAYS = 180;

type ServerEnv = Record<string, unknown>;

export function serverEnv(): ServerEnv {
  try {
    return { ...process.env, ...(getCloudflareContext().env as unknown as ServerEnv) };
  } catch {
    return { ...process.env };
  }
}

const str = (env: ServerEnv, key: string) => (typeof env[key] === 'string' ? (env[key] as string).trim() : '');

export function retentionDays(env: ServerEnv): number {
  const days = Number(str(env, 'ACCESS_REQUEST_RETENTION_DAYS'));
  return Number.isFinite(days) && days >= 1 && days <= 3650 ? Math.floor(days) : DEFAULT_RETENTION_DAYS;
}

export function accessRequestStore(env: ServerEnv): AccessRequestStore | null {
  const db = env.ACCESS_REQUESTS_DB as D1DatabaseLike | undefined;
  return db && typeof db.prepare === 'function' ? new D1AccessRequestStore(db) : null;
}

export function emailSender(env: ServerEnv): EmailSender | null {
  const provider = str(env, 'ACCESS_REQUEST_EMAIL_PROVIDER') || 'resend';
  const to = str(env, 'ACCESS_REQUEST_EMAIL_TO') || DEFAULT_ACCESS_REQUEST_DESTINATION;
  if (provider === 'resend') {
    const key = str(env, 'RESEND_API_KEY');
    const from = str(env, 'ACCESS_REQUEST_EMAIL_FROM');
    return key && from ? new ResendEmailSender(key, from, to) : null;
  }
  return null;
}

export function hashSalt(env: ServerEnv): string {
  return str(env, 'ACCESS_REQUEST_HASH_SALT') || 'arima-access-requests';
}

export function adminToken(env: ServerEnv): string {
  return str(env, 'ACCESS_REQUEST_ADMIN_TOKEN');
}

export function speechConfig(env: ServerEnv): { key: string; region: string } | null {
  const key = str(env, 'AZURE_SPEECH_KEY');
  const region = str(env, 'AZURE_SPEECH_REGION');
  return key && /^[a-z0-9]+$/.test(region) ? { key, region } : null;
}
