// Durable storage for access requests. Production uses a Cloudflare D1 binding;
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

export interface AccessRequestStore {
  /** Inserts the record, or returns the existing one with the same submissionId. */
  insert(record: AccessRequestRecord): Promise<{ record: AccessRequestRecord; duplicate: boolean }>;
  countRecentByClient(clientHash: string, sinceIso: string): Promise<number>;
  /** Records still waiting for email whose next attempt is due. */
  dueForEmail(nowIso: string, limit: number): Promise<AccessRequestRecord[]>;
  recordEmailOutcome(id: string, outcome: EmailOutcome): Promise<void>;
  purgeOlderThan(cutoffIso: string): Promise<number>;
  /** Puts requests whose email failed for good back in the queue (after a configuration fix). */
  requeueFailed(nowIso: string): Promise<number>;
}

// Minimal D1 surface, so the app does not depend on Workers type packages.
type D1Result<T> = { results?: T[]; meta?: { changes?: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
};
export type D1DatabaseLike = { prepare(query: string): D1Statement };

type Row = {
  id: string; submission_id: string; reference: string; first_name: string; last_name: string; email: string; phone: string;
  page: string; locale: string; client_hash: string; created_at: string; email_status: string; email_attempts: number;
  email_last_error: string | null; email_provider_id: string | null; email_accepted_at: string | null; next_attempt_at: string | null;
};

function fromRow(row: Row): AccessRequestRecord {
  return {
    id: row.id, submissionId: row.submission_id, reference: row.reference,
    firstName: row.first_name, lastName: row.last_name, email: row.email, phone: row.phone,
    page: row.page, locale: row.locale === 'fa' ? 'fa' : 'en', clientHash: row.client_hash, createdAt: row.created_at,
    emailStatus: (row.email_status as EmailStatus) ?? 'pending', emailAttempts: row.email_attempts,
    emailLastError: row.email_last_error, emailProviderId: row.email_provider_id,
    emailAcceptedAt: row.email_accepted_at, nextAttemptAt: row.next_attempt_at,
  };
}

export class D1AccessRequestStore implements AccessRequestStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async insert(record: AccessRequestRecord) {
    const result = await this.db.prepare(
      `INSERT INTO access_requests (id, submission_id, reference, first_name, last_name, email, phone, page, locale, client_hash,
        created_at, email_status, email_attempts, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
       ON CONFLICT(submission_id) DO NOTHING`,
    ).bind(record.id, record.submissionId, record.reference, record.firstName, record.lastName, record.email, record.phone,
      record.page, record.locale, record.clientHash, record.createdAt, record.createdAt).run();
    const row = await this.db.prepare('SELECT * FROM access_requests WHERE submission_id = ?').bind(record.submissionId).first<Row>();
    if (!row) throw new Error('access_request_not_persisted');
    return { record: fromRow(row), duplicate: (result.meta?.changes ?? 0) === 0 };
  }

  async countRecentByClient(clientHash: string, sinceIso: string) {
    const row = await this.db.prepare('SELECT COUNT(*) AS n FROM access_requests WHERE client_hash = ? AND created_at >= ?')
      .bind(clientHash, sinceIso).first<{ n: number }>();
    return row?.n ?? 0;
  }

  async dueForEmail(nowIso: string, limit: number) {
    const { results } = await this.db.prepare(
      `SELECT * FROM access_requests WHERE email_status IN ('pending', 'failed') AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?
       ORDER BY created_at LIMIT ?`,
    ).bind(nowIso, limit).all<Row>();
    return (results ?? []).map(fromRow);
  }

  async recordEmailOutcome(id: string, outcome: EmailOutcome) {
    if (outcome.status === 'accepted') {
      await this.db.prepare(
        `UPDATE access_requests SET email_status = 'accepted', email_attempts = email_attempts + 1, email_last_error = NULL,
          email_provider_id = ?, email_accepted_at = ?, next_attempt_at = NULL WHERE id = ?`,
      ).bind(outcome.providerId, outcome.at, id).run();
      return;
    }
    await this.db.prepare(
      `UPDATE access_requests SET email_status = ?, email_attempts = email_attempts + 1, email_last_error = ?, next_attempt_at = ? WHERE id = ?`,
    ).bind(outcome.status, outcome.error, outcome.nextAttemptAt, id).run();
  }

  async purgeOlderThan(cutoffIso: string) {
    const result = await this.db.prepare('DELETE FROM access_requests WHERE created_at < ?').bind(cutoffIso).run();
    return result.meta?.changes ?? 0;
  }

  async requeueFailed(nowIso: string) {
    const result = await this.db.prepare(
      `UPDATE access_requests SET email_status = 'pending', email_attempts = 0, next_attempt_at = ? WHERE email_status = 'failed'`,
    ).bind(nowIso).run();
    return result.meta?.changes ?? 0;
  }
}

/** MOCK store for tests only. Keeps records in memory and can be told to fail. */
export class MemoryAccessRequestStore implements AccessRequestStore {
  readonly records = new Map<string, AccessRequestRecord>();
  failInserts = false;

  async insert(record: AccessRequestRecord) {
    if (this.failInserts) throw new Error('mock_store_unavailable');
    const existing = [...this.records.values()].find((r) => r.submissionId === record.submissionId);
    if (existing) return { record: { ...existing }, duplicate: true };
    const stored = { ...record, emailStatus: 'pending' as const, emailAttempts: 0, nextAttemptAt: record.createdAt };
    this.records.set(record.id, stored);
    return { record: { ...stored }, duplicate: false };
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
}
