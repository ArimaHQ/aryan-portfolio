// Operator endpoint: newest received emails, metadata only. Addresses are masked unless ?full=1.
// Requires the ACCESS_REQUEST_ADMIN_TOKEN secret as a bearer token.
import { isOperator, serverEnv } from '@/lib/access-requests/config';
import type { DurableObjectNamespaceLike } from '@/lib/access-requests/store';
import { maskAddress } from '@/lib/email-events/events';
import { emailEventStore } from '@/lib/email-events/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const env = serverEnv();
  if (!isOperator(request, env)) return Response.json({ error: 'unauthorised' }, { status: 401 });
  const namespace = env.ACCESS_REQUESTS_DO as DurableObjectNamespaceLike | undefined;
  if (!namespace || typeof namespace.idFromName !== 'function') return Response.json({ error: 'storage_not_configured' }, { status: 503 });
  const url = new URL(request.url);
  const full = url.searchParams.get('full') === '1';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 50);
  const rows = await emailEventStore(namespace).recentInbound(limit);
  const emails = rows.map((r) => ({
    emailId: r.email_id, receivedAt: r.received_at,
    from: full ? r.from_address : maskAddress(r.from_address),
    to: (JSON.parse(r.to_addresses) as string[]).map((a) => (full ? a : maskAddress(a))),
    // Subjects can be personal; only labelled test subjects are shown unless full=1.
    subject: full || /^ARIMA-QA\b/.test(r.subject) ? r.subject : `(${r.subject.length} characters)`,
    attachments: r.attachment_count, body: r.body_status, bodyLength: r.body_length,
  }));
  return Response.json({ webhookConfigured: Boolean(env.RESEND_WEBHOOK_SECRET), emails }, { headers: { 'cache-control': 'no-store' } });
}
