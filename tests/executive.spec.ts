import { expect, test } from '@playwright/test';

async function mockAuthApi(page: import('@playwright/test').Page) {
  let signedIn = false;
  await page.route('**/api/v1/dashboard/summary', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        total_projects: 4,
        active_projects: 3,
        archived_projects: 1,
        projects_by_status: { active: 3, archived: 1 },
        total_tasks: 12,
        tasks_by_status: { in_progress: 5, completed: 7 },
        tasks_by_priority: { high: 3, medium: 9 },
        completed_tasks: 7,
        overdue_tasks: 1,
        unassigned_tasks: 2,
        completion_rate: 0.5833,
        overdue_rate: 0.0833,
        average_completion_time_hours: 18.5,
        tasks_due_next_7_days: 3,
        tasks_due_next_30_days: 8,
        active_users: 2,
        recent_activity_count: 6,
        generated_at: '2026-08-02T12:00:00Z',
        range_start: '2026-07-03T00:00:00Z',
        range_end: '2026-08-02T12:00:00Z',
      }),
    });
  });
  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, X-Correlation-ID, X-CSRF-Token, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (url.pathname.endsWith('/csrf')) {
      await route.fulfill({ contentType: 'application/json', headers: corsHeaders, body: JSON.stringify({ csrf_token: 'test-csrf-token' }) });
      return;
    }
    if (url.pathname.endsWith('/refresh')) {
      const requestStartedAuthenticated = signedIn;
      if (!requestStartedAuthenticated) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      if (requestStartedAuthenticated) {
        await route.fulfill({
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            access_token: 'test-access-token',
            token_type: 'bearer',
            expires_in: 900,
            csrf_token: 'test-csrf-token',
            user: {
              id: 'test-user',
              email: 'executive@example.com',
              first_name: 'Executive',
              last_name: 'User',
              email_verified: true,
              created_at: '2026-01-01T00:00:00Z',
            },
          }),
        });
        return;
      }
      await route.fulfill({ status: 401, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify({ detail: 'No active session' }) });
      return;
    }
    if (url.pathname.endsWith('/login')) {
      const body = request.postDataJSON() as { email: string; remember_me: boolean };
      signedIn = true;
      await route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 900,
          csrf_token: 'test-csrf-token',
          user: {
            id: 'test-user',
            email: body.email,
            first_name: 'Executive',
            last_name: 'User',
            email_verified: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify({ detail: 'Not found' }) });
  });
}

async function signIn(page: import('@playwright/test').Page, returnPath = '/executive') {
  await mockAuthApi(page);
  await page.goto('/login');
  await page.evaluate((path) => sessionStorage.setItem('arimaReturnPath', path), returnPath);
  await page.getByLabel('Email').fill('executive@example.com');
  await page.getByLabel('Password').fill('Secure-test-password1!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  const [pathname, query] = returnPath.split('?');
  const normalizedPath = `${pathname.endsWith('/') ? pathname : `${pathname}/`}${query ? `?${query}` : ''}`;
  await expect(page).toHaveURL(new RegExp(normalizedPath.replace('?', '\\?')));
}

test('enters and exits the neural core with keyboard support', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Enter Arima neural core' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter Arima neural core' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Executive Intelligence' })).toBeVisible({ timeout: 4_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Enter Arima neural core' })).toBeVisible();
});

test('renders a direct chamber route after authenticated sign-in', async ({ page }) => {
  await signIn(page, '/executive?chamber=quant');
  await expect(page.getByRole('heading', { name: 'Quant Research' })).toBeVisible();
  await expect(page.getByText('MOCK RESEARCH DATA')).toHaveCount(0);
});

test('loads the live workspace dashboard after authenticated sign-in', async ({ page }) => {
  await signIn(page, '/dashboard');
  await page.waitForTimeout(1_600);
  await expect(page.getByRole('heading', { name: 'Clarity across your operating system.' })).toBeVisible();
  await expect(page.getByText('Active projects')).toBeVisible();
  await expect(page.getByText('4 total projects')).toBeVisible();
  await expect(page.getByText('Task completion')).toBeVisible();
  await expect(page.getByText('Live backend data', { exact: true })).toBeVisible();
});

test('falls back to keyboard mode after a recognition network error', async ({ page }) => {
  await page.addInitScript(() => {
    class NetworkFailureRecognition {
      continuous = false;
      interimResults = false;
      lang = 'en-GB';
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() { window.setTimeout(() => this.onerror?.({ error: 'network' }), 0); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: NetworkFailureRecognition });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    });
  });
  await signIn(page);
  await page.getByRole('button', { name: 'Speak' }).click();
  await expect(page.getByText('Recognition service unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Keyboard fallback/)).toBeVisible();
});

test('honours reduced motion through the simplify control', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Simplify' }).click();
  await expect(page.getByRole('button', { name: 'Simplify' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Enter Arima neural core' }).click();
  await expect(page.getByRole('heading', { name: 'Executive Intelligence' })).toBeVisible();
});
