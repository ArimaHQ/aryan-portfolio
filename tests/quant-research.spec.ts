import { expect, test, type Page } from '@playwright/test';

async function mockAuthApi(page: Page) {
  let signedIn = false;

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, X-Correlation-ID, X-CSRF-Token, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }

    if (url.pathname.endsWith('/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        headers,
        body: JSON.stringify({ csrf_token: 'quant-test-csrf' }),
      });
      return;
    }

    if (url.pathname.endsWith('/refresh')) {
      if (!signedIn) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({ detail: 'No active session' }),
        });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        headers,
        body: JSON.stringify({
          access_token: 'quant-test-access-token',
          token_type: 'bearer',
          expires_in: 900,
          csrf_token: 'quant-test-csrf',
          user: {
            id: 'quant-test-user',
            email: 'quant@example.com',
            first_name: 'Quant',
            last_name: 'Researcher',
            email_verified: true,
            created_at: '2026-08-09T00:00:00Z',
          },
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/login')) {
      signedIn = true;
      await route.fulfill({
        contentType: 'application/json',
        headers,
        body: JSON.stringify({
          access_token: 'quant-test-access-token',
          token_type: 'bearer',
          expires_in: 900,
          csrf_token: 'quant-test-csrf',
          user: {
            id: 'quant-test-user',
            email: 'quant@example.com',
            first_name: 'Quant',
            last_name: 'Researcher',
            email_verified: true,
            created_at: '2026-08-09T00:00:00Z',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers,
      body: JSON.stringify({ detail: 'Not found' }),
    });
  });
}

test('redirects unauthenticated visitors to sign in', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/quant-research');
  await expect(page).toHaveURL(/\/login/);
});

test('shows an authenticated, evidence-only Quant Lab without fixture ranks', async ({ page }) => {
  await mockAuthApi(page);
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.setItem('arimaReturnPath', '/quant-research'));
  await page.getByLabel('Email').fill('quant@example.com');
  await page.getByLabel('Password').fill('Secure-test-password1!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/quant-research/);
  await expect(page.getByRole('heading', { name: 'Quant Trading Lab' })).toBeVisible();
  await expect(page.getByText('NO SIMULATED RESULTS')).toBeVisible();
  await expect(page.getByText(/No verified candidate records are available/)).toBeVisible();
  await expect(page.getByText('Awaiting secured feed')).toBeVisible();
  await expect(page.getByText('Execution is intentionally disabled.')).toBeVisible();
});
