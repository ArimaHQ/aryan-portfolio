// Durable storage for access requests. Production uses the AccessRequestsStore Durable Object
// (SQLite, lib/access-requests/durable-object.mjs);
// tests use MemoryAccessRequestStore (a labelled mock, never used in production).
import type { AccessRequestFields } from './validation';

export type EmailStatus = 'pending' | 'accepted' | 'failed';

export type AccessRequestRecord = AccessRequestFields & {
  id: string;
  submissionId: string;
  reference: string;
  page: string;
  locale: 'en' | 'fa';
  clientHash: string;
  createdAt: string;
  emailStatus: EmailStatus;
  emailAttempts: number;
  emailLastError: string | null;
  emailProviderId: string | null;
  emailAcceptedAt: string | null;
  nextAttemptAt: string | null;
};

export type EmailOutcome =
  | { status: 'accepted'; providerId: string | null; at: string }
  | { status: 'failed' | 'pending'; error: string; nextAttemptAt: string | null };

export type RequestStatus = Pick<AccessRequestRecord,
  'reference' | 'createdAt' | 'emailStatus' | 'emailAttempts' | 'emailLastError' | 'emailProviderId' | 'emailAcceptedAt'> & {
  /** What Resend later reported for the accepted email (delivered, bounced, ...), via webhook. */
  emailDelivery: string | null; emailDeliveryAt: string | null;
};

export type InsertLimits = { sinceIso: string; perClient: number; total: number };
export type InsertResult =
  | { record: AccessRequestRecord; duplicate: boolean; rateLimited?: false }
  | { rateLimited: true };

export interface AccessRequestStore {
  /**
   * Inserts the record, or returns the existing one with the same submissionId. With limits, the count and
   * the insert happen together, so parallel submissions cannot pass the limit.
   */
  insert(record: AccessRequestRecord, limits?: InsertLimits): Promise<InsertResult>;
  countRecentByClient(clientHash: string, sinceIso: string): Promise<number>;
  /** A random salt kept by the store, created on first use. */
  clientSalt(): Promise<string>;
  /** Records still waiting for email whose next attempt is due. */
  dueForEmail(nowIso: string, limit: number): Promise<AccessRequestRecord[]>;
  recordEmailOutcome(id: string, outcome: EmailOutcome): Promise<void>;
  purgeOlderThan(cutoffIso: string): Promise<number>;
  /** Puts requests whose email failed for good back in the queue (after a configuration fix). */
  requeueFailed(nowIso: string): Promise<number>;
  /** Operator view of one request, without personal details. */
  statusOf(reference: string): Promise<RequestStatus | null>;
}

type Row = {
  id: string; submission_id: string; reference: string; first_name: string; last_name: string; email: string; phone: string;
  page: string; locale: string; client_hash: string; created_at: string; email_status: string; email_attempts: number;
  email_last_error: string | null; email_provider_id: string | null; email_accepted_at: string | null; next_attempt_at: string | null;
};

export function fromRow(row: Row): AccessRequestRecord {
  return {
    id: row.id, submissionId: row.submission_id, reference: row.reference,
    firstName: row.first_name, lastName: row.last_name, email: row.email, phone: row.phone,
    page: row.page, locale: row.locale === 'fa' ? 'fa' : 'en', clientHash: row.client_hash, createdAt: row.created_at,
    emailStatus: (row.email_status as EmailStatus) ?? 'pending', emailAttempts: row.email_attempts,
    emailLastError: row.email_last_error, emailProviderId: row.email_provider_id,
    emailAcceptedAt: row.email_accepted_at, nextAttemptAt: row.next_attempt_at,
  };
}

// RPC surface of the Durable Object (see durable-object.mjs). Rows come back as plain objects.
type StoreStub = {
  insert(record: AccessRequestRecord, limits?: InsertLimits): Promise<{ row: Row; duplicate: boolean } | { rateLimited: true }>;
  countRecentByClient(clientHash: string, sinceIso: string): Promise<number>;
  clientSalt(): Promise<string>;
  dueForEmail(nowIso: string, limit: number): Promise<Row[]>;
  recordEmailOutcome(id: string, outcome: EmailOutcome): Promise<void>;
  purgeOlderThan(cutoffIso: string): Promise<number>;
  requeueFailed(nowIso: string): Promise<number>;
  statusOf(reference: string): Promise<Row | null>;
};
export type DurableObjectNamespaceLike = { idFromName(name: string): unknown; get(id: unknown): unknown };

export class DurableObjectAccessRequestStore implements AccessRequestStore {
  private readonly stub: StoreStub;

  constructor(namespace: DurableObjectNamespaceLike) {
    // One instance holds every request, so idempotency and rate limits see all of them.
    this.stub = namespace.get(namespace.idFromName('access-requests')) as StoreStub;
  }

  async insert(record: AccessRequestRecord, limits?: InsertLimits): Promise<InsertResult> {
    const result = await this.stub.insert(record, limits);
    if ('rateLimited' in result) return { rateLimited: true };
    return { record: fromRow(result.row), duplicate: result.duplicate };
  }

  countRecentByClient(clientHash: string, sinceIso: string) {
    return this.stub.countRecentByClient(clientHash, sinceIso);
  }

  clientSalt() {
    return this.stub.clientSalt();
  }

  async dueForEmail(nowIso: string, limit: number) {
    return (await this.stub.dueForEmail(nowIso, limit)).map(fromRow);
  }

  recordEmailOutcome(id: string, outcome: EmailOutcome) {
    return this.stub.recordEmailOutcome(id, outcome);
  }

  purgeOlderThan(cutoffIso: string) {
    return this.stub.purgeOlderThan(cutoffIso);
  }

  requeueFailed(nowIso: string) {
    return this.stub.requeueFailed(nowIso);
  }

  async statusOf(reference: string) {
    const row = await this.stub.statusOf(reference);
    if (!row) return null;
    const delivery = row as unknown as { email_delivery?: string | null; email_delivery_at?: string | null };
    return { ...toStatus(fromRow(row)), emailDelivery: delivery.email_delivery ?? null, emailDeliveryAt: delivery.email_delivery_at ?? null };
  }
}

/** MOCK store for tests only. Keeps records in memory and can be told to fail. */
export class MemoryAccessRequestStore implements AccessRequestStore {
  readonly records = new Map<string, AccessRequestRecord>();
  failInserts = false;

  async insert(record: AccessRequestRecord, limits?: InsertLimits): Promise<InsertResult> {
    if (this.failInserts) throw new Error('mock_store_unavailable');
    const existing = [...this.records.values()].find((r) => r.submissionId === record.submissionId);
    if (existing) return { record: { ...existing }, duplicate: true };
    if (limits) {
      const recent = [...this.records.values()].filter((r) => r.createdAt >= limits.sinceIso);
      if (recent.length >= limits.total || recent.filter((r) => r.clientHash === record.clientHash).length >= limits.perClient) {
        return { rateLimited: true };
      }
    }
    const stored = { ...record, emailStatus: 'pending' as const, emailAttempts: 0, nextAttemptAt: record.createdAt };
    this.records.set(record.id, stored);
    return { record: { ...stored }, duplicate: false };
  }

  async clientSalt() {
    return 'mock-salt';
  }

  async countRecentByClient(clientHash: string, sinceIso: string) {
    return [...this.records.values()].filter((r) => r.clientHash === clientHash && r.createdAt >= sinceIso).length;
  }

  async dueForEmail(nowIso: string, limit: number) {
    return [...this.records.values()]
      .filter((r) => r.emailStatus !== 'accepted' && r.nextAttemptAt !== null && r.nextAttemptAt <= nowIso)
      .slice(0, limit).map((r) => ({ ...r }));
  }

  async recordEmailOutcome(id: string, outcome: EmailOutcome) {
    const r = this.records.get(id);
    if (!r) return;
    r.emailAttempts += 1;
    if (outcome.status === 'accepted') {
      Object.assign(r, { emailStatus: 'accepted', emailLastError: null, emailProviderId: outcome.providerId, emailAcceptedAt: outcome.at, nextAttemptAt: null });
    } else {
      Object.assign(r, { emailStatus: outcome.status, emailLastError: outcome.error, nextAttemptAt: outcome.nextAttemptAt });
    }
  }

  async purgeOlderThan(cutoffIso: string) {
    let n = 0;
    for (const [id, r] of this.records) if (r.createdAt < cutoffIso) { this.records.delete(id); n += 1; }
    return n;
  }

  async requeueFailed(nowIso: string) {
    let n = 0;
    for (const r of this.records.values()) if (r.emailStatus === 'failed') { Object.assign(r, { emailStatus: 'pending', emailAttempts: 0, nextAttemptAt: nowIso }); n += 1; }
    return n;
  }

  async statusOf(reference: string) {
    const record = [...this.records.values()].find((r) => r.reference === reference);
    return record ? toStatus(record) : null;
  }
}

function toStatus(r: AccessRequestRecord): RequestStatus {
  const { reference, createdAt, emailStatus, emailAttempts, emailLastError, emailProviderId, emailAcceptedAt } = r;
  return { reference, createdAt, emailStatus, emailAttempts, emailLastError, emailProviderId, emailAcceptedAt, emailDelivery: null, emailDeliveryAt: null };
}
