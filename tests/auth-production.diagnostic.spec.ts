import { test } from '@playwright/test';

const productionSmokeEnabled = process.env.PLAYWRIGHT_PROD_SMOKE === '1';
const email = process.env.ARIMA_E2E_EMAIL;
const password = process.env.ARIMA_E2E_PASSWORD;

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

const printResult = (result: {
  status: number | string;
  ok: boolean;
  authenticated: boolean | null;
  emailVerified: boolean | null;
  active: boolean | null;
  rolePresent: boolean;
  workspacePresent: boolean;
}) => {
  console.log(`AUTH_ME_STATUS=${result.status}`);
  console.log(`AUTH_ME_OK=${result.ok}`);
  console.log(`AUTHENTICATED_FIELD=${result.authenticated ?? 'unknown'}`);
  console.log(`EMAIL_VERIFIED=${result.emailVerified ?? 'unknown'}`);
  console.log(`ACTIVE=${result.active ?? 'unknown'}`);
  console.log(`ROLE_PRESENT=${result.rolePresent}`);
  console.log(`WORKSPACE_PRESENT=${result.workspacePresent}`);
};

test.describe('production auth diagnostic', () => {
  test.skip(
    productionSmokeEnabled === false || !email || !password,
    'Production auth diagnostic skipped: opt-in flag or approved credentials are absent.',
  );

  test('reads /api/v1/auth/me after the real login UI', async ({ page }) => {
    try {
      const loginResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return response.request().method() === 'POST'
          && url.pathname === '/api/v1/auth/login';
      }, { timeout: 60_000 });

      await page.goto('/login/', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email').fill(email as string);
      await page.getByLabel('Password').fill(password as string);
      await page.getByRole('button', { name: 'Sign In' }).click();

      const loginResponse = await loginResponsePromise;
      if (!loginResponse.ok()) {
        printResult({
          status: 'not_run',
          ok: false,
          authenticated: null,
          emailVerified: null,
          active: null,
          rolePresent: false,
          workspacePresent: false,
        });
        return;
      }

      const loginPayload = await loginResponse.json() as { access_token?: unknown };
      const accessToken = typeof loginPayload.access_token === 'string'
        ? loginPayload.access_token
        : null;
      if (accessToken === null) {
        printResult({
          status: 'not_run',
          ok: false,
          authenticated: null,
          emailVerified: null,
          active: null,
          rolePresent: false,
          workspacePresent: false,
        });
        return;
      }

      const result = await page.evaluate(async (token) => {
        const response = await fetch('/api/v1/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const record = typeof payload === 'object' && payload !== null
          ? payload as Record<string, unknown>
          : {};
        const user = typeof record.user === 'object' && record.user !== null
          ? record.user as Record<string, unknown>
          : record;
        const booleanField = (...keys: string[]) => {
          const value = keys
            .map((key) => user[key])
            .find((candidate) => typeof candidate === 'boolean');
          return typeof value === 'boolean' ? value : null;
        };

        return {
          status: response.status,
          ok: response.ok,
          authenticated: booleanField('authenticated', 'is_authenticated'),
          emailVerified: booleanField('email_verified', 'emailVerified', 'is_verified'),
          active: booleanField('is_active', 'active', 'enabled'),
          rolePresent: Array.isArray(user.roles) && user.roles.length > 0,
          workspacePresent: Boolean(user.workspace || user.workspace_id || user.workspaceId),
        };
      }, accessToken);

      printResult(result);
    } catch {
      printResult({
        status: 'not_run',
        ok: false,
        authenticated: null,
        emailVerified: null,
        active: null,
        rolePresent: false,
        workspacePresent: false,
      });
    } finally {
      await page.context().close();
    }
  });
});
