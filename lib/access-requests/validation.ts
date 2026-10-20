// Validation for access requests. Every field is untrusted visitor input.

export type AccessRequestFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type FieldErrors = Partial<Record<keyof AccessRequestFields, string>>;

// Letters from any script, combining marks, spaces, apostrophes, hyphens and dots.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .’-]{0,79}$/u;
// A practical address check: one @, no spaces, a dotted domain. Ownership is not verified.
const EMAIL_PATTERN = /^[^\s@"<>()[\]\\,;:]{1,64}@(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
// E.164: a plus, a country code that does not start with 0, and 7–15 digits in total.
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

export function normaliseName(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
}

export function normaliseEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Keeps a leading plus and digits; spaces, dashes, dots and brackets are formatting only.
export function normalisePhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return trimmed.replace(/[\s().-]/g, '');
  return '+' + trimmed.slice(1).replace(/[\s().-]/g, '');
}

export function isValidName(value: string): boolean {
  return NAME_PATTERN.test(value) && !/https?:|www\./i.test(value);
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

export function validateAccessRequest(input: Record<string, unknown>): { fields: AccessRequestFields; errors: FieldErrors } {
  const fields: AccessRequestFields = {
    firstName: normaliseName(input.firstName),
    lastName: normaliseName(input.lastName),
    email: normaliseEmail(input.email),
    phone: normalisePhone(input.phone),
  };
  const errors: FieldErrors = {};
  if (!isValidName(fields.firstName)) errors.firstName = 'invalid_name';
  if (!isValidName(fields.lastName)) errors.lastName = 'invalid_name';
  if (!isValidEmail(fields.email)) errors.email = 'invalid_email';
  if (!isValidPhone(fields.phone)) errors.phone = 'invalid_phone';
  return { fields, errors };
}

const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

export function isValidSubmissionId(value: unknown): value is string {
  return typeof value === 'string' && SUBMISSION_ID_PATTERN.test(value);
}

// Only same-site page paths are kept as the originating page.
export function normalisePage(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/journey/';
  return value.slice(0, 200).replace(/[^\w\-./#?=&%]/g, '');
}

export function normaliseLocale(value: unknown): 'en' | 'fa' {
  return value === 'fa' ? 'fa' : 'en';
}
