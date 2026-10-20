// Deploy step: lists the newest emails the Worker received through the Resend webhook. Addresses are
// masked and only labelled test subjects (ARIMA-QA ...) are shown, because these logs are public.
import { appendFileSync, readFileSync } from 'node:fs';

const base = process.env.SITE_URL ?? 'https://arimafinance.xyz';
const summary = (line = '') => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
const adminToken = readFileSync(`${process.env.RUNNER_TEMP ?? '/tmp'}/access-request-admin-token`, 'utf8').trim();

// Subjects come from whoever sent the email; drop markdown and links before they reach the public summary.
const plain = (text) => String(text).replace(/[`*_[\]()<>#|!\\]/g, ' ').replace(/https?:\/\/\S+/gi, '(link)').slice(0, 80);
const response = await fetch(`${base}/api/email/inbound?limit=10`, { headers: { Authorization: `Bearer ${adminToken}` } });
const result = await response.json().catch(() => ({}));
console.log(`GET /api/email/inbound -> HTTP ${response.status}`, JSON.stringify({ ...result, emails: (result.emails ?? []).map((e) => ({ ...e, subject: plain(e.subject) })) }));
summary('## Received email (Resend webhook)');
summary(`- Webhook secret on the Worker: **${result.webhookConfigured ? 'set' : 'not set'}**`);
for (const e of result.emails ?? []) summary(`- ${e.receivedAt} from \`${e.from}\` to \`${e.to.join(', ')}\` subject \`${plain(e.subject)}\` body ${e.body}`);
if (!result.emails?.length) summary('- No received email recorded yet.');
