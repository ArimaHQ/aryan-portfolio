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

test('the ARIMA film card plays the official teaser and stops when closed', async ({ page }) => {
  await openJourney(page);
  await page.getByRole('button', { name: 'Enter quietly' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });

  const card = page.locator('#nextLinks a[href="/media/arima-teaser.mp4"]');
  await expect(card).toContainText('Watch the ARIMA film');
  await card.click();

  const player = page.locator('#filmPlayer');
  await expect(player).toBeVisible();
  const video = player.locator('video');
  await expect(video).toHaveAttribute('controls', '');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 20_000 }).toBeGreaterThan(0.5);
  const state = await video.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, muted: v.muted, w: v.videoWidth, h: v.videoHeight, src: v.currentSrc }));
  expect(state).toMatchObject({ paused: false, muted: false, w: 1280, h: 720 });
  expect(state.src).toMatch(/\/media\/arima-teaser\.(mp4|webm)$/);
  const decoded = await video.evaluate((v: HTMLVideoElement) => ({
    frames: v.getVideoPlaybackQuality().totalVideoFrames,
    audioBytes: (v as HTMLVideoElement & { webkitAudioDecodedByteCount?: number }).webkitAudioDecodedByteCount,
  }));
  expect(decoded.frames).toBeGreaterThan(0);
  if (decoded.audioBytes !== undefined) expect(decoded.audioBytes).toBeGreaterThan(0);
  const box = await video.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.02);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.getByRole('button', { name: 'Close film' }).click();
  await expect(player).toBeHidden();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});
