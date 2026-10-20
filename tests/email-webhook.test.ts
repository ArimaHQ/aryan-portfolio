// Resend webhook tests. The store and Resend API are labelled MOCKS; no real webhook or email is involved.
import { describe, expect, it } from 'vitest';
import { maskAddress, parseEmailEvent } from '@/lib/email-events/events';
import { handleResendWebhook, type WebhookDeps } from '@/lib/email-events/service';
import { signPayload, verifyWebhookSignature } from '@/lib/email-events/signature';
import { MemoryEmailEventStore } from '@/lib/email-events/store';

const SECRET = `whsec_${btoa('arima-test-webhook-secret-0001')}`; // MOCK secret
const now = new Date('2026-10-20T15:30:00Z');
const ts = String(Math.floor(now.getTime() / 1000));

const received = JSON.stringify({
  type: 'email.received', created_at: '2026-10-20T15:29:58.000Z',
  data: {
    email_id: 'mock-inbound-1', created_at: '2026-10-20T15:29:58.000Z', from: 'Tester <tester@example.com>',
    to: ['inbox@arimafinance.xyz'], cc: [], subject: 'ARIMA-QA inbound test', message_id: '<m1@example.com>', attachments: [],
  },
});

async function signed(body: string, id = 'msg_mock_0001', timestamp = ts) {
  return { id, timestamp, signature: `v1,${await signPayload(SECRET, id, timestamp, body)}` };
}

function setup(overrides: Partial<WebhookDeps> = {}) {
  const store = new MemoryEmailEventStore();
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ text: 'Hello from the MOCK Resend API' }), { status: 200 });
  }) as unknown as typeof fetch;
  const deps: WebhookDeps = { secret: SECRET, store, apiKey: 're_mock', retentionDays: 180, now: () => now, fetchImpl, ...overrides };
  return { deps, store, calls };
}

describe('webhook signature', () => {
  it('accepts a valid signature and any of several rotated signatures', async () => {
    const h = await signed(received);
    expect(await verifyWebhookSignature(SECRET, h, received, now)).toEqual({ ok: true });
    expect(await verifyWebhookSignature(SECRET, { ...h, signature: `v1,b2xk ${h.signature}` }, received, now)).toEqual({ ok: true });
  });

  it('rejects a tampered body, a wrong secret, missing headers and an old timestamp', async () => {
    const h = await signed(received);
    expect(await verifyWebhookSignature(SECRET, h, received.replace('inbound', 'outbound'), now)).toMatchObject({ reason: 'bad_signature' });
    expect(await verifyWebhookSignature(`whsec_${btoa('other')}`, h, received, now)).toMatchObject({ reason: 'bad_signature' });
    expect(await verifyWebhookSignature(SECRET, { ...h, signature: null }, received, now)).toMatchObject({ reason: 'missing_headers' });
    const old = await signed(received, 'msg_mock_0002', String(Number(ts) - 600));
    expect(await verifyWebhookSignature(SECRET, old, received, now)).toMatchObject({ reason: 'stale_timestamp' });
  });
});

describe('webhook handling', () => {
  it('records a received email once, fetches its body, and ignores redeliveries', async () => {
    const { deps, store, calls } = setup();
    const h = await signed(received);
    const first = await handleResendWebhook(deps, h, received);
    expect(first).toEqual({ status: 200, body: { received: true, duplicate: false, type: 'email.received' } });
    const again = await handleResendWebhook(deps, h, received);
    expect(again.body).toMatchObject({ duplicate: true });
    expect(store.inbound.size).toBe(1);
    expect(calls).toEqual(['https://api.resend.com/emails/receiving/mock-inbound-1']);
    const [row] = await store.recentInbound(5);
    expect(row).toMatchObject({ email_id: 'mock-inbound-1', subject: 'ARIMA-QA inbound test', body_status: 'fetched' });
  });

  it('does not store anything when the signature is wrong', async () => {
    const { deps, store } = setup();
    const h = await signed(received);
    const result = await handleResendWebhook(deps, { ...h, signature: 'v1,AAAA' }, received);
    expect(result.status).toBe(401);
    expect(store.events.size).toBe(0);
  });

  it('keeps the email when its body cannot be read', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    const { deps, store } = setup({ fetchImpl });
    await handleResendWebhook(deps, await signed(received), received);
    expect((await store.recentInbound(1))[0]).toMatchObject({ body_status: 'http_401', body_length: null });
  });

  it('turns delivery events into a delivery status for the sent email', async () => {
    const { deps, store } = setup();
    const body = JSON.stringify({ type: 'email.delivered', created_at: '2026-10-20T15:29:00.000Z', data: { email_id: 'sent-1' } });
    await handleResendWebhook(deps, await signed(body, 'msg_mock_0003'), body);
    expect(store.deliveries).toEqual([{ emailId: 'sent-1', status: 'delivered', at: '2026-10-20T15:29:00.000Z' }]);
  });
});

describe('event parsing', () => {
  it('strips control characters and masks addresses for logs', () => {
    const event = parseEmailEvent('e', JSON.parse(received.replace('ARIMA-QA inbound test', 'Line\\nBcc: x@y.z')), now);
    expect(event?.inbound?.subject).toBe('Line Bcc: x@y.z');
    expect(maskAddress('Tester <tester@example.com>')).toBe('t***@example.com');
    expect(parseEmailEvent('e', { type: 'email.received' }, now)).toBeNull();
  });
});

describe('provider errors', () => {
  it('keeps the Resend error message for diagnosis with addresses masked', async () => {
    const { ResendEmailSender } = await import('@/lib/access-requests/email');
    const fetchImpl = (async () => new Response(JSON.stringify({
      name: 'validation_error', message: 'You can only send testing emails to your own email address (owner@example.com).',
    }), { status: 403 })) as unknown as typeof fetch;
    const sender = new ResendEmailSender('re_mock', 'A <a@arimafinance.xyz>', 'to@example.com', fetchImpl);
    const result = await sender.send({
      id: 'id', submissionId: 's', reference: 'ARQ-TEST0001', firstName: 'T', lastName: 'Q', email: 'e@example.com', phone: '+4420',
      page: '/journey/', locale: 'en', clientHash: 'h', createdAt: '2026-10-20T10:00:00.000Z', emailStatus: 'pending', emailAttempts: 0,
      emailLastError: null, emailProviderId: null, emailAcceptedAt: null, nextAttemptAt: null,
    });
    expect(result).toEqual({
      ok: false, retryable: false,
      error: 'provider_http_403_validation_error: You can only send testing emails to your own email address (o***@example.com).',
    });
  });
});
