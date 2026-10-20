// Verifies Resend webhook signatures (Resend signs webhooks with Svix: svix-id, svix-timestamp and
// svix-signature headers, HMAC-SHA256 over "id.timestamp.body" with the endpoint's whsec_ secret).
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type SignatureHeaders = { id: string | null; timestamp: string | null; signature: string | null };
export type SignatureCheck = { ok: true } | { ok: false; reason: 'missing_headers' | 'stale_timestamp' | 'bad_secret' | 'bad_signature' };

const toBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

function decodeSecret(secret: string): Uint8Array<ArrayBuffer> | null {
  try {
    const raw = atob(secret.startsWith('whsec_') ? secret.slice(6) : secret);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(secret: string, id: string, timestamp: string, body: string): Promise<string | null> {
  const keyBytes = decodeSecret(secret);
  if (!keyBytes || keyBytes.length === 0) return null;
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
}

export async function verifyWebhookSignature(
  secret: string, headers: SignatureHeaders, body: string, now: Date = new Date(),
): Promise<SignatureCheck> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: 'missing_headers' };
  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || Math.abs(now.getTime() / 1000 - seconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'stale_timestamp' };
  }
  const expected = await signPayload(secret, id, timestamp, body);
  if (!expected) return { ok: false, reason: 'bad_secret' };
  // The header may carry several space-separated "v1,<base64>" signatures (during secret rotation).
  const matches = signature.split(' ').some((part) => {
    const [version, value] = part.split(',', 2);
    return version === 'v1' && typeof value === 'string' && equal(value, expected);
  });
  return matches ? { ok: true } : { ok: false, reason: 'bad_signature' };
}
