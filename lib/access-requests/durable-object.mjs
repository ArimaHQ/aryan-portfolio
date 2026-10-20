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
CREATE TABLE IF NOT EXISTS email_webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  email_id TEXT,
  received_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS email_webhook_events_received_at ON email_webhook_events (received_at);
CREATE TABLE IF NOT EXISTS inbound_emails (
  email_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_addresses TEXT NOT NULL,
  cc_addresses TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_id TEXT,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  body_text TEXT,
  body_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS inbound_emails_received_at ON inbound_emails (received_at);
CREATE TABLE IF NOT EXISTS store_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

// Personal data is kept this long, then removed by a daily alarm even when nothing else happens.
const RETENTION_DAYS = 180;
const DAY_MS = 86_400_000;
// Newest received emails kept, so spam to the inbound address cannot grow storage without bound.
const MAX_INBOUND_EMAILS = 500;

// Columns added after the first release; SQLite has no ADD COLUMN IF NOT EXISTS.
const ADDED_COLUMNS = [['access_requests', 'email_delivery', 'TEXT'], ['access_requests', 'email_delivery_at', 'TEXT']];

export class AccessRequestsStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(SCHEMA);
      for (const [table, column, type] of ADDED_COLUMNS) {
        const exists = this.sql.exec(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`, column).toArray().length > 0;
        if (!exists) this.sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
      if ((await ctx.storage.getAlarm()) === null) await ctx.storage.setAlarm(Date.now() + DAY_MS);
    });
    this.storage = ctx.storage;
  }

  /** Daily retention purge across all tables. */
  async alarm() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    this.sql.exec('DELETE FROM access_requests WHERE created_at < ?', cutoff);
    this.sql.exec('DELETE FROM inbound_emails WHERE received_at < ?', cutoff);
    this.sql.exec('DELETE FROM email_webhook_events WHERE received_at < ?', cutoff);
    await this.storage.setAlarm(Date.now() + DAY_MS);
  }

  clientSalt() {
    const existing = this.sql.exec("SELECT value FROM store_meta WHERE key = 'client_salt'").toArray()[0];
    if (existing) return existing.value;
    const salt = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
    this.sql.exec("INSERT INTO store_meta (key, value) VALUES ('client_salt', ?) ON CONFLICT(key) DO NOTHING", salt);
    return this.sql.exec("SELECT value FROM store_meta WHERE key = 'client_salt'").one().value;
  }

  insert(r, limits) {
    return this.storage.transactionSync(() => {
      const existing = this.sql.exec('SELECT * FROM access_requests WHERE submission_id = ?', r.submissionId).toArray()[0];
      if (existing) return { row: existing, duplicate: true };
      if (limits) {
        const total = this.sql.exec('SELECT COUNT(*) AS n FROM access_requests WHERE created_at >= ?', limits.sinceIso).one().n;
        const mine = this.countRecentByClient(r.clientHash, limits.sinceIso);
        if (total >= limits.total || mine >= limits.perClient) return { rateLimited: true };
      }
      return this.insertRow(r);
    });
  }

  insertRow(r) {
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
      `SELECT reference, created_at, email_status, email_attempts, email_last_error, email_provider_id, email_accepted_at,
        email_delivery, email_delivery_at FROM access_requests WHERE reference = ?`,
      reference,
    ).toArray()[0] ?? null;
  }

  /**
   * Records one verified webhook event exactly once (keyed by its event id). Returns duplicate: true
   * for a redelivery, which is then not processed again.
   */
  recordEmailEvent(e, purgeBeforeIso) {
    return this.storage.transactionSync(() => {
      const fresh = this.sql.exec(
        'INSERT INTO email_webhook_events (event_id, type, email_id, received_at) VALUES (?, ?, ?, ?) ON CONFLICT(event_id) DO NOTHING',
        e.eventId, e.type, e.inbound?.emailId ?? e.delivery?.emailId ?? null, e.receivedAt,
      ).rowsWritten;
      if (fresh === 0) return { duplicate: true, matchedRequests: 0 };
      let matchedRequests = 0;
      if (e.inbound) {
        const m = e.inbound;
        this.sql.exec(
          `INSERT INTO inbound_emails (email_id, event_id, received_at, from_address, to_addresses, cc_addresses, subject, message_id, attachment_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email_id) DO NOTHING`,
          m.emailId, e.eventId, m.receivedAt, m.from, JSON.stringify(m.to), JSON.stringify(m.cc), m.subject, m.messageId, m.attachmentCount,
        );
        this.sql.exec(
          'DELETE FROM inbound_emails WHERE email_id NOT IN (SELECT email_id FROM inbound_emails ORDER BY received_at DESC LIMIT ?)',
          MAX_INBOUND_EMAILS,
        );
      }
      if (e.delivery) {
        matchedRequests = this.sql.exec(
          'UPDATE access_requests SET email_delivery = ?, email_delivery_at = ? WHERE email_provider_id = ?',
          e.delivery.status, e.delivery.at, e.delivery.emailId,
        ).rowsWritten;
      }
      if (purgeBeforeIso) {
        this.sql.exec('DELETE FROM inbound_emails WHERE received_at < ?', purgeBeforeIso);
        this.sql.exec('DELETE FROM email_webhook_events WHERE received_at < ?', purgeBeforeIso);
      }
      return { duplicate: false, matchedRequests };
    });
  }

  attachInboundBody(emailId, text, status) {
    this.sql.exec('UPDATE inbound_emails SET body_text = ?, body_status = ? WHERE email_id = ?', text, status, emailId);
  }

  /** Newest received emails, metadata only (no body). */
  recentInbound(limit) {
    return this.sql.exec(
      `SELECT email_id, received_at, from_address, to_addresses, subject, attachment_count, body_status,
        length(body_text) AS body_length FROM inbound_emails ORDER BY received_at DESC LIMIT ?`, limit,
    ).toArray();
  }
}
