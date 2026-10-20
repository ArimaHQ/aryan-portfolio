// Reads server-side configuration from the Worker environment (bindings, vars and secrets).
// Nothing here is shipped to the browser.
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ResendEmailSender, type EmailSender } from './email';
import { TEST_FROM } from './resend-domain';
import { DurableObjectAccessRequestStore, type AccessRequestStore, type DurableObjectNamespaceLike } from './store';

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
  const namespace = env.ACCESS_REQUESTS_DO as DurableObjectNamespaceLike | undefined;
  return namespace && typeof namespace.idFromName === 'function' ? new DurableObjectAccessRequestStore(namespace) : null;
}

/** The Resend key and sender; the sender falls back to Resend's test address until the domain is verified. */
export function configuredSender(env: ServerEnv) {
  return { key: str(env, 'RESEND_API_KEY'), from: str(env, 'ACCESS_REQUEST_EMAIL_FROM') || TEST_FROM };
}

export function emailSender(env: ServerEnv): EmailSender | null {
  const provider = str(env, 'ACCESS_REQUEST_EMAIL_PROVIDER') || 'resend';
  const to = str(env, 'ACCESS_REQUEST_EMAIL_TO') || DEFAULT_ACCESS_REQUEST_DESTINATION;
  if (provider === 'resend') {
    const { key, from } = configuredSender(env);
    return key ? new ResendEmailSender(key, from, to) : null;
  }
  return null;
}

export function hashSalt(env: ServerEnv): string {
  return str(env, 'ACCESS_REQUEST_HASH_SALT') || 'arima-access-requests';
}

export function adminToken(env: ServerEnv): string {
  return str(env, 'ACCESS_REQUEST_ADMIN_TOKEN');
}

/** Constant-time check of the operator bearer token; false when no token is configured. */
export function isOperator(request: Request, env: ServerEnv): boolean {
  const token = adminToken(env);
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${token}`;
  if (!token || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function speechConfig(env: ServerEnv): { key: string; region: string } | null {
  const key = str(env, 'AZURE_SPEECH_KEY');
  const region = str(env, 'AZURE_SPEECH_REGION');
  return key && /^[a-z0-9]+$/.test(region) ? { key, region } : null;
}
