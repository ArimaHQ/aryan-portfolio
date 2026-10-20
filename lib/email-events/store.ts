// Webhook-event storage, kept in the same Durable Object as access requests so a delivery event can
// update the request it belongs to in one transaction.
import type { DurableObjectNamespaceLike } from '@/lib/access-requests/store';
import type { EmailEvent } from './events';

export type InboundSummaryRow = {
  email_id: string; received_at: string; from_address: string; to_addresses: string;
  subject: string; attachment_count: number; body_status: string; body_length: number | null;
};

export interface EmailEventStore {
  recordEmailEvent(event: EmailEvent, purgeBeforeIso: string | null): Promise<{ duplicate: boolean; matchedRequests: number }>;
  attachInboundBody(emailId: string, text: string | null, status: string): Promise<void>;
  recentInbound(limit: number): Promise<InboundSummaryRow[]>;
}

export function emailEventStore(namespace: DurableObjectNamespaceLike): EmailEventStore {
  return namespace.get(namespace.idFromName('access-requests')) as EmailEventStore;
}

/** MOCK store for tests only. */
export class MemoryEmailEventStore implements EmailEventStore {
  readonly events = new Map<string, EmailEvent>();
  readonly inbound = new Map<string, { event: EmailEvent; body: string | null; bodyStatus: string }>();
  readonly deliveries: EmailEvent['delivery'][] = [];

  async recordEmailEvent(event: EmailEvent) {
    if (this.events.has(event.eventId)) return { duplicate: true, matchedRequests: 0 };
    this.events.set(event.eventId, event);
    if (event.inbound && !this.inbound.has(event.inbound.emailId)) this.inbound.set(event.inbound.emailId, { event, body: null, bodyStatus: 'pending' });
    if (event.delivery) this.deliveries.push(event.delivery);
    return { duplicate: false, matchedRequests: event.delivery ? 1 : 0 };
  }

  async attachInboundBody(emailId: string, text: string | null, status: string) {
    const entry = this.inbound.get(emailId);
    if (entry) Object.assign(entry, { body: text, bodyStatus: status });
  }

  async recentInbound(limit: number) {
    return [...this.inbound.values()].slice(-limit).reverse().map(({ event, body, bodyStatus }) => ({
      email_id: event.inbound!.emailId, received_at: event.inbound!.receivedAt, from_address: event.inbound!.from,
      to_addresses: JSON.stringify(event.inbound!.to), subject: event.inbound!.subject,
      attachment_count: event.inbound!.attachmentCount, body_status: bodyStatus, body_length: body?.length ?? null,
    }));
  }
}
