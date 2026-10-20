// Access-request service tests. Storage and email use labelled MOCKS (MemoryAccessRequestStore,
// MockEmailSender); no real email is sent and no real database is touched here.
import { describe, expect, it } from 'vitest';
import { composeAccessRequestEmail, MockEmailSender } from '@/lib/access-requests/email';
import {
  MAX_EMAIL_ATTEMPTS, MAX_REQUESTS_PER_HOUR, nextAttemptAfter, processDueEmails, purgeExpired, submitAccessRequest, type ServiceDeps,
} from '@/lib/access-requests/service';
import { clientNetwork } from '@/lib/access-requests/http';
import { MemoryAccessRequestStore } from '@/lib/access-requests/store';
import { isValidEmail, isValidName, isValidPhone, normalisePhone } from '@/lib/access-requests/validation';

const valid = {
  firstName: 'Test', lastName: 'Visitor', email: 'test.visitor@example.com', phone: '+44 20 7946 0000',
  submissionId: 'test-submission-0001', elapsedMs: 30_000, confirmed: true, website: '', page: '/journey/', locale: 'en',
};

function setup(overrides: Partial<ServiceDeps> = {}) {
  let clock = new Date('2026-10-20T10:00:00Z');
  const store = new MemoryAccessRequestStore();
  const sender = new MockEmailSender();
  let n = 0;
  const deps: ServiceDeps = { store, sender, retentionDays: 180, now: () => clock, randomId: () => `id-${++n}`, ...overrides };
  return { deps, store, sender, advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}

describe('access request validation', () => {
  it('accepts names in Latin and Persian script and rejects links', () => {
    expect(isValidName('Anne-Marie')).toBe(true);
    expect(isValidName('آرین')).toBe(true);
    expect(isValidName('')).toBe(false);
    expect(isValidName('http://spam.example')).toBe(false);
    expect(isValidEmail('admin\u202e@example.com')).toBe(false);
  });

  it('checks email format only', () => {
    expect(isValidEmail('name@example.co.uk')).toBe(true);
    expect(isValidEmail('name@example')).toBe(false);
    expect(isValidEmail('two@@example.com')).toBe(false);
    expect(isValidEmail('a b@example.com')).toBe(false);
  });

  it('requires an explicit country code on the phone number', () => {
    expect(normalisePhone(' +44 (20) 7946-0000 ')).toBe('+442079460000');
    expect(isValidPhone(normalisePhone('+44 20 7946 0000'))).toBe(true);
    expect(isValidPhone(normalisePhone('020 7946 0000'))).toBe(false);
    expect(isValidPhone('+0123456789')).toBe(false);
    expect(isValidPhone('+12')).toBe(false);
  });
});

describe('access request submission', () => {
  it('stores the request before reporting success and records email acceptance separately', async () => {
    const { deps, store, sender } = setup();
    const result = await submitAccessRequest(deps, valid, { hash: 'client-a' });
    expect(result).toMatchObject({ kind: 'recorded', duplicate: false, email: { configured: true, status: 'accepted' } });
    const [record] = store.records.values();
    expect(record.phone).toBe('+442079460000');
    expect(record.emailStatus).toBe('accepted');
    expect(record.emailProviderId).toBe('mock-1');
    expect(sender.sent).toHaveLength(1);
  });

  it('returns the same request for repeated clicks without sending a second email', async () => {
    const { deps, store, sender } = setup();
    const first = await submitAccessRequest(deps, valid, { hash: 'client-a' });
    const again = await Promise.all([1, 2, 3].map(() => submitAccessRequest(deps, valid, { hash: 'client-a' })));
    expect(store.records.size).toBe(1);
    expect(sender.sent).toHaveLength(1);
    for (const result of again) {
      expect(result).toMatchObject({ kind: 'recorded', duplicate: true });
      if (result.kind === 'recorded' && first.kind === 'recorded') expect(result.reference).toBe(first.reference);
    }
  });

  it('rejects the hidden spam field, implausibly fast forms and unconfirmed requests', async () => {
    const { deps, store } = setup();
    expect(await submitAccessRequest(deps, { ...valid, website: 'x' }, { hash: 'c' })).toEqual({ kind: 'rejected' });
    expect(await submitAccessRequest(deps, { ...valid, elapsedMs: 300 }, { hash: 'c' })).toEqual({ kind: 'rejected' });
    expect(await submitAccessRequest(deps, { ...valid, confirmed: false }, { hash: 'c' })).toMatchObject({ kind: 'invalid' });
    expect(store.records.size).toBe(0);
  });

  it('reports field errors without storing anything', async () => {
    const { deps, store } = setup();
    const result = await submitAccessRequest(deps, { ...valid, email: 'nope', phone: '07946' }, { hash: 'c' });
    expect(result).toEqual({ kind: 'invalid', errors: { email: 'invalid_email', phone: 'invalid_phone' } });
    expect(store.records.size).toBe(0);
  });

  it('limits how many requests one client can send in an hour', async () => {
    const { deps } = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await submitAccessRequest(deps, { ...valid, submissionId: `test-submission-10${i}0` }, { hash: 'busy' })).kind).toBe('recorded');
    }
    expect(await submitAccessRequest(deps, { ...valid, submissionId: 'test-submission-9999' }, { hash: 'busy' })).toEqual({ kind: 'rate_limited' });
  });

  it('stops parallel submissions from one client at the limit', async () => {
    const { deps, store } = setup();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) =>
      submitAccessRequest(deps, { ...valid, submissionId: `test-submission-20${i}0` }, { hash: 'burst' })));
    expect(results.filter((r) => r.kind === 'recorded')).toHaveLength(5);
    expect(store.records.size).toBe(5);
  });

  it('caps requests from everyone together in an hour', async () => {
    const { deps } = setup();
    for (let i = 0; i < MAX_REQUESTS_PER_HOUR; i += 1) {
      await submitAccessRequest(deps, { ...valid, submissionId: `test-submission-3${String(i).padStart(3, '0')}` }, { hash: `client-${i}` });
    }
    expect(await submitAccessRequest(deps, { ...valid, submissionId: 'test-submission-3999' }, { hash: 'fresh' })).toEqual({ kind: 'rate_limited' });
  });

  it('rate-limits an IPv6 /64 as one client', () => {
    expect(clientNetwork('2001:db8:aa:bb:1:2:3:4')).toBe(clientNetwork('2001:0db8:00aa:00bb::9'));
    expect(clientNetwork('2001:db8:aa:bb::1')).not.toBe(clientNetwork('2001:db8:aa:bc::1'));
    expect(clientNetwork('203.0.113.7')).toBe('203.0.113.7');
  });

  it('keeps the request pending when email is not configured', async () => {
    const { deps, store } = setup({ sender: null });
    const result = await submitAccessRequest(deps, valid, { hash: 'c' });
    expect(result).toMatchObject({ kind: 'recorded', email: { configured: false, status: 'pending' } });
    expect([...store.records.values()][0].emailStatus).toBe('pending');
  });

  it('surfaces a storage failure instead of claiming success', async () => {
    const { deps, store } = setup();
    store.failInserts = true;
    await expect(submitAccessRequest(deps, valid, { hash: 'c' })).rejects.toThrow('mock_store_unavailable');
  });
});

describe('email retries', () => {
  it('retries a temporary provider failure later and records the acceptance', async () => {
    const { deps, store, sender, advance } = setup();
    sender.results = [{ ok: false, error: 'provider_http_503', retryable: true }];
    const result = await submitAccessRequest(deps, valid, { hash: 'c' });
    expect(result).toMatchObject({ kind: 'recorded', email: { status: 'pending' } });
    const record = [...store.records.values()][0];
    expect(record.emailLastError).toBe('provider_http_503');

    expect(await processDueEmails(deps)).toEqual({ attempted: 0, accepted: 0 }); // not due yet
    advance(6 * 60_000);
    expect(await processDueEmails(deps)).toEqual({ attempted: 1, accepted: 1 });
    expect(record.emailStatus).toBe('accepted');
    expect(record.emailAttempts).toBe(2);
  });

  it('marks a permanent failure and lets an operator requeue it', async () => {
    const { deps, store, sender } = setup();
    sender.results = [{ ok: false, error: 'provider_http_401', retryable: false }];
    await submitAccessRequest(deps, valid, { hash: 'c' });
    const record = [...store.records.values()][0];
    expect(record.emailStatus).toBe('failed');
    expect(await store.requeueFailed('2026-10-20T10:00:00.000Z')).toBe(1);
    expect(await processDueEmails(deps)).toEqual({ attempted: 1, accepted: 1 });
    expect(record.emailStatus).toBe('accepted');
  });

  it('stops scheduling after the attempt limit', () => {
    const now = new Date('2026-10-20T10:00:00Z');
    expect(nextAttemptAfter(1, now)).toBe('2026-10-20T10:05:00.000Z');
    expect(nextAttemptAfter(MAX_EMAIL_ATTEMPTS, now)).toBeNull();
  });

  it('shows an operator the stored status without personal details', async () => {
    const { deps, store } = setup();
    const result = await submitAccessRequest(deps, valid, { hash: 'c' });
    if (result.kind !== 'recorded') throw new Error('not recorded');
    const status = await store.statusOf(result.reference);
    expect(status).toMatchObject({ reference: result.reference, emailStatus: 'accepted', emailProviderId: 'mock-1' });
    expect(JSON.stringify(status)).not.toContain('test.visitor@example.com');
    expect(await store.statusOf('ARQ-MISSING0')).toBeNull();
  });

  it('purges requests older than the retention period', async () => {
    const { deps, store, advance } = setup();
    await submitAccessRequest(deps, valid, { hash: 'c' });
    advance(181 * 86_400_000);
    expect(await purgeExpired(deps)).toBe(1);
    expect(store.records.size).toBe(0);
  });
});

describe('access request email', () => {
  it('escapes visitor text and keeps it on single lines', () => {
    const message = composeAccessRequestEmail({
      id: 'id', submissionId: 's', reference: 'ARQ-TEST0001', firstName: '<b>Eve</b>', lastName: 'Line\nBcc: x@y.z',
      email: 'e@example.com', phone: '+4420', page: '/journey/', locale: 'fa', clientHash: 'h', createdAt: '2026-10-20T10:00:00.000Z',
      emailStatus: 'pending', emailAttempts: 0, emailLastError: null, emailProviderId: null, emailAcceptedAt: null, nextAttemptAt: null,
    });
    expect(message.subject).toBe('ARIMA access request ARQ-TEST0001');
    expect(message.html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
    expect(message.html).not.toContain('<b>Eve</b>');
    expect(message.text).toContain('Last name: Line Bcc: x@y.z');
    expect(message.text).toContain('Originating page: https://arimafinance.xyz/journey/');
    expect(message.text).toContain('no account has been created or approved');
  });
});
