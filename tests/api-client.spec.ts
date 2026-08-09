import { expect, test, type Page } from '@playwright/test';

type AuthState = {
  refreshCalls: number;
  projectListCalls: number;
  createHeaders: Record<string, string> | null;
};

async function mockRecoverableApiSession(
  page: Page,
  options: { keepProjectRequestsUnauthorized?: boolean } = {},
): Promise<AuthState> {
  const state: AuthState = {
    refreshCalls: 0,
    projectListCalls: 0,
    createHeaders: null,
  };

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ csrf_token: 'api-client-csrf-token' }),
      });
      return;
    }

    if (path.endsWith('/refresh')) {
      state.refreshCalls += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: state.refreshCalls === 1 ? 'bootstrap-token' : 'rotated-token',
          token_type: 'bearer',
          expires_in: 900,
          user: {
            id: 'api-client-user',
            email: 'api-client@example.com',
            first_name: 'API',
            last_name: 'Client',
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
      body: JSON.stringify({ detail: 'Not found' }),
    });
  });

  await page.route('**/api/v1/projects**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      state.projectListCalls += 1;
      if (state.projectListCalls === 1 || options.keepProjectRequestsUnauthorized) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Access token expired' }),
        });
        return;
      }

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 100, offset: 0 }),
      });
      return;
    }

    if (request.method() === 'POST') {
      state.createHeaders = request.headers();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'created-project',
          name: 'Secure project',
          description: null,
          status: 'planning',
          owner_id: 'api-client-user',
          created_by: 'api-client-user',
          archived_at: null,
          created_at: '2026-08-09T00:00:00Z',
          updated_at: '2026-08-09T00:00:00Z',
        }),
      });
      return;
    }

    await route.fulfill({ status: 405 });
  });

  return state;
}

test('refreshes one expired protected request and sends CSRF on a mutation', async ({ page }) => {
  const state = await mockRecoverableApiSession(page);

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect.poll(() => state.projectListCalls).toBe(2);
  await expect.poll(() => state.refreshCalls).toBe(2);

  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill('Secure project');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect.poll(() => state.createHeaders).not.toBeNull();
  expect(state.createHeaders?.['x-csrf-token']).toBe('api-client-csrf-token');
  expect(state.createHeaders?.authorization).toBe('Bearer rotated-token');
});

test('does not loop refreshes when the single retry is still unauthorized', async ({ page }) => {
  const state = await mockRecoverableApiSession(page, { keepProjectRequestsUnauthorized: true });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects unavailable' })).toBeVisible();
  await expect.poll(() => state.projectListCalls).toBe(2);
  await expect.poll(() => state.refreshCalls).toBe(2);
});
