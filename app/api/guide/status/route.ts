// Tells the Journey guide which optional services are switched on. Returns booleans only.
import { accessRequestStore, emailSender, retentionDays, serverEnv, speechConfig } from '@/lib/access-requests/config';

export const dynamic = 'force-dynamic';

export function GET() {
  const env = serverEnv();
  return Response.json(
    {
      accessRequests: { storage: Boolean(accessRequestStore(env)), email: Boolean(emailSender(env)), retentionDays: retentionDays(env) },
      speech: { server: Boolean(speechConfig(env)) },
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
