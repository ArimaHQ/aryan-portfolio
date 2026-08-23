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

test('validates the wallet address before submitting', async ({ page }) => {
  await mockAuthenticatedSession(page);
  let requestCount = 0;
  await page.route('**/api/v1/requests/withdrawal-intake', async (route) => {
    requestCount += 1;
    await route.fulfill({ status: 202, body: JSON.stringify({ message: 'unexpected' }) });
  });

  await page.goto('/withdrawal-request');
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Amount (ETH)').fill('1.25');
  await page.getByLabel('ETH wallet address').fill('0xinvalid');
  await page.getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByText(/valid Ethereum wallet address/)).toBeVisible();
  expect(requestCount).toBe(0);
});

test('submits the intake request and shows the 48-hour confirmation', async ({ page }) => {
  await mockAuthenticatedSession(page);
  let requestBody: unknown;
  await page.route('**/api/v1/requests/withdrawal-intake', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Your request has been received. Our team will contact you within 48 hours.' }),
    });
  });

  await page.goto('/withdrawal-request');
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Amount (ETH)').fill('1.25');
  await page.getByLabel('ETH wallet address').fill('0x1234567890abcdef1234567890abcdef12345678');
  await page.getByLabel('Optional note').fill('Please contact me by email.');
  await page.getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByRole('status')).toHaveText('Your request has been received. Our team will contact you within 48 hours.');
  expect(requestBody).toEqual({
    full_name: 'Ada Lovelace',
    amount_eth: '1.25',
    wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'Ethereum Mainnet',
    note: 'Please contact me by email.',
  });
});
