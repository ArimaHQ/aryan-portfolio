import { expect, test, type Page } from '@playwright/test';

async function mockAuthBootstrap(page: Page) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/refresh')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'No session' }) });
      return;
    }
    if (pathname.endsWith('/csrf')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ csrf_token: 'login-csrf-token' }) });
      return;
    }
    await route.fallback();
  });
}

const sessionResponse = {
  access_token: 'login-access-token',
  token_type: 'bearer',
  expires_in: 900,
  csrf_token: 'login-csrf-token',
  user: {
    id: 'user-1', email: 'user@example.com', first_name: 'Test', last_name: 'User', email_verified: true,
  },
};

test('normal password login succeeds without an MFA challenge', async ({ page }) => {
  await mockAuthBootstrap(page);
  let loginBody: Record<string, unknown> | undefined;
  await page.route('**/api/v1/auth/login', async (route) => {
    loginBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(sessionResponse) });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('StrongPassword1!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByLabel('Privileged authenticator code')).toHaveCount(0);
  expect(loginBody?.otp).toBeUndefined();
});

test('MFA login displays a challenge and retries with the six-digit OTP', async ({ page }) => {
  await mockAuthBootstrap(page);
  const loginBodies: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    loginBodies.push(body);
    if (loginBodies.length === 1) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'MFA verification required', code: 'mfa_login_required' }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(sessionResponse) });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('founder@example.com');
  await page.getByLabel('Password').fill('StrongPassword1!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByLabel('Privileged authenticator code')).toBeVisible();
  await expect(page.getByText('MFA verification required')).toBeVisible();
  await page.getByLabel('Privileged authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard\/?$/);
  expect(loginBodies[0]?.otp).toBeUndefined();
  expect(loginBodies[1]?.otp).toBe('123456');
});
