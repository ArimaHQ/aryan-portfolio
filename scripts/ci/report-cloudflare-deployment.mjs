// Deploy step: reports which Worker version serves arimafinance.xyz, the newest versions with what
// created them (a deploy, a dashboard secret change, ...), and the secret names on the active version.
// Read-only. Never prints a secret value; author emails are masked because the logs are public.
import { appendFileSync } from 'node:fs';

const label = process.argv[2] ?? 'now';
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const script = 'aryan-portfolio';
const summary = (line = '') => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
const mask = (email) => (typeof email === 'string' && email.includes('@') ? `${email[0]}***@${email.split('@')[1]}` : email ?? '');

async function api(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!body.success) {
    console.log(`GET ${path} -> HTTP ${response.status} ${JSON.stringify(body.errors ?? [])}`);
    return null;
  }
  return body.result;
}

summary(`## Cloudflare Worker (${label})`);
const domains = (await api('/workers/domains')) ?? [];
for (const d of domains.filter((d) => d.hostname?.endsWith('arimafinance.xyz'))) {
  console.log(`custom domain ${d.hostname} -> Worker ${d.service} (${d.environment ?? 'production'})`);
  summary(`- \`${d.hostname}\` is served by Worker \`${d.service}\``);
}

const deployments = (await api(`/workers/scripts/${script}/deployments`))?.deployments ?? [];
const active = deployments[0];
if (active) {
  const versions = active.versions.map((v) => `${v.version_id} (${v.percentage}%)`).join(', ');
  console.log(`active deployment ${active.id} at ${active.created_on} via ${active.source}: ${versions}`);
  summary(`- Active deployment since ${active.created_on} (${active.source}): ${versions}`);
}

const items = (await api(`/workers/scripts/${script}/versions`))?.items ?? [];
summary('- Newest versions:');
for (const v of items.slice(0, 6)) {
  const live = active?.versions.some((a) => a.version_id === v.id) ? ' **(active)**' : '';
  const why = v.annotations?.['workers/triggered_by'] ?? '';
  const line = `${v.id} #${v.number} ${v.metadata?.created_on} source=${v.metadata?.source} triggered_by=${why} author=${mask(v.metadata?.author_email)}${live}`;
  console.log(`version ${line}`);
  summary(`  - \`${line}\``);
}

const activeId = active?.versions[0]?.version_id;
if (activeId) {
  const detail = await api(`/workers/scripts/${script}/versions/${activeId}`);
  const secrets = (detail?.resources?.bindings ?? []).filter((b) => b.type === 'secret_text').map((b) => b.name);
  console.log(`secret names on active version: ${secrets.join(', ')}`);
  summary(`- Secret names on the active version: ${secrets.map((s) => `\`${s}\``).join(', ')}`);
}

const pages = (await api('/pages/projects')) ?? [];
if (pages.length) {
  console.log(`Pages projects: ${pages.map((p) => `${p.name} [${(p.domains ?? []).join(' ')}]`).join('; ')}`);
  summary(`- Pages projects: ${pages.map((p) => `\`${p.name}\``).join(', ')}`);
}
