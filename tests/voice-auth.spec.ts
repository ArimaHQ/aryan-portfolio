import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Simulates a returning authenticated user with a valid refresh cookie but no
 * in-memory access token yet (the exact production cold-start scenario).
 *
 * The /auth/refresh is delayed to widen the race window: the voice session
 * effect must NOT fire until the refresh resolves and the token is available.
 */
async function mockReturningAuthSession(page: Page, refreshDelayMs = 400) {
  await page.route('**/api/v1/voice/health', async (route: Route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        enabled: true,
        provider_neutral: true,
        session_store: 'database',
        orchestration_available: true,
        provider_provenance: 'verified',
        checked_at: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/v1/auth/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, X-Correlation-ID, X-CSRF-Token, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (url.pathname.endsWith('/csrf')) {
      await route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ csrf_token: 'test-csrf-token' }),
      });
      return;
    }
    if (url.pathname.endsWith('/refresh')) {
      // Widen the race window so the voice effect could fire early if gated wrong.
      await new Promise((resolve) => setTimeout(resolve, refreshDelayMs));
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
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ detail: 'Not found' }),
    });
  });
}

test('voice session request includes Authorization header and shows verified voice when authenticated', async ({ page }) => {
  await mockReturningAuthSession(page);

  const voiceRequests: Array<{ timing: number; hasAuth: boolean }> = [];
  await page.route('**/api/v1/voice/sessions', async (route: Route) => {
    const request = route.request();
    const authHeader = request.headers()['authorization'] ?? '';
    voiceRequests.push({
      timing: Date.now(),
      hasAuth: authHeader.startsWith('Bearer ') && authHeader.length > 'Bearer '.length,
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-1',
        user_id: 'test-user',
        correlation_id: 'corr-1',
        state: 'idle',
        language: 'en',
        locale: 'en-GB',
        timezone: 'Europe/London',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });

  // Direct visit as a returning user (refresh cookie present, token in memory absent).
  await page.goto('/executive');

  // Avatar must render.
  await expect(page.getByRole('button', { name: 'Enter Arima neural core' })).toBeVisible();

  // 1. Live mode starts (no demo fallback badge). These are CSS-module
  // classes, so assert the accessible status copy rather than a generated
  // implementation class name.
  await expect(page.getByText('VOICE VERIFIED', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMO MODE', { exact: true })).toHaveCount(0);

  // 2. Exactly one voice session request fired, and it carried the token.
  //    (no 401 retry / demo-fallback second request)
  await expect.poll(() => voiceRequests.length).toBe(1);
  expect(voiceRequests[0].hasAuth).toBe(true);
});

test('voice session effect is deferred until auth is ready (no request during refresh)', async ({ page }) => {
  await mockReturningAuthSession(page, 800);

  let sessionRequestCount = 0;
  await page.route('**/api/v1/voice/sessions', async (route: Route) => {
    sessionRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-deferred',
        user_id: 'test-user',
        correlation_id: 'corr-deferred',
        state: 'idle',
        language: 'en',
        locale: 'en-GB',
        timezone: 'Europe/London',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });

  const start = Date.now();
  await page.goto('/executive');
  await expect(page.getByRole('button', { name: 'Enter Arima neural core' })).toBeVisible();

  // The session request must happen only AFTER the refresh resolves (>= delay), proving gating.
  await expect.poll(() => sessionRequestCount).toBe(1);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(700);

  // Verified mode, not demo.
  await expect(page.getByText('VOICE VERIFIED', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMO MODE', { exact: true })).toHaveCount(0);
});
