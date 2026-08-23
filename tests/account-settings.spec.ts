import { expect, test } from '@playwright/test';

async function mockAuthenticatedSession(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/refresh')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 900,
          csrf_token: 'test-csrf-token',
          user: {
            id: 'test-user',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            email_verified: true,
          },
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/csrf')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ csrf_token: 'test-csrf-token' }) });
      return;
    }
    await route.fulfill({ status: 204 });
  });
}

test('change password submits the backend contract and reports success', async ({ page }) => {
  await mockAuthenticatedSession(page);
  let requestBody: unknown;
  await page.route('**/api/v1/auth/change-password', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 204 });
  });

  await page.goto('/settings');
  await page.getByLabel('Current password').fill('Current-password-1!');
  await page.getByLabel('New password', { exact: true }).fill('New-password-2!');
  await page.getByLabel('Confirm new password').fill('New-password-2!');
  await page.getByRole('button', { name: 'Change password' }).click();

  await expect(page.getByRole('status')).toHaveText('Your password was changed successfully.');
  expect(requestBody).toEqual({ current_password: 'Current-password-1!', password: 'New-password-2!' });
});

test('sign out calls logout and redirects to login', async ({ page }) => {
  await mockAuthenticatedSession(page);
  let logoutCalled = false;
  await page.route('**/api/v1/auth/logout', async (route) => {
    logoutCalled = true;
    await route.fulfill({ status: 204 });
  });

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(logoutCalled).toBe(true);
});
