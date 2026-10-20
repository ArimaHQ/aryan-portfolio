// Durable Object that stores access requests in its own SQLite database. It is part of the
// Worker deployment itself, so it needs no separate database resource or extra API permission.
import { DurableObject } from 'cloudflare:workers';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  reference TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  page TEXT NOT NULL,
  locale TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_attempts INTEGER NOT NULL DEFAULT 0,
  email_last_error TEXT,
  email_provider_id TEXT,
  email_accepted_at TEXT,
  next_attempt_at TEXT
);
CREATE INDEX IF NOT EXISTS access_requests_created_at ON access_requests (created_at);
CREATE INDEX IF NOT EXISTS access_requests_client_hash ON access_requests (client_hash, created_at);
CREATE INDEX IF NOT EXISTS access_requests_email_status ON access_requests (email_status, next_attempt_at);
`;

export class AccessRequestsStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => { this.sql.exec(SCHEMA); });
  }

  insert(r) {
    const written = this.sql.exec(
      `INSERT INTO access_requests (id, submission_id, reference, first_name, last_name, email, phone, page, locale, client_hash,
        created_at, email_status, email_attempts, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
       ON CONFLICT(submission_id) DO NOTHING`,
      r.id, r.submissionId, r.reference, r.firstName, r.lastName, r.email, r.phone, r.page, r.locale, r.clientHash, r.createdAt, r.createdAt,
    ).rowsWritten;
    const row = this.sql.exec('SELECT * FROM access_requests WHERE submission_id = ?', r.submissionId).toArray()[0];
    if (!row) throw new Error('access_request_not_persisted');
    return { row, duplicate: written === 0 };
  }

  countRecentByClient(clientHash, sinceIso) {
    return this.sql.exec('SELECT COUNT(*) AS n FROM access_requests WHERE client_hash = ? AND created_at >= ?', clientHash, sinceIso).one().n;
  }

  dueForEmail(nowIso, limit) {
    return this.sql.exec(
      `SELECT * FROM access_requests WHERE email_status IN ('pending', 'failed') AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?
       ORDER BY created_at LIMIT ?`, nowIso, limit,
    ).toArray();
  }

  recordEmailOutcome(id, o) {
    if (o.status === 'accepted') {
      this.sql.exec(
        `UPDATE access_requests SET email_status = 'accepted', email_attempts = email_attempts + 1, email_last_error = NULL,
          email_provider_id = ?, email_accepted_at = ?, next_attempt_at = NULL WHERE id = ?`, o.providerId, o.at, id,
      );
      return;
    }
    this.sql.exec(
      'UPDATE access_requests SET email_status = ?, email_attempts = email_attempts + 1, email_last_error = ?, next_attempt_at = ? WHERE id = ?',
      o.status, o.error, o.nextAttemptAt, id,
    );
  }

  purgeOlderThan(cutoffIso) {
    return this.sql.exec('DELETE FROM access_requests WHERE created_at < ?', cutoffIso).rowsWritten;
  }

  requeueFailed(nowIso) {
    return this.sql.exec(
      "UPDATE access_requests SET email_status = 'pending', email_attempts = 0, next_attempt_at = ? WHERE email_status = 'failed'", nowIso,
    ).rowsWritten;
  }

  /** Operator view without personal details: one line per request. */
  statusOf(reference) {
    return this.sql.exec(
      'SELECT reference, created_at, email_status, email_attempts, email_last_error, email_provider_id, email_accepted_at FROM access_requests WHERE reference = ?',
      reference,
    ).toArray()[0] ?? null;
  }
}
