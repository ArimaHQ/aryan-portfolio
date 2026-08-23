import { expect, test, type Page } from '@playwright/test';

type FounderTestState = {
  observationHeaders: Record<string, string> | null;
  observationBody: Record<string, unknown> | null;
  circuitHeaders: Record<string, string> | null;
};

async function mockAuthenticatedFounderApi(page: Page, options: { forbidden?: boolean; mfaRequired?: boolean } = {}) {
  const state: FounderTestState = { observationHeaders: null, observationBody: null, circuitHeaders: null };
  await page.route('**/api/v1/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/refresh')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'founder-access-token',
          token_type: 'bearer',
          expires_in: 900,
          csrf_token: 'founder-csrf-token',
          user: {
            id: 'founder-user',
            email: 'founder@example.com',
            first_name: 'Founder',
            last_name: 'User',
            email_verified: true,
            created_at: '2026-08-11T00:00:00Z',
          },
        }),
      });
      return;
    }
    if (pathname.endsWith('/csrf')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ csrf_token: 'founder-csrf-token' }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });

  await page.route('**/api/v1/admin/founder/**', async (route) => {
    if (options.forbidden || options.mfaRequired) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: options.mfaRequired ? 'Privileged MFA enrollment is required' : 'Founder access is required' }) });
      return;
    }
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/system-health')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          generated_at: '2026-08-11T09:00:00Z',
          components: [{
            key: 'backend',
            label: 'Backend API',
            status: 'operational',
            checked_at: '2026-08-11T09:00:00Z',
            latency_ms: 2.5,
            provider: 'FastAPI',
            configuration: { state: 'not_applicable', environment: [] },
            message: 'The endpoint is responding from the authenticated API.',
          }],
        }),
      });
      return;
    }
    if (pathname.endsWith('/data-feeds') && request.method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          generated_at: '2026-08-11T09:00:00Z',
          feeds: [{
            key: 'market_data',
            label: 'Market data',
            provider: null,
            status: 'unavailable',
            freshness: 'unavailable',
            last_updated_at: null,
            source: null,
            entered_by: null,
            notes: null,
            expires_at: null,
            errors: [{ code: 'unverified_contract', message: 'No authenticated, versioned market-data feed contract is configured.' }],
            configuration: { state: 'manual_only', environment: [] },
            manual_entry_supported: true,
          }],
        }),
      });
      return;
    }
    if (pathname.endsWith('/observations') && request.method() === 'POST') {
      state.observationHeaders = request.headers();
      state.observationBody = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'observation-1',
          feed_key: 'market_data',
          status: 'manual',
          source: 'Founder verified source',
          observed_at: '2026-08-11T10:30:00Z',
          notes: null,
          expires_at: null,
          entered_by: 'founder@example.com',
          correlation_id: '10101010-1010-4010-8010-101010101010',
          created_at: '2026-08-11T10:30:01Z',
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });
  await page.route('**/api/v1/support/customers**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().method() === 'GET' && new URL(route.request().url()).pathname.endsWith('/customers') ? [{ id: 'customer-1', name: 'Customer One', email: 'customer@example.com', is_active: true, is_verified: true, roles: ['member'], created_at: '2026-08-11T00:00:00Z', last_login_at: null, last_login_ip: null, workspace_id: 'workspace-1' }] : { id: 'customer-1', name: 'Customer One', email: 'customer@example.com', is_active: true, is_verified: true, roles: ['member'], created_at: '2026-08-11T00:00:00Z', last_login_at: null, last_login_ip: null, workspace_id: 'workspace-1', password_changed_at: null, security_events: [], sessions: [], support_status: 'active', issue_indicators: [], portfolio_balances: [], withdrawal_statuses: [] }) });
  });
  await page.route('**/api/v1/withdrawals/operations/circuit/**', async (route) => {
    if (route.request().method() === 'POST') state.circuitHeaders = route.request().headers();
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ workspace_id: 'workspace-1', state: route.request().method() === 'POST' ? 'paused' : 'enabled', reason: 'test', changed_at: '2026-08-11T09:00:00Z' }) });
  });
  return state;
}

test('renders server-provided Founder Control data and records provenance with CSRF', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'System truth, without inferred data.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Backend API' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Market data' })).toBeVisible();
  await expect(page.getByText('No provenance source has been recorded.')).toBeVisible();

  await page.getByLabel('Source', { exact: true }).fill('Founder verified source');
  await page.getByLabel('Observed at', { exact: true }).fill('2026-08-11T10:30');
  await page.getByRole('button', { name: 'Record observation' }).click();

  await expect(page.getByText(/Observation recorded\. Correlation ID:/)).toBeVisible();
  expect(state.observationHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
  expect(state.observationHeaders?.authorization).toBe('Bearer founder-access-token');
  expect(state.observationBody?.source).toBe('Founder verified source');
  expect(typeof state.observationBody?.observed_at).toBe('string');
});

test('shows a server-forbidden state without attempting client-side role inference', async ({ page }) => {
  await mockAuthenticatedFounderApi(page, { forbidden: true });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Founder authorization is required.' })).toBeVisible();
  await expect(page.getByText('Founder access is required')).toBeVisible();
});

test('shows privileged MFA enrollment link while preserving the retry action', async ({ page }) => {
  await mockAuthenticatedFounderApi(page, { mfaRequired: true });

  await page.goto('/admin');
  await expect(page.getByText('Privileged MFA enrollment is required')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enroll privileged MFA' })).toHaveAttribute('href', /\/mfa-enroll\/?$/);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('searches customer inspection and protects circuit mutations with CSRF', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page);
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await expect(page.getByRole('heading', { name: 'Customer One' })).toBeVisible();
  await expect(page.getByText('Circuit breaker')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Pause withdrawals' }).click();
  await expect(page.getByRole('button', { name: 'Enable withdrawals' })).toBeVisible();
  expect(state.circuitHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
});
