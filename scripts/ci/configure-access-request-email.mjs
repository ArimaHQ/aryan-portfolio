// Deploy step: prepares Worker secrets for access requests in $RUNNER_TEMP/worker-secrets.json
// (for `wrangler secret bulk`). RESEND_API_KEY is copied only when it is a GitHub Actions secret;
// it can instead be set directly on the Worker in Cloudflare. Never prints a secret.
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const temp = process.env.RUNNER_TEMP ?? '/tmp';
const key = (process.env.RESEND_API_KEY ?? '').trim();
const adminToken = (process.env.ACCESS_REQUEST_ADMIN_TOKEN ?? '').trim() || randomBytes(24).toString('hex');
console.log(`::add-mask::${adminToken}`);

const secrets = { ACCESS_REQUEST_ADMIN_TOKEN: adminToken };
if (key) secrets.RESEND_API_KEY = key;
writeFileSync(`${temp}/worker-secrets.json`, JSON.stringify(secrets));
// Read by the later steps of the same job.
writeFileSync(`${temp}/access-request-admin-token`, adminToken);
console.log(key ? 'RESEND_API_KEY found in GitHub secrets; it will be copied to the Worker' : 'RESEND_API_KEY not in GitHub secrets; the Worker keeps its own value, if any');
