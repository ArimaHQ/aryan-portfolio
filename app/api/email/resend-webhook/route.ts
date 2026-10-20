// Resend webhook endpoint: received emails (email.received) and delivery events for emails ARIMA sent.
// Every request must carry a valid Svix signature made with RESEND_WEBHOOK_SECRET.
import { configuredSender, retentionDays, serverEnv } from '@/lib/access-requests/config';
import type { DurableObjectNamespaceLike } from '@/lib/access-requests/store';
import { handleResendWebhook, MAX_WEBHOOK_BYTES } from '@/lib/email-events/service';
import { emailEventStore } from '@/lib/email-events/store';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  const env = serverEnv();
  const secret = typeof env.RESEND_WEBHOOK_SECRET === 'string' ? env.RESEND_WEBHOOK_SECRET.trim() : '';
  if (!secret) return json({ error: 'webhook_not_configured' }, 503);
  const namespace = env.ACCESS_REQUESTS_DO as DurableObjectNamespaceLike | undefined;
  if (!namespace || typeof namespace.idFromName !== 'function') return json({ error: 'storage_not_configured' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_WEBHOOK_BYTES) return json({ error: 'too_large' }, 413);
  const result = await handleResendWebhook(
    { secret, store: emailEventStore(namespace), apiKey: configuredSender(env).key, retentionDays: retentionDays(env) },
    { id: request.headers.get('svix-id'), timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature') },
    raw,
  );
  return json(result.body, result.status);
}
