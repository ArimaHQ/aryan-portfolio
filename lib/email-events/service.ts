// Handles one Resend webhook delivery: verify the signature, record the event once, then fetch the
// body of a newly received email. Redeliveries (same svix-id) are acknowledged without reprocessing.
import { fetchInboundBody, parseEmailEvent } from './events';
import { verifyWebhookSignature, type SignatureHeaders } from './signature';
import type { EmailEventStore } from './store';

export const MAX_WEBHOOK_BYTES = 256 * 1024;

export type WebhookDeps = {
  secret: string;
  store: EmailEventStore;
  apiKey: string;
  retentionDays: number;
  now?: () => Date;
  fetchImpl?: typeof fetch;
};

export type WebhookResult =
  | { status: 401; body: { error: string } }
  | { status: 400; body: { error: string } }
  | { status: 200; body: { received: true; duplicate: boolean; type: string } };

export async function handleResendWebhook(deps: WebhookDeps, headers: SignatureHeaders, raw: string): Promise<WebhookResult> {
  const now = (deps.now ?? (() => new Date()))();
  const check = await verifyWebhookSignature(deps.secret, headers, raw, now);
  // The reason stays in the log; callers only learn that the request was refused.
  if (!check.ok) {
    console.warn(`[email-webhook] refused: ${check.reason}`);
    return { status: 401, body: { error: 'unauthorised' } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'invalid_json' } };
  }
  const event = parseEmailEvent(headers.id as string, payload, now);
  if (!event) return { status: 400, body: { error: 'invalid_event' } };

  const cutoff = new Date(now.getTime() - deps.retentionDays * 86_400_000).toISOString();
  const { duplicate } = await deps.store.recordEmailEvent(event, cutoff);
  if (!duplicate && event.inbound) {
    const body = deps.apiKey ? await fetchInboundBody(deps.apiKey, event.inbound.emailId, deps.fetchImpl) : { text: null, status: 'no_api_key' };
    await deps.store.attachInboundBody(event.inbound.emailId, body.text, body.status);
  }
  // Routine logs carry the event type and ids only, never addresses or content.
  console.log(`[email-webhook] ${event.type} ${event.eventId}${duplicate ? ' duplicate' : ''}`);
  return { status: 200, body: { received: true, duplicate, type: event.type } };
}
