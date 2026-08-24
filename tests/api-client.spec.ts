import { expect, test, type Page } from '@playwright/test';

type AuthState = {
  csrfCalls: number;
  refreshCalls: number;
  refreshCsrfHeaders: string[];
  projectListCalls: number;
  createHeaders: Record<string, string> | null;
  createCalls: number;
};

async function mockRecoverableApiSession(
  page: Page,
  options: { keepProjectRequestsUnauthorized?: boolean; csrfTokens?: string[]; initialCsrfToken?: string; csrfFailureOnCreate?: boolean } = {},
): Promise<AuthState> {
  const state: AuthState = {
    csrfCalls: 0,
    refreshCalls: 0,
    refreshCsrfHeaders: [],
    projectListCalls: 0,
    createHeaders: null,
    createCalls: 0,
  };

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/csrf')) {
      state.csrfCalls += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ csrf_token: options.csrfTokens?.[state.csrfCalls - 1] ?? 'api-client-csrf-token' }),
      });
      return;
    }

    if (path.endsWith('/refresh')) {
      state.refreshCalls += 1;
      state.refreshCsrfHeaders.push(request.headers()['x-csrf-token'] ?? '');
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: state.refreshCalls === 1 ? 'bootstrap-token' : 'rotated-token',
          csrf_token: options.initialCsrfToken ?? `refreshed-csrf-token-${state.refreshCalls}`,
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
      state.createCalls += 1;
      state.createHeaders = request.headers();
      if (options.csrfFailureOnCreate && state.createCalls === 1) {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'CSRF validation failed' }) });
        return;
      }
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
  expect(state.csrfCalls).toBe(1);
  expect(state.refreshCsrfHeaders).toEqual([
    'api-client-csrf-token',
    'refreshed-csrf-token-1',
  ]);

  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill('Secure project');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect.poll(() => state.createHeaders).not.toBeNull();
  expect(state.createHeaders?.['x-csrf-token']).toBe('refreshed-csrf-token-2');
  expect(state.createHeaders?.authorization).toBe('Bearer rotated-token');
});

test('does not loop refreshes when the single retry is still unauthorized', async ({ page }) => {
  const state = await mockRecoverableApiSession(page, { keepProjectRequestsUnauthorized: true });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects unavailable' })).toBeVisible();
  await expect.poll(() => state.projectListCalls).toBe(2);
  await expect.poll(() => state.refreshCalls).toBe(2);
});

test('detects a rotated CSRF cookie before a mutation and uses the refreshed token', async ({ page }) => {
  const state = await mockRecoverableApiSession(page, { initialCsrfToken: 'csrf-token-a', csrfTokens: ['bootstrap-csrf', 'csrf-token-b'] });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.evaluate(() => { document.cookie = 'arima_csrf_token=csrf-token-b; Path=/'; });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill('Rotated CSRF project');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect.poll(() => state.createHeaders).not.toBeNull();
  expect(state.csrfCalls).toBe(2);
  expect(state.createHeaders?.['x-csrf-token']).toBe('csrf-token-b');
  expect(state.createCalls).toBe(1);
});

test('refreshes after a CSRF failure without replaying the financial mutation', async ({ page }) => {
  const state = await mockRecoverableApiSession(page, { initialCsrfToken: 'csrf-token-a', csrfTokens: ['bootstrap-csrf', 'csrf-token-b'], csrfFailureOnCreate: true });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Name').fill('No automatic replay');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByText('CSRF validation failed')).toBeVisible();
  expect(state.createCalls).toBe(1);
  expect(state.csrfCalls).toBe(2);
});
