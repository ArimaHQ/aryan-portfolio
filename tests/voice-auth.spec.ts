import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Simulates a returning authenticated user with a valid refresh cookie but no
 * in-memory access token yet (the exact production cold-start scenario).
 *
 * The /auth/refresh is delayed to widen the race window: the voice session
 * effect must NOT fire until the refresh resolves and the token is available.
 */
async function mockReturningAuthSession(page: Page, refreshDelayMs = 400) {
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

async function rejectClientConversationSelection(page: Page) {
  await page.route('**/api/v1/conversations?**', async (route: Route) => {
    await route.abort('failed');
  });
}

test('voice session request includes Authorization header and keeps LIVE MODE when authenticated', async ({ page }) => {
  await mockReturningAuthSession(page);
  await rejectClientConversationSelection(page);

  const voiceRequests: Array<{ timing: number; method: string; hasAuth: boolean; body: Record<string, unknown> }> = [];
  await page.route('**/api/v1/voice/sessions', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const authHeader = request.headers()['authorization'] ?? '';
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 204 });
      return;
    }
    voiceRequests.push({
      timing: Date.now(),
      method: request.method(),
      hasAuth: authHeader.startsWith('Bearer ') && authHeader.length > 'Bearer '.length,
      body: JSON.parse(request.postData() ?? '{}') as Record<string, unknown>,
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-1',
        user_id: 'test-user',
        conversation_id: 'conversation-authorized-1',
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
  await expect(page.getByText('LIVE MODE', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMO MODE', { exact: true })).toHaveCount(0);

  // 2. Exactly one voice session request fired, and it carried the token.
  //    (no 401 retry / demo-fallback second request)
  await expect.poll(() => voiceRequests.length).toBe(1);
  expect(voiceRequests[0].hasAuth).toBe(true);
  expect(voiceRequests[0].body.conversation_id).toBeUndefined();
  expect(voiceRequests[0].body.language).toBeTruthy();
  expect(voiceRequests[0].body.locale).toBeTruthy();
  expect(voiceRequests[0].body.timezone).toBeTruthy();
});

test('voice session effect is deferred until auth is ready (no request during refresh)', async ({ page }) => {
  await mockReturningAuthSession(page, 800);
  await rejectClientConversationSelection(page);

  let sessionRequestCount = 0;
  await page.route('**/api/v1/voice/sessions', async (route: Route) => {
    sessionRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-deferred',
        user_id: 'test-user',
        conversation_id: 'conversation-authorized-1',
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

  // Live mode, not demo.
  await expect(page.getByText('LIVE MODE', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMO MODE', { exact: true })).toHaveCount(0);
});

test('authenticated keyboard query reaches the structured Voice gateway response', async ({ page }) => {
  await mockReturningAuthSession(page, 0);
  await rejectClientConversationSelection(page);
  let sessionReady = 0;
  await page.route('**/api/v1/voice/sessions', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    sessionReady += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-query',
        user_id: 'test-user',
        conversation_id: 'conversation-authorized-1',
        correlation_id: 'corr-query',
        state: 'idle',
        language: 'en-US',
        locale: 'en-US',
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });
  let transcriptHit = 0;
  await page.route('**/api/v1/voice/sessions/voice-session-query/transcript', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    transcriptHit += 1;
    expect(route.request().postDataJSON()).toEqual({ transcript: 'What is your risk management framework?' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'voice-session-query',
        correlation_id: 'corr-query',
        state: 'completed',
        transcript: 'What is your risk management framework?',
        response_text: 'Arima applies explicit risk limits and permissioned decision controls.',
        visual_response_text: 'Arima applies explicit risk limits and permissioned decision controls.',
        events: [
          { event: 'thinking_started', sequence: 0, timestamp: new Date().toISOString(), data: {} },
          { event: 'speaking_started', sequence: 1, timestamp: new Date().toISOString(), data: {} },
          { event: 'session_completed', sequence: 2, timestamp: new Date().toISOString(), data: {} },
        ],
        demo: false,
      }),
    });
  });

  await page.goto('/executive');
  await expect.poll(() => sessionReady).toBe(1);
  await expect(page.getByRole('button', { name: 'Keyboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Keyboard' }).click();
  await page.getByLabel('Keyboard fallback / no audio is sent or stored').fill('What is your risk management framework?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => transcriptHit).toBe(1);
  await expect(page.locator('#arima-avatar-state')).toHaveText(/Arima (is speaking|completed the task|is ready)/);
  await expect(page.getByText('DEMO MODE', { exact: true })).toHaveCount(0);
});
