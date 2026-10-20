import { expect, test } from '@playwright/test';

async function openJourney(page: import('@playwright/test').Page) {
  await page.goto('/journey/');
  await expect(page.locator('#gate')).toBeVisible();
}

test('renders the cinematic ARIMA Journey with the official logo and no client errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await openJourney(page);

  await expect(page.getByRole('img', { name: 'ARIMA Finance' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Financial intelligence, built as a system.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('journey links lead to the established client and journey routes', async ({ page }) => {
  await openJourney(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });

  await page.locator('#nextLinks a[href="/client-portfolio/"]').click();
  await expect(page).toHaveURL(/\/client-portfolio\/?$/);

  await page.goto('/journey/');
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.locator('.explore-routes a[href="/watch-intro/"]').click();
  await expect(page).toHaveURL(/\/watch-intro\/?$/);
});

test('reduced motion still reveals the readable journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openJourney(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('#nextLinks a[href="/client-portfolio/"]')).toHaveCount(1);
});

test('journey layout remains within the mobile viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only viewport validation');
  await openJourney(page);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('journey leads back to the main site', async ({ page }) => {
  await openJourney(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Back to the main ARIMA site' }).first().click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  await expect(page.locator('.arrival-world')).toBeVisible();
});
