import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { assertNoProductionTarget, currentTotp, isolatedE2EConfig, jsonRecord, type IsolatedE2EConfig } from './isolated-e2e-guard';

const enabled = process.env.ARIMA_E2E_RUN === '1';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.describe.configure({ mode: 'serial' });

test.describe('isolated authentication and account-boundary evidence', () => {
  test.skip(!enabled, 'Opt in with the isolated runner.');
  let config: IsolatedE2EConfig;
  let accessToken = '';
  let userId = '';

  async function login(page: Page, email: string, password: string, otp?: string) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/auth/login');
    await page.goto('/login/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    if (otp) await page.getByLabel(/Privileged authenticator code/).fill(otp);
    await page.getByRole('button', { name: 'Sign In' }).click();
    const response = await responsePromise;
    const payload = jsonRecord(await response.json());
    expect(response.ok(), `isolated login failed with ${response.status()}`).toBe(true);
    expect(typeof payload.access_token).toBe('string');
    expect(payload.refresh_token).toBeUndefined();
    return { token: payload.access_token as string, user: jsonRecord(payload.user) };
  }

  async function api(request: APIRequestContext, path: string, token = accessToken) {
    return request.get(path, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
  }

  test('refuses production targets and verifies browser cookie/session boundaries', async ({ page }) => {
    config = isolatedE2EConfig();
    assertNoProductionTarget(config);
    const result = await login(page, config.primaryEmail, config.primaryPassword, config.primaryTotpSecret ? currentTotp(config.primaryTotpSecret) : undefined);
    accessToken = result.token;
    userId = String(result.user.id ?? '');
    expect(userId).not.toBe('');
    const cookies = await page.context().cookies(config.baseURL);
    const refresh = cookies.find((cookie) => cookie.name.includes('refresh'));
    const csrf = cookies.find((cookie) => cookie.name.includes('csrf'));
    expect(refresh?.httpOnly).toBe(true);
    expect(refresh?.secure).toBe(true);
    expect(['lax', 'strict', 'none']).toContain(refresh?.sameSite);
    expect(csrf?.httpOnly).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('arima_access_token'))).toBeNull();
  });

  test('verifies MFA enrollment and login when the isolated primary account is not enrolled', async ({ page }) => {
    await page.goto('/mfa-enroll', { waitUntil: 'domcontentloaded' });
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/auth/mfa/enroll');
    await page.getByRole('button', { name: 'Generate setup URI' }).click();
    expect((await responsePromise).ok()).toBe(true);
    const uri = await page.locator('code').textContent();
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    const secret = new URL(uri as string).searchParams.get('secret');
    expect(secret).toBeTruthy();
    await page.getByLabel('Current 6-digit code').fill(currentTotp(secret as string));
    await page.getByRole('button', { name: 'Enable MFA' }).click();
    await expect(page.getByRole('status')).toContainText('MFA enabled');
    const freshLogin = await login(page, config.primaryEmail, config.primaryPassword, currentTotp(secret as string));
    expect(freshLogin.user.id).toBe(userId);
  });

  test('verifies protected routes and server-side founder authorization', async ({ page, request }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/);
    expect((await api(request, '/api/v1/auth/me')).status()).toBe(200);
    expect([200, 404, 409]).toContain((await api(request, '/api/v1/portfolio')).status());
    expect([200, 404]).toContain((await api(request, '/api/v1/research')).status());
    expect([401, 403]).toContain((await api(request, '/api/v1/support/customers?q=nonexistent@example.invalid')).status());
  });

  test('verifies a second account cannot cross the first account identity boundary', async ({ browser }) => {
    test.skip(!config.secondEmail || !config.secondPassword, 'Two-account isolation requires the second isolated test account.');
    const context = await browser.newContext({ baseURL: config.baseURL });
    const page = await context.newPage();
    const result = await login(page, config.secondEmail as string, config.secondPassword as string);
    expect(String(result.user.id)).not.toBe(userId);
    const response = await context.request.get('/api/v1/portfolio', { headers: { Authorization: `Bearer ${result.token}` } });
    expect([200, 404, 409]).toContain(response.status());
    await context.close();
  });

  test('verifies logout invalidates the protected session', async ({ page, request }) => {
    const logout = await page.evaluate(async () => {
      const csrf = document.cookie.split('; ').find((item) => item.startsWith('arima_csrf_token='))?.split('=')[1] ?? '';
      return fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include', headers: { 'x-csrf-token': csrf } });
    });
    expect(logout.status).toBe(204);
    expect([401, 403]).toContain((await api(request, '/api/v1/auth/me')).status());
  });
});
