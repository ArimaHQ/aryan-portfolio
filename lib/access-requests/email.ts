// Email delivery for access requests. The provider is chosen by configuration;
// credentials stay on the server (Worker secrets) and never reach the browser.
import type { AccessRequestRecord } from './store';

export type SendResult =
  | { ok: true; providerId: string | null }
  | { ok: false; error: string; retryable: boolean };

export interface EmailSender {
  readonly name: string;
  send(record: AccessRequestRecord): Promise<SendResult>;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// Strips control characters so submitted text cannot add lines or headers.
const plain = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ');

export function composeAccessRequestEmail(record: AccessRequestRecord) {
  const rows: [string, string][] = [
    ['Reference', record.reference],
    ['First name', record.firstName],
    ['Last name', record.lastName],
    ['Email (not verified)', record.email],
    ['Telephone (not verified)', record.phone],
    ['Submitted (UTC)', record.createdAt],
    ['Originating page', `https://arimafinance.xyz${record.page}`],
    ['Visitor language', record.locale === 'fa' ? 'Persian' : 'English'],
  ];
  const note = 'Submitted through the ARIMA Journey guide. This is an access request only: no account has been created or approved. All values were typed by the visitor and are untrusted.';
  return {
    subject: `ARIMA access request ${record.reference}`,
    text: `${rows.map(([k, v]) => `${k}: ${plain(v)}`).join('\n')}\n\n${note}\n`,
    html: `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
      .map(([k, v]) => `<tr><th align="left" style="color:#555">${escapeHtml(k)}</th><td>${escapeHtml(plain(v))}</td></tr>`)
      .join('')}</table><p style="font-family:Arial,sans-serif;font-size:13px;color:#555">${escapeHtml(note)}</p>`,
  };
}

/** Resend (https://resend.com) HTTP API. Needs RESEND_API_KEY and a verified sender address. */
export class ResendEmailSender implements EmailSender {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly to: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(record: AccessRequestRecord): Promise<SendResult> {
    const message = composeAccessRequestEmail(record);
    try {
      const response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Retries of the same request never produce a second email.
          'Idempotency-Key': `access-request-${record.id}`,
        },
        body: JSON.stringify({ from: this.from, to: [this.to], subject: message.subject, text: message.text, html: message.html }),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { id?: unknown };
        return { ok: true, providerId: typeof body.id === 'string' ? body.id : null };
      }
      const retryable = response.status === 429 || response.status >= 500;
      // Keep the provider's error name and message for diagnosis, with any email address masked.
      const body = (await response.json().catch(() => ({}))) as { name?: unknown; message?: unknown };
      const name = typeof body.name === 'string' && /^[a-z_]{1,40}$/.test(body.name) ? `_${body.name}` : '';
      const detail = typeof body.message === 'string'
        ? `: ${plain(body.message).replace(/([^\s@<>()]+)@([^\s@<>()]+)/g, (_, user: string, host: string) => `${user[0]}***@${host}`).slice(0, 200)}`
        : '';
      return { ok: false, error: `provider_http_${response.status}${name}${detail}`, retryable };
    } catch {
      return { ok: false, error: 'provider_unreachable', retryable: true };
    }
  }
}

/** MOCK sender for tests only. Records what would have been sent. */
export class MockEmailSender implements EmailSender {
  readonly name = 'mock';
  readonly sent: AccessRequestRecord[] = [];
  results: SendResult[] = [];

  async send(record: AccessRequestRecord): Promise<SendResult> {
    const next = this.results.shift() ?? { ok: true, providerId: `mock-${this.sent.length + 1}` };
    if (next.ok) this.sent.push(record);
    return next;
  }
}
