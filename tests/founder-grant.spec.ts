import { expect, test } from '@playwright/test';

const grantPath = '/api/v1/admin/founder/workspaces/3fe88ccc-5aca-429f-8a83-ee550e266b49/agents/fbff7974-b68f-482d-a9c0-52004a768360/grant';

test('grants the Executive Assistant through the authenticated frontend API client', async ({ page }) => {
  const state: { grantHeaders: Record<string, string> | null } = { grantHeaders: null };

  await page.route('**/api/v1/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ csrf_token: 'founder-csrf-token' }),
      });
      return;
    }

    if (path.endsWith('/refresh')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'founder-access-token',
          csrf_token: 'founder-csrf-token',
          expires_in: 900,
          user: {
            id: 'founder-user',
            email: 'founder@example.com',
            first_name: 'Founder',
            last_name: 'User',
            email_verified: true,
            created_at: '2026-08-17T00:00:00Z',
          },
        }),
      });
      return;
    }

    await route.fulfill({ status: 404 });
  });

  await page.route(`**${grantPath}`, async (route) => {
    state.grantHeaders = route.request().headers();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        workspace_id: '3fe88ccc-5aca-429f-8a83-ee550e266b49',
        agent_id: 'fbff7974-b68f-482d-a9c0-52004a768360',
      }),
    });
  });

  await page.goto('/founder-grant');
  await page.getByRole('button', { name: 'Grant Executive Assistant' }).click();

  await expect(page.getByText('Access granted.')).toBeVisible();
  expect(state.grantHeaders?.authorization).toBe('Bearer founder-access-token');
  expect(state.grantHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
});
