// Operator endpoint: retries stored access requests whose email is still pending.
// Requires the ACCESS_REQUEST_ADMIN_TOKEN secret as a bearer token.
import { accessRequestStore, adminToken, emailSender, retentionDays, serverEnv } from '@/lib/access-requests/config';
import { processDueEmails, purgeExpired } from '@/lib/access-requests/service';

export const dynamic = 'force-dynamic';

function authorised(request: Request, token: string): boolean {
  const given = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${token}`;
  if (!token || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const env = serverEnv();
  if (!authorised(request, adminToken(env))) return Response.json({ error: 'unauthorised' }, { status: 401 });
  const store = accessRequestStore(env);
  if (!store) return Response.json({ error: 'storage_not_configured' }, { status: 503 });
  const sender = emailSender(env);
  if (!sender) return Response.json({ error: 'email_not_configured' }, { status: 503 });
  const url = new URL(request.url);
  const deps = { store, sender, retentionDays: retentionDays(env) };
  const requeued = url.searchParams.get('include_failed') === '1' ? await store.requeueFailed(new Date().toISOString()) : 0;
  const result = await processDueEmails(deps, 25);
  const purged = await purgeExpired(deps);
  return Response.json({ requeued, ...result, purged }, { headers: { 'cache-control': 'no-store' } });
}
