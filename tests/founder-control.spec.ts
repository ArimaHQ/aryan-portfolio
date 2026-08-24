import { expect, test, type Page } from '@playwright/test';

type FounderTestState = {
  observationHeaders: Record<string, string> | null;
  observationBody: Record<string, unknown> | null;
  circuitHeaders: Record<string, string> | null;
  depositHeaders: Record<string, string> | null;
  depositBody: Record<string, unknown> | null;
  tradeHeaders: Record<string, string> | null;
  tradeBody: Record<string, unknown> | null;
  financialStateRequests: string[];
  depositRequests: string[];
  mutationRequests: string[];
};

async function mockAuthenticatedFounderApi(page: Page, options: { forbidden?: boolean; mfaRequired?: boolean; financialStateFailure?: boolean; depositFailure?: boolean; depositAmbiguous?: boolean } = {}) {
  const state: FounderTestState = { observationHeaders: null, observationBody: null, circuitHeaders: null, depositHeaders: null, depositBody: null, tradeHeaders: null, tradeBody: null, financialStateRequests: [], depositRequests: [], mutationRequests: [] };
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
      state.mutationRequests.push(pathname);
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
  await page.route('**/api/v1/portfolio/operations/customers/*/financial-state', async (route) => {
    const request = route.request();
    state.financialStateRequests.push(new URL(request.url()).pathname);
    if (options.financialStateFailure) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Financial state unavailable' }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      user_id: 'customer-1', workspace_id: 'workspace-1', portfolio_id: null,
      financial_accounts: [], positions: [], ledger_activity_count: 0, settled_trade_count: 0,
    }) });
  });
  await page.route('**/portfolio/operations/customers/*/deposits', async (route) => {
    const request = route.request();
    state.depositRequests.push(new URL(request.url()).pathname);
    state.mutationRequests.push(request.url());
    state.depositHeaders = request.headers();
    state.depositBody = request.postDataJSON() as Record<string, unknown>;
    if (options.depositAmbiguous) {
      await route.abort('failed');
      return;
    }
    if (options.depositFailure && state.depositRequests.length === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Deposit unavailable' }) });
      return;
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      id: 'deposit-1', workspace_id: 'workspace-1', target_user_id: 'customer-1', founder_actor_id: 'founder-1',
      asset: 'USD', amount: '1.00', reference: state.depositBody?.reference, reason: state.depositBody?.reason,
      idempotency_key: state.depositBody?.idempotency_key, financial_transaction_id: 'transaction-1', financial_account_id: 'account-1',
    }) });
  });
  await page.route('**/portfolio/operations/customers/*/trades', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      state.mutationRequests.push(request.url());
      state.tradeHeaders = request.headers();
      state.tradeBody = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        id: 'trade-1', workspace_id: 'workspace-1', target_user_id: 'customer-1', founder_actor_id: 'founder-1', reversal_of_id: null,
        side: 'buy', base_asset: 'BTC', quote_asset: 'USD', quantity: '0.000001', price: '100', quote_value: '0.0001', fee_asset: 'USD', fee_amount: '0',
        executed_at: '2026-08-24T12:00:00Z', status: 'recorded', external_execution_id: 'test-reference', idempotency_key: 'test-trade-key-1234', reason: 'Founder manual accounting entry', created_at: '2026-08-24T12:00:01Z',
      }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{
      id: 'trade-1', workspace_id: 'workspace-1', target_user_id: 'customer-1', founder_actor_id: 'founder-1', reversal_of_id: null,
      side: 'buy', base_asset: 'BTC', quote_asset: 'USD', quantity: '0.000001', price: '100', quote_value: '0.0001', fee_asset: 'USD', fee_amount: '0',
      executed_at: '2026-08-24T12:00:00Z', status: 'recorded', external_execution_id: 'test-reference', idempotency_key: 'test-trade-key-1234', reason: 'Founder manual accounting entry', created_at: '2026-08-24T12:00:01Z',
    }]) });
  });
  await page.route('**/portfolio/operations/customers/*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      portfolio_id: 'portfolio-1',
      workspace_id: 'workspace-1',
      user_id: 'customer-1',
      balances: [{ asset: 'ETH', authoritative_balance: '2.5', available_balance: '2.5', reserved_balance: '0', pending_balance: '0' }],
      positions: [{ asset: 'BTC', quantity: '0.25', average_cost: '60000', realized_pnl: '0', unrealized_pnl: '1250' }],
      recent_ledger_activity: [{ id: 'transaction-1', transaction_type: 'deposit', status: 'posted', reference: 'deposit-1', source: 'ledger', created_at: '2026-08-11T09:00:00Z', posted_at: '2026-08-11T09:00:00Z' }],
    }) });
  });
  await page.route('**/api/v1/withdrawals/operations/circuit/**', async (route) => {
    if (route.request().method() === 'POST') {
      state.mutationRequests.push(route.request().url());
      state.circuitHeaders = route.request().headers();
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ workspace_id: 'workspace-1', state: route.request().method() === 'POST' ? 'paused' : 'enabled', reason: 'test', changed_at: '2026-08-11T09:00:00Z' }) });
  });
  return state;
}

test('Inspect loads authoritative financial state with the selected customer ID', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page);
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await expect(page.getByText('Empty persisted financial state.')).toBeVisible();
  await expect(page.getByText('No financial accounts returned.')).toBeVisible();
  await expect(page.getByText('Settled trade count')).toBeVisible();
  expect(state.financialStateRequests).toEqual(['/api/v1/portfolio/operations/customers/customer-1/financial-state']);
  expect(state.mutationRequests).toEqual([]);
});

test('Inspect renders an explicit financial-state API error', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page, { financialStateFailure: true });
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await expect(page.getByText('Financial state unavailable', { exact: true })).toBeVisible();
  expect(state.financialStateRequests).toHaveLength(1);
  expect(state.mutationRequests).toEqual([]);
});

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
  await expect(page.getByText('Record a customer deposit')).not.toBeVisible();
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
  await expect(page.getByText('BTC: 0.25')).toBeVisible();
  await expect(page.getByText(/deposit · posted · deposit-1/)).toBeVisible();
  await page.getByLabel('Quantity', { exact: true }).fill('0.000001');
  await page.getByLabel('Price', { exact: true }).fill('100');
  await page.getByRole('textbox', { name: 'Reference Optional' }).fill('test-reference');
  await page.getByRole('region', { name: 'Record persisted accounting' }).getByLabel('Reason', { exact: true }).fill('Founder manual accounting entry');
  await page.getByRole('button', { name: 'Review trade' }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm manual trade' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and record trade' }).click();
  await expect(page.getByText('Trade recorded and persisted. Portfolio and trade history were refreshed from the backend.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recorded trades' })).toBeVisible();
  await expect(page.getByText(/BUY 0.000001 BTC at 100 USD/)).toBeVisible();
  expect(state.tradeHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
  expect(state.tradeBody?.idempotency_key).toBeTruthy();
  expect(state.tradeBody?.external_execution_id).toBe('test-reference');
  await expect(page.getByText('Circuit breaker')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Pause withdrawals' }).click();
  await expect(page.getByRole('button', { name: 'Enable withdrawals' })).toBeVisible();
  expect(state.circuitHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
});

test('records a confirmed deposit for the selected customer and refreshes financial state', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page);
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await page.getByRole('button', { name: 'Review deposit' }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm manual deposit' })).toBeVisible();
  expect(state.depositRequests).toEqual([]);
  await page.getByRole('button', { name: 'Confirm and record deposit' }).click();
  await expect(page.getByText('Deposit recorded and persisted. Financial state was refreshed from the backend.')).toBeVisible();
  expect(state.depositRequests).toEqual(['/api/v1/portfolio/operations/customers/customer-1/deposits']);
  expect(state.depositHeaders?.['x-csrf-token']).toBe('founder-csrf-token');
  expect(state.depositBody).toMatchObject({ asset: 'USD', amount: '1.00', reference: 'STEP-4A-10-DEPOSIT-SMOKE', reason: 'Production accounting smoke test' });
  expect(state.depositBody?.idempotency_key).toEqual(expect.any(String));
  expect(state.financialStateRequests.length).toBeGreaterThanOrEqual(2);
});

test('keeps the same deposit idempotency key when retrying a failed request', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page, { depositFailure: true });
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await page.getByRole('button', { name: 'Review deposit' }).click();
  await page.getByRole('button', { name: 'Confirm and record deposit' }).click();
  await expect(page.getByText('Deposit unavailable', { exact: true })).toBeVisible();
  const firstKey = state.depositBody?.idempotency_key;
  await page.getByRole('button', { name: 'Review deposit' }).click();
  await page.getByRole('button', { name: 'Confirm and record deposit' }).click();
  await expect(page.getByText('Deposit recorded and persisted. Financial state was refreshed from the backend.')).toBeVisible();
  expect(state.depositRequests).toHaveLength(2);
  expect(state.depositBody?.idempotency_key).toBe(firstKey);
});

test('does not automatically retry an ambiguous deposit response', async ({ page }) => {
  const state = await mockAuthenticatedFounderApi(page, { depositAmbiguous: true });
  await page.goto('/admin');
  await page.getByLabel('Search by name, email, or account ID').fill('customer@example.com');
  await page.getByRole('button', { name: 'Search customers' }).click();
  await page.getByRole('button', { name: 'Inspect' }).click();
  await page.getByRole('button', { name: 'Review deposit' }).click();
  await page.getByRole('button', { name: 'Confirm and record deposit' }).click();
  await expect(page.getByText('The deposit response was ambiguous. Verify persisted financial state before retrying.', { exact: true })).toBeVisible();
  expect(state.depositRequests).toHaveLength(1);
});
