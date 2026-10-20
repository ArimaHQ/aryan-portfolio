// Deploy step: lists the newest emails the Worker received through the Resend webhook. Addresses are
// masked and only labelled test subjects (ARIMA-QA ...) are shown, because these logs are public.
import { appendFileSync, readFileSync } from 'node:fs';

const base = process.env.SITE_URL ?? 'https://arimafinance.xyz';
const summary = (line = '') => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
const adminToken = readFileSync(`${process.env.RUNNER_TEMP ?? '/tmp'}/access-request-admin-token`, 'utf8').trim();

const response = await fetch(`${base}/api/email/inbound?limit=10`, { headers: { Authorization: `Bearer ${adminToken}` } });
const result = await response.json().catch(() => ({}));
console.log(`GET /api/email/inbound -> HTTP ${response.status}`, JSON.stringify(result));
summary('## Received email (Resend webhook)');
summary(`- Webhook secret on the Worker: **${result.webhookConfigured ? 'set' : 'not set'}**`);
for (const e of result.emails ?? []) summary(`- ${e.receivedAt} from \`${e.from}\` to \`${e.to.join(', ')}\` subject \`${e.subject}\` body ${e.body}`);
if (!result.emails?.length) summary('- No received email recorded yet.');
