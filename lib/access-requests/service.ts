// Access-request workflow: validate → rate-limit → store durably → try email → record the outcome.
// Success is reported to the visitor only after the record is stored. Email acceptance by the
// provider is reported separately and is never presented as inbox delivery.
import type { EmailSender } from './email';
import type { AccessRequestRecord, AccessRequestStore, EmailOutcome } from './store';
import {
  isValidSubmissionId, normaliseLocale, normalisePage, validateAccessRequest, type FieldErrors,
} from './validation';

export const MAX_EMAIL_ATTEMPTS = 6;
export const MAX_REQUESTS_PER_CLIENT_PER_HOUR = 5;
// A ceiling for everyone together, so rotating addresses cannot flood the inbox or the Resend quota.
export const MAX_REQUESTS_PER_HOUR = 30;
export const MIN_FORM_MILLISECONDS = 2500;

export type SubmitResult =
  | { kind: 'recorded'; reference: string; duplicate: boolean; email: { configured: boolean; status: AccessRequestRecord['emailStatus'] } }
  | { kind: 'invalid'; errors: FieldErrors | { submission: string } }
  | { kind: 'rejected' }
  | { kind: 'rate_limited' };

export type ServiceDeps = {
  store: AccessRequestStore;
  sender: EmailSender | null;
  retentionDays: number;
  now?: () => Date;
  randomId?: () => string;
};

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeReference(random: Uint8Array = crypto.getRandomValues(new Uint8Array(8))): string {
  return 'ARQ-' + [...random].map((b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join('');
}

export async function hashClient(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function nextAttemptAfter(attempts: number, now: Date): string | null {
  if (attempts >= MAX_EMAIL_ATTEMPTS) return null;
  const minutes = Math.min(5 * 2 ** (attempts - 1), 24 * 60);
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

async function attemptEmail(deps: ServiceDeps, record: AccessRequestRecord): Promise<AccessRequestRecord['emailStatus']> {
  if (!deps.sender) return 'pending';
  const now = (deps.now ?? (() => new Date()))();
  const result = await deps.sender.send(record);
  const attempts = record.emailAttempts + 1;
  let outcome: EmailOutcome;
  if (result.ok) {
    outcome = { status: 'accepted', providerId: result.providerId, at: now.toISOString() };
  } else {
    const next = result.retryable ? nextAttemptAfter(attempts, now) : null;
    outcome = { status: next ? 'pending' : 'failed', error: result.error, nextAttemptAt: next };
  }
  await deps.store.recordEmailOutcome(record.id, outcome);
  // Routine logs carry the reference and status only, never personal details.
  console.log(`[access-request] ${record.reference} email ${outcome.status}${'error' in outcome ? ` (${outcome.error})` : ''}`);
  return outcome.status;
}

export async function submitAccessRequest(
  deps: ServiceDeps,
  input: Record<string, unknown>,
  client: { hash: string },
): Promise<SubmitResult> {
  // Spam checks: a hidden field people never fill, and a form completed implausibly fast.
  if (typeof input.website === 'string' && input.website.trim() !== '') return { kind: 'rejected' };
  const elapsed = Number(input.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FORM_MILLISECONDS) return { kind: 'rejected' };
  if (!isValidSubmissionId(input.submissionId)) return { kind: 'invalid', errors: { submission: 'invalid_submission_id' } };
  if (input.confirmed !== true) return { kind: 'invalid', errors: { submission: 'not_confirmed' } };

  const { fields, errors } = validateAccessRequest(input);
  if (Object.keys(errors).length) return { kind: 'invalid', errors };

  const now = (deps.now ?? (() => new Date()))();
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  if (await deps.store.countRecentByClient(client.hash, hourAgo) >= MAX_REQUESTS_PER_CLIENT_PER_HOUR) return { kind: 'rate_limited' };

  const inserted = await deps.store.insert({
    ...fields,
    id: (deps.randomId ?? (() => crypto.randomUUID()))(),
    submissionId: input.submissionId,
    reference: makeReference(),
    page: normalisePage(input.page),
    locale: normaliseLocale(input.locale),
    clientHash: client.hash,
    createdAt: now.toISOString(),
    emailStatus: 'pending', emailAttempts: 0, emailLastError: null, emailProviderId: null, emailAcceptedAt: null,
    nextAttemptAt: now.toISOString(),
  }, { sinceIso: hourAgo, perClient: MAX_REQUESTS_PER_CLIENT_PER_HOUR, total: MAX_REQUESTS_PER_HOUR });
  if (inserted.rateLimited) return { kind: 'rate_limited' };
  const { record, duplicate } = inserted;

  let status = record.emailStatus;
  if (!duplicate) {
    try {
      status = await attemptEmail(deps, record);
    } catch {
      status = 'pending'; // the record is stored; a later retry picks it up
    }
    await processDueEmails(deps, 2).catch(() => undefined);
    await purgeExpired(deps).catch(() => undefined);
  }
  return { kind: 'recorded', reference: record.reference, duplicate, email: { configured: Boolean(deps.sender), status } };
}

/** Retries stored requests whose email is still pending and due. */
export async function processDueEmails(deps: ServiceDeps, limit = 10) {
  if (!deps.sender) return { attempted: 0, accepted: 0 };
  const now = (deps.now ?? (() => new Date()))();
  const due = await deps.store.dueForEmail(now.toISOString(), limit);
  let accepted = 0;
  for (const record of due) if ((await attemptEmail(deps, record)) === 'accepted') accepted += 1;
  return { attempted: due.length, accepted };
}

export async function purgeExpired(deps: ServiceDeps) {
  const now = (deps.now ?? (() => new Date()))();
  return deps.store.purgeOlderThan(new Date(now.getTime() - deps.retentionDays * 86_400_000).toISOString());
}
