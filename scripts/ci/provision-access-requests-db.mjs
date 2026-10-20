// CI step before deploy: makes sure the D1 database for access requests exists, applies
// migrations, and binds it as ACCESS_REQUESTS_DB in the wrangler config used for this deploy.
// If the Cloudflare token cannot manage D1, it leaves the config untouched and the site
// deploys without request storage (the Journey guide then says requests cannot be recorded).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const NAME = 'arima-access-requests';
const BINDING = 'ACCESS_REQUESTS_DB';
const wrangler = (args) => execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' } });
const summary = (line) => { console.log(line); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`); };

function findDatabase() {
  const list = JSON.parse(wrangler(['d1', 'list', '--json']));
  return list.find((db) => db.name === NAME) ?? null;
}

try {
  let db = findDatabase();
  if (!db) {
    wrangler(['d1', 'create', NAME]);
    db = findDatabase();
  }
  if (!db?.uuid) throw new Error('database id not returned');

  const configPath = 'wrangler.jsonc';
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.d1_databases = [{ binding: BINDING, database_name: NAME, database_id: db.uuid, migrations_dir: 'migrations' }];
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  wrangler(['d1', 'migrations', 'apply', NAME, '--remote']);
  summary(`Access-request storage: D1 database "${NAME}" bound as ${BINDING}; migrations applied.`);
} catch (error) {
  const detail = String(error?.stderr || error?.message || error).split('\n').filter(Boolean).slice(-3).join(' | ');
  execFileSync('git', ['checkout', '--', 'wrangler.jsonc']);
  summary(`Access-request storage NOT configured: ${detail.slice(0, 400)}`);
}
