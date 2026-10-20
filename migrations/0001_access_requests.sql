-- Access requests submitted from the ARIMA Journey guide.
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
