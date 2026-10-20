// Deploy step: sends one clearly labelled test access request through the live API, then reads back
// its stored record and email status. The test is addressed to the ARIMA destination only.
import { appendFileSync, readFileSync } from 'node:fs';

const base = process.env.SITE_URL ?? 'https://arimafinance.xyz';
const summary = (line = '') => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
let adminToken = '';
try {
  adminToken = readFileSync(`${process.env.RUNNER_TEMP ?? '/tmp'}/access-request-admin-token`, 'utf8').trim();
} catch {
  // No email setup in this run; the stored-record check is skipped.
}

const payload = {
  firstName: 'Test', lastName: 'ARIMA-QA-Test', email: 'aryan.hd@outlook.com',
  phone: '+447700900000', // Ofcom range reserved for drama and testing
  submissionId: `ci-test-${process.env.GITHUB_RUN_ID ?? Date.now()}-${process.env.GITHUB_RUN_ATTEMPT ?? 1}`,
  elapsedMs: 30_000, confirmed: true, website: '', page: '/journey/', locale: 'en',
};

const response = await fetch(`${base}/api/access-requests`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(payload),
});
const result = await response.json().catch(() => ({}));
console.log(`POST /api/access-requests -> HTTP ${response.status}`, JSON.stringify(result));
summary('## Test access request (labelled ARIMA-QA-Test)');
summary(`- API: HTTP ${response.status} \`${JSON.stringify(result)}\``);
if (!result.recorded) {
  summary('- Not recorded.');
  process.exit(1);
}
if (!adminToken) process.exit(0);

await new Promise((resolve) => setTimeout(resolve, 3000));
const check = await fetch(`${base}/api/access-requests/status?reference=${result.reference}`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
const status = await check.json().catch(() => ({}));
console.log(`GET /api/access-requests/status -> HTTP ${check.status}`, JSON.stringify(status));
summary(`- Stored record: HTTP ${check.status} \`${JSON.stringify(status)}\``);
if (!status.stored) process.exit(1);
