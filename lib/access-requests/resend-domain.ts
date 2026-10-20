// Checks the Resend sending domain with the Worker's own RESEND_API_KEY, so the key never has to leave
// Cloudflare. Adds the domain when it is missing and asks Resend to re-check DNS when it is not verified.
export const SENDING_DOMAIN = 'arimafinance.xyz';
export const VERIFIED_FROM = `ARIMA Access <access@${SENDING_DOMAIN}>`;
// Until the domain is verified, Resend's shared test sender delivers only to the account owner's address.
export const TEST_FROM = 'ARIMA Access <onboarding@resend.dev>';

export type DnsRecord = { type: string; name: string; value: string; priority?: number; status?: string };
export type DomainCheck = { domain: string; status: string; records: DnsRecord[]; recommendedFrom: string };

export async function checkSendingDomain(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<DomainCheck> {
  const call = async (path: string, init: RequestInit = {}) => {
    const response = await fetchImpl(`https://api.resend.com${path}`, {
      ...init, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    return { status: response.status, body: (await response.json().catch(() => ({}))) as Record<string, unknown> };
  };
  const result = (status: string, records: DnsRecord[] = []): DomainCheck => ({
    domain: SENDING_DOMAIN, status, records, recommendedFrom: status === 'verified' ? VERIFIED_FROM : TEST_FROM,
  });

  const listed = await call('/domains');
  // A sending-only key cannot read domains; sending still works.
  if (listed.status !== 200) return result(`unreadable_http_${listed.status}`);
  let domain = ((listed.body.data as { id: string; name: string }[] | undefined) ?? []).find((d) => d.name === SENDING_DOMAIN);
  if (!domain) {
    const created = await call('/domains', { method: 'POST', body: JSON.stringify({ name: SENDING_DOMAIN }) });
    if (created.status !== 200 && created.status !== 201) return result(`create_failed_http_${created.status}`);
    domain = created.body as { id: string; name: string };
  }
  const detail = await call(`/domains/${domain.id}`);
  const status = typeof detail.body.status === 'string' ? detail.body.status : 'unknown';
  const records = ((detail.body.records as DnsRecord[] | undefined) ?? []).map(({ type, name, value, priority, status: s }) => ({
    type, name, value, priority, status: s,
  }));
  if (status !== 'verified') await call(`/domains/${domain.id}/verify`, { method: 'POST' });
  return result(status, records);
}
