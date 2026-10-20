// Deploy step: asks the live Worker to check its Resend setup (the key stays on the Worker), reports the
// domain status and any DNS records still needed, and switches the sender to the ARIMA domain once verified.
import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.env.SITE_URL ?? 'https://arimafinance.xyz';
const summary = (line = '') => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
const adminToken = readFileSync(`${process.env.RUNNER_TEMP ?? '/tmp'}/access-request-admin-token`, 'utf8').trim();

const response = await fetch(`${base}/api/access-requests/email-setup`, {
  method: 'POST', headers: { Authorization: `Bearer ${adminToken}` },
});
const result = await response.json().catch(() => ({}));
const { records = [], ...domain } = result.domain ?? {};
console.log(`email-setup -> HTTP ${response.status}`, JSON.stringify({ ...result, domain }));
summary('## Access-request email');
if (!result.emailConfigured) {
  summary('- RESEND_API_KEY is not set on the Worker, so email is off. Requests are still stored.');
  process.exit(0);
}
summary(`- Sender in use: \`${result.from}\``);
summary(`- Domain \`${domain.domain ?? 'arimafinance.xyz'}\` in Resend: **${domain.status ?? 'check failed'}**`);
if (domain.status === 'verified' && result.from !== domain.recommendedFrom) {
  execFileSync('npx', ['wrangler', 'secret', 'put', 'ACCESS_REQUEST_EMAIL_FROM'], { input: domain.recommendedFrom, stdio: ['pipe', 'inherit', 'inherit'] });
  summary(`- Sender switched to \`${domain.recommendedFrom}\``);
}
if (records.length && domain.status !== 'verified') {
  summary('\nAdd these DNS records for the domain, then re-run this workflow:\n');
  summary('| Type | Name | Value | Priority | Status |');
  summary('| --- | --- | --- | --- | --- |');
  for (const r of records) summary(`| ${r.type} | \`${r.name}\` | \`${r.value}\` | ${r.priority ?? ''} | ${r.status ?? ''} |`);
  for (const r of records) console.log(`DNS ${r.type} ${r.name} ${r.priority ?? ''} ${r.value} (${r.status ?? ''})`);
}
