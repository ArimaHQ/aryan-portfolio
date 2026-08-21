import { expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type ApprovedIsolatedTargetManifest = {
  approved: true;
  environment: 'isolated';
  baseURL: string;
  hostname: string;
  environmentId: string;
};

export type IsolatedE2EConfig = {
  baseURL: string;
  environmentId: string;
  primaryEmail: string;
  primaryPassword: string;
  secondEmail?: string;
  secondPassword?: string;
  primaryTotpSecret?: string;
  manifestPath: string;
  manifest: ApprovedIsolatedTargetManifest;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Refusing E2E: ${name} is required.`);
  return value;
}

export function readApprovedIsolatedTargetManifest(path = requiredEnv('ARIMA_E2E_TARGET_MANIFEST')): ApprovedIsolatedTargetManifest {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('Refusing E2E: approved isolated target manifest cannot be read as JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Refusing E2E: approved isolated target manifest must be an object.');
  }
  const manifest = value as Partial<ApprovedIsolatedTargetManifest>;
  if (manifest.approved !== true || manifest.environment !== 'isolated' || typeof manifest.baseURL !== 'string' || typeof manifest.hostname !== 'string' || typeof manifest.environmentId !== 'string' || !manifest.environmentId) {
    throw new Error('Refusing E2E: manifest must explicitly approve one URL, hostname, and environment ID.');
  }
  let parsed: URL;
  try {
    parsed = new URL(manifest.baseURL);
  } catch {
    throw new Error('Refusing E2E: manifest baseURL is not a valid URL.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Refusing E2E: manifest baseURL must be an HTTPS origin without credentials or query data.');
  }
  if (parsed.hostname !== manifest.hostname || parsed.toString() !== manifest.baseURL) {
    throw new Error('Refusing E2E: manifest URL and hostname must match exactly.');
  }
  return manifest as ApprovedIsolatedTargetManifest;
}

export function validateIsolatedTarget(baseURL: string, environmentId: string, manifest: ApprovedIsolatedTargetManifest): void {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error('Refusing E2E: configured isolated target is not a valid URL.');
  }
  if (baseURL !== manifest.baseURL || parsed.hostname !== manifest.hostname || environmentId !== manifest.environmentId) {
    throw new Error('Refusing E2E: configured URL, hostname, and ARIMA_E2E_ENV_ID must exactly match the approved manifest.');
  }
}

export function isolatedE2EConfig(): IsolatedE2EConfig {
  if (process.env.ARIMA_E2E_RUN !== '1') throw new Error('Isolated E2E is opt-in: set ARIMA_E2E_RUN=1.');
  if (process.env.ARIMA_E2E_ENV !== 'isolated') throw new Error('Refusing E2E: ARIMA_E2E_ENV must be exactly isolated.');
  if (process.env.ARIMA_E2E_CONFIRMATION !== 'ISOLATED_ONLY') throw new Error('Refusing E2E: confirmation is missing.');
  const baseURL = requiredEnv('ARIMA_E2E_BASE_URL');
  const environmentId = requiredEnv('ARIMA_E2E_ENV_ID');
  const primaryEmail = requiredEnv('ARIMA_E2E_EMAIL');
  const primaryPassword = requiredEnv('ARIMA_E2E_PASSWORD');
  const manifestPath = requiredEnv('ARIMA_E2E_TARGET_MANIFEST');
  const manifest = readApprovedIsolatedTargetManifest(manifestPath);
  const parsed = new URL(baseURL);
  if (parsed.protocol !== 'https:') throw new Error('Refusing E2E: isolated application must use HTTPS.');
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Refusing E2E: URL must not contain credentials or query data.');
  validateIsolatedTarget(baseURL, environmentId, manifest);
  return {
    baseURL, environmentId, primaryEmail, primaryPassword,
    secondEmail: process.env.ARIMA_E2E_SECOND_EMAIL, secondPassword: process.env.ARIMA_E2E_SECOND_PASSWORD,
    primaryTotpSecret: process.env.ARIMA_E2E_PRIMARY_TOTP_SECRET,
    manifestPath, manifest,
  };
}

export function assertNoProductionTarget(config: IsolatedE2EConfig) {
  expect(config.baseURL).toBe(config.manifest.baseURL);
  expect(new URL(config.baseURL).hostname).toBe(config.manifest.hostname);
  expect(config.environmentId).toBe(config.manifest.environmentId);
}

export function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function currentTotp(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secret.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = '';
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid test TOTP secret.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}
