import { expect, test } from '@playwright/test';

async function openArrival(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('.arrival-world')).toBeVisible();
}

test('renders the current Arima arrival experience without client errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await openArrival(page);

  await expect(page.getByText('ARIMA FINANCE / EST. LONDON', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ARIMA FINANCE', exact: true })).toBeVisible();
  await expect(page.getByText('Intelligence for capital in motion.', { exact: true })).toBeVisible();
  await expect(page.getByText('PRIVATE INTELLIGENCE · PUBLIC PURPOSE', { exact: true })).toBeVisible();
  await expect(page.locator('.arrival-portal')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('arrival portals lead to the established client and journey routes', async ({ page }) => {
  await openArrival(page);

  await page.getByRole('button', { name: /client portfolio/i }).click();
  await expect(page).toHaveURL(/\/client-portfolio\/?$/);

  await page.goBack();
  await expect(page.locator('.arrival-world')).toBeVisible();
  await page.getByRole('button', { name: /experience the journey/i }).click();
  await expect(page).toHaveURL(/\/watch-intro\/?$/);
});

test('reduced motion still reveals the complete readable arrival state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openArrival(page);

  await expect(page.getByRole('heading', { name: 'ARIMA FINANCE', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /client portfolio/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /experience the journey/i })).toBeVisible();
});

test('arrival layout remains within the mobile viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only viewport validation');
  await openArrival(page);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
