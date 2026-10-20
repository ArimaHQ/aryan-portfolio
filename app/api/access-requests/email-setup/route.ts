// Operator endpoint: reports whether email is configured and checks the Resend sending domain.
// Requires the ACCESS_REQUEST_ADMIN_TOKEN secret as a bearer token. Never returns the API key.
import { configuredSender, isOperator, serverEnv } from '@/lib/access-requests/config';
import { checkSendingDomain } from '@/lib/access-requests/resend-domain';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const env = serverEnv();
  if (!isOperator(request, env)) return Response.json({ error: 'unauthorised' }, { status: 401 });
  const { key, from } = configuredSender(env);
  if (!key) return Response.json({ emailConfigured: false }, { headers: { 'cache-control': 'no-store' } });
  const domain = await checkSendingDomain(key).catch(() => null);
  return Response.json({ emailConfigured: true, from, domain }, { headers: { 'cache-control': 'no-store' } });
}
