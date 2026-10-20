// Receives a confirmed access request from the ARIMA Journey guide.
import { accessRequestStore, emailSender, hashSalt, retentionDays, serverEnv } from '@/lib/access-requests/config';
import { hashClient, submitAccessRequest } from '@/lib/access-requests/service';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set(['arimafinance.xyz', 'www.arimafinance.xyz', 'localhost', '127.0.0.1']);
const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

function sameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOSTS.has(host) || host.endsWith('.workers.dev');
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'unsupported_media_type' }, 415);
  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'too_large' }, 413);
  let input: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not_object');
    input = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const env = serverEnv();
  const store = accessRequestStore(env);
  if (!store) return json({ error: 'storage_not_configured' }, 503);

  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const result = await submitAccessRequest(
      { store, sender: emailSender(env), retentionDays: retentionDays(env) },
      input,
      { hash: await hashClient(ip, hashSalt(env)) },
    );
    switch (result.kind) {
      case 'recorded':
        return json({ recorded: true, reference: result.reference, duplicate: result.duplicate, email: result.email }, result.duplicate ? 200 : 201);
      case 'invalid':
        return json({ error: 'invalid', fields: result.errors }, 422);
      case 'rate_limited':
        return json({ error: 'rate_limited' }, 429);
      default:
        return json({ error: 'rejected' }, 400);
    }
  } catch {
    console.error('[access-request] storage failure');
    return json({ error: 'storage_unavailable' }, 503);
  }
}
