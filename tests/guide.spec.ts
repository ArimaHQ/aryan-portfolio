import { expect, test, type Page } from '@playwright/test';

// These tests submit labelled test data ("QA-Mock"). Run them only against a local or isolated
// Worker whose database and email settings are test-only; never against production.

async function openGuide(page: Page) {
  await page.goto('/journey/');
  await page.getByRole('button', { name: 'Skip the intro' }).click();
  await expect(page.locator('#gate')).toBeHidden({ timeout: 15_000 });
  await page.locator('#guide').scrollIntoViewIfNeeded();
  await expect(page.locator('#guideApp')).toBeVisible();
}

const guideSays = (page: Page) => page.locator('#gLog li.g').last();

async function answer(page: Page, text: string) {
  const field = page.locator('#gPortal').isVisible().then((v) => (v ? page.locator('#gEmail') : page.locator('#gInput')));
  await (await field).fill(text);
  await page.locator('#gSend').click();
}

test('the guide sits at the end of the Journey and introduces itself as automated', async ({ page }) => {
  await openGuide(page);
  const order = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('main section[id]')].map((s) => s.id);
    return ids.slice(-2);
  });
  expect(order).toEqual(['contact', 'guide']);
  await expect(page.locator('#gLog li.g').first()).toContainText('automated guide');
  await expect(page.getByRole('button', { name: 'Turn on voice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible();
});

test('answers come from the website content and never invent prices or dates', async ({ page }) => {
  await openGuide(page);
  await page.locator('#gInput').fill('What is the ARIMA Brain?');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('ARIMA Brain');
  await expect(guideSays(page)).toContainText('From this website’s Journey content.');

  await page.locator('#gInput').fill('How much does it cost?');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('doesn’t publish prices');

  await page.locator('#gInput').fill('When will the Mini App launch?');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('doesn’t give release or launch dates');

  await page.locator('#gInput').fill('Who is the founder?');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('Passed Level III of the CFA Program.');
  await expect(guideSays(page)).not.toContainText('CFA charterholder');

  await page.locator('#gInput').fill('Tell me about quantum teleportation');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('won’t guess');
});

test('collects, validates, edits and confirms an access request once', async ({ page }) => {
  await openGuide(page);
  await page.getByRole('button', { name: 'Request account access' }).click();
  await expect(guideSays(page)).toContainText('first name');
  await answer(page, 'Test');
  await answer(page, 'QA-Mock');

  await expect(page.locator('#gPortal')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('gEmail');
  await answer(page, 'not-an-email');
  await expect(page.locator('#gErr')).toContainText('doesn’t look like an email');
  await answer(page, 'qa.mock@example.com');

  await expect(page.locator('#gPortal')).toBeHidden();
  await answer(page, '020 7946 0000');
  await expect(page.locator('#gErr')).toContainText('country code');
  await answer(page, '+44 20 7946 0000');

  const summary = page.locator('#gSummary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('qa.mock@example.com');
  await expect(summary).toContainText('+442079460000');
  await expect(summary).toContainText('not account approval or creation');

  await summary.locator('button.edit[data-f="lastName"]').click();
  await answer(page, 'QA-Mock-Edited');
  await expect(summary).toContainText('QA-Mock-Edited');

  await page.getByRole('button', { name: 'Confirm and send' }).click();
  await expect(page.locator('#gErr2')).toContainText('tick the box');

  await page.waitForTimeout(2600); // the server rejects forms completed implausibly fast
  await page.locator('#gConsent').check();
  const responses: number[] = [];
  page.on('response', (r) => { if (r.url().endsWith('/api/access-requests')) responses.push(r.status()); });
  const confirm = page.getByRole('button', { name: 'Confirm and send' });
  await confirm.click();
  await confirm.click({ force: true, timeout: 1000 }).catch(() => undefined);
  await confirm.click({ force: true, timeout: 1000 }).catch(() => undefined);

  const recorded = page.locator('#gLog li[data-outcome="recorded"]');
  await expect(recorded).toHaveCount(1, { timeout: 15_000 });
  await expect(recorded).toContainText(/Your request is recorded\. Your reference is .ARQ-[A-Z0-9]{8}/);
  await expect(recorded).not.toContainText('approved');
  expect(responses).toEqual([201]);
});

test('Persian switches to right-to-left and answers in Persian', async ({ page }) => {
  await openGuide(page);
  await page.getByRole('button', { name: 'فارسی' }).click();
  await expect(page.locator('#guideApp')).toHaveAttribute('dir', 'rtl');
  await expect(guideSays(page)).toContainText('راهنمای خودکار آریما');
  await page.locator('#gInput').fill('قیمت چقدر است؟');
  await page.locator('#gSend').click();
  await expect(guideSays(page)).toContainText('قیمت یا هزینه‌ای منتشر نکرده');
  await page.getByRole('button', { name: 'درخواست دسترسی به حساب' }).click();
  await expect(guideSays(page)).toContainText('نام کوچک شما چیست؟');
});

test('voice starts only on request and offers mute', async ({ page }) => {
  await openGuide(page);
  await expect(page.locator('#gMute')).toBeHidden();
  await page.getByRole('button', { name: 'Turn on voice' }).click();
  await expect(page.locator('#gVoice')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#gMute')).toBeVisible();
  await page.locator('#gMute').click();
  await expect(page.locator('#gMute')).toHaveAttribute('aria-pressed', 'true');
});

test('the guide fits the mobile viewport and works with reduced motion', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGuide(page);
  await page.getByRole('button', { name: 'Request account access' }).click();
  await answer(page, 'Test');
  await answer(page, 'QA-Mock');
  await expect(page.locator('#gEmail')).toBeVisible();
  const box = await page.locator('#gEmail').boundingBox();
  expect(box && box.width).toBeGreaterThan(180);
  if (isMobile) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test('keyboard users can reach and use the guide', async ({ page }) => {
  await openGuide(page);
  await page.locator('#gInput').focus();
  await page.keyboard.type('What do the status labels mean?');
  await page.keyboard.press('Enter');
  await expect(guideSays(page)).toContainText('status label');
});
