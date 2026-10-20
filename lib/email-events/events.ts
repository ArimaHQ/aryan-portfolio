// Turns a verified Resend webhook event into what the store records: inbound emails (email.received)
// and delivery outcomes for emails ARIMA sent (email.delivered, email.bounced, ...).
export const MAX_STORED_BODY_CHARS = 100_000;

export type InboundEmail = {
  emailId: string; receivedAt: string; from: string; to: string[]; cc: string[];
  subject: string; messageId: string | null; attachmentCount: number;
};
export type DeliveryUpdate = { emailId: string; status: string; at: string };
export type EmailEvent = {
  eventId: string; type: string; receivedAt: string;
  inbound: InboundEmail | null; delivery: DeliveryUpdate | null;
};

const DELIVERY_TYPES: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
};

const text = (value: unknown, max = 998) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : '');
const list = (value: unknown) => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []).map((v) => text(v, 320)).filter(Boolean).slice(0, 50);

export function parseEmailEvent(eventId: string, payload: unknown, now: Date): EmailEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const { type, created_at: createdAt, data } = payload as { type?: unknown; created_at?: unknown; data?: Record<string, unknown> };
  if (typeof type !== 'string' || !data || typeof data !== 'object') return null;
  const emailId = text(data.email_id ?? data.id, 100);
  const at = text(createdAt, 40) || now.toISOString();
  const event: EmailEvent = { eventId, type: text(type, 60), receivedAt: now.toISOString(), inbound: null, delivery: null };
  if (type === 'email.received' && emailId) {
    event.inbound = {
      emailId, receivedAt: text(data.created_at, 40) || at, from: text(data.from, 320), to: list(data.to), cc: list(data.cc),
      subject: text(data.subject), messageId: text(data.message_id, 998) || null,
      attachmentCount: Array.isArray(data.attachments) ? data.attachments.length : 0,
    };
  } else if (DELIVERY_TYPES[type] && emailId) {
    event.delivery = { emailId, status: DELIVERY_TYPES[type], at };
  }
  return event;
}

/** Reads the body of a received email from Resend. Needs a key allowed to read received emails. */
export async function fetchInboundBody(apiKey: string, emailId: string, fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return { text: null, status: `http_${response.status}` };
    const body = (await response.json().catch(() => ({}))) as { text?: unknown; html?: unknown };
    const plain = typeof body.text === 'string' ? body.text
      : typeof body.html === 'string' ? body.html.replace(/<[^>]*>/g, ' ') : '';
    return { text: plain.slice(0, MAX_STORED_BODY_CHARS), status: 'fetched' };
  } catch {
    return { text: null, status: 'unreachable' };
  }
}

/** Masks an address for operator logs: "aryan@outlook.com" -> "a***@outlook.com". */
export function maskAddress(value: string): string {
  const match = /<?([^<>\s@]+)@([^<>\s]+?)>?$/.exec(value.trim());
  return match ? `${match[1][0]}***@${match[2]}` : '***';
}
