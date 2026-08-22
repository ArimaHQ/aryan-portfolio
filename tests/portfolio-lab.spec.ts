import { expect, test } from '@playwright/test';

test.describe('Portfolio Lab provenance boundary', () => {
  test('does not present fabricated portfolio data on the public overview', async ({ page }) => {
    await page.goto('/portfolio-lab');

    await expect(page.getByRole('heading', { name: 'Data source not connected.' })).toBeVisible();
    await expect(page.getByText('This route does not display model values, estimated performance, or placeholder holdings.')).toBeVisible();
    await expect(page.getByText('No simulated portfolio values or execution results are displayed.')).toBeVisible();
    await expect(page.getByText('Arima Global Portfolio')).not.toBeVisible();
    await expect(page.getByText('£125,000')).not.toBeVisible();
  });

  test('retains section URLs without exposing fabricated figures', async ({ page }) => {
    await page.goto('/portfolio-lab/risk');

    await expect(page.getByRole('heading', { name: 'Data source not connected.' })).toBeVisible();
    await expect(page.getByText('/risk')).toBeVisible();
    await expect(page.getByText('Risk score')).not.toBeVisible();
    await expect(page.getByText('Awaiting verified source')).toHaveCount(3);
  });
});
