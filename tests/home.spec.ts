import { expect, test } from '@playwright/test';

async function openHome(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('#gate')).toBeVisible();
}

test('renders the cinematic home with the official logo and no client errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await openHome(page);

  await expect(page.getByRole('img', { name: 'ARIMA Finance' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Financial intelligence, built as a system.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('home links lead to the established client and journey routes', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });

  await page.locator('#nextLinks a[href="/client-portfolio/"]').click();
  await expect(page).toHaveURL(/\/client-portfolio\/?$/);

  await page.goto('/');
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.locator('.explore-routes a[href="/watch-intro/"]').click();
  await expect(page).toHaveURL(/\/watch-intro\/?$/);
});

test('reduced motion still reveals the readable home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('#nextLinks a[href="/client-portfolio/"]')).toHaveCount(1);
});

test('home layout remains within the mobile viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only viewport validation');
  await openHome(page);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
