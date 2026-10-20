// Operator endpoint: storage and email status of one request by reference, without personal details.
// Requires the ACCESS_REQUEST_ADMIN_TOKEN secret as a bearer token.
import { accessRequestStore, isOperator, serverEnv } from '@/lib/access-requests/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const env = serverEnv();
  if (!isOperator(request, env)) return Response.json({ error: 'unauthorised' }, { status: 401 });
  const store = accessRequestStore(env);
  if (!store) return Response.json({ error: 'storage_not_configured' }, { status: 503 });
  const reference = new URL(request.url).searchParams.get('reference') ?? '';
  if (!/^ARQ-[A-Z0-9]{8}$/.test(reference)) return Response.json({ error: 'invalid_reference' }, { status: 400 });
  const status = await store.statusOf(reference);
  return Response.json(status ? { stored: true, ...status } : { stored: false, reference }, {
    status: status ? 200 : 404, headers: { 'cache-control': 'no-store' },
  });
}
