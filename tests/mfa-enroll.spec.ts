import { expect, test, type Page } from '@playwright/test';

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/refresh')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        access_token: 'founder-access-token', token_type: 'bearer', expires_in: 900, csrf_token: 'mfa-csrf-token',
        user: { id: 'founder-user', email: 'founder@example.com', first_name: 'Founder', last_name: 'User', email_verified: true },
      }) });
      return;
    }
    if (pathname.endsWith('/csrf')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ csrf_token: 'mfa-csrf-token' }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });
}

test('Founder can generate setup URI and verify MFA with CSRF-protected requests', async ({ page }) => {
  await mockAuthenticatedSession(page);
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  const requests: Array<{ path: string; csrf: string | undefined; body: unknown }> = [];
  await page.route('**/api/v1/auth/mfa/enroll', async (route) => {
    requests.push({ path: 'enroll', csrf: route.request().headers()['x-csrf-token'], body: route.request().postDataJSON() });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ enabled: false, otpauth_uri: 'otpauth://totp/ARIMA%3Afounder%40example.com?secret=TESTONLYSECRET&issuer=ARIMA' }) });
  });
  await page.route('**/api/v1/auth/mfa/verify', async (route) => {
    requests.push({ path: 'verify', csrf: route.request().headers()['x-csrf-token'], body: route.request().postDataJSON() });
    await route.fulfill({ status: 204 });
  });

  await page.goto('/mfa-enroll');
  await page.getByRole('button', { name: 'Generate setup URI' }).click();
  await expect(page.getByTestId('mfa-setup-uri')).toContainText('otpauth://totp/');
  await page.getByLabel('Current 6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Enable MFA' }).click();

  await expect(page.getByRole('status')).toContainText('MFA enabled');
  expect(requests.map((request) => request.path)).toEqual(['enroll', 'verify']);
  expect(requests.every((request) => request.csrf === 'mfa-csrf-token')).toBe(true);
  expect(requests[1]?.body).toEqual({ code: '123456' });
  expect(consoleMessages.some((message) => message.includes('TESTONLYSECRET') || message.includes('123456'))).toBe(false);
});

test('shows an invalid-code error and does not claim MFA was enabled', async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.route('**/api/v1/auth/mfa/enroll', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ enabled: false, otpauth_uri: 'otpauth://totp/ARIMA%3Afounder%40example.com?secret=TESTONLYSECRET&issuer=ARIMA' }) });
  });
  await page.route('**/api/v1/auth/mfa/verify', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Invalid MFA code' }) });
  });

  await page.goto('/mfa-enroll');
  await page.getByRole('button', { name: 'Generate setup URI' }).click();
  await page.getByLabel('Current 6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Enable MFA' }).click();
  await expect(page.getByText('Invalid MFA code', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('renders the backend denial for a non-founder account without client-side privilege inference', async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.route('**/api/v1/auth/mfa/enroll', async (route) => {
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Founder authorization is required' }) });
  });

  await page.goto('/mfa-enroll');
  await page.getByRole('button', { name: 'Generate setup URI' }).click();
  await expect(page.getByText('Founder authorization is required', { exact: true })).toBeVisible();
});
