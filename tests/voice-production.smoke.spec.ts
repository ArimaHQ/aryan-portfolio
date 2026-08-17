import { expect, test } from '@playwright/test';

const productionSmokeEnabled = process.env.PLAYWRIGHT_PROD_SMOKE === '1';
const email = process.env.ARIMA_E2E_EMAIL;
const password = process.env.ARIMA_E2E_PASSWORD;

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('production Voice smoke test', () => {
  test.skip(
    !productionSmokeEnabled || !email || !password,
    'Opt-in production smoke test skipped: approved credentials are absent or the smoke flag is disabled.',
  );

  test('completes one authenticated real Voice request', async ({ page }) => {
    let conversationRequests = 0;
    let sessionRequests = 0;
    let transcriptRequests = 0;
    let unauthorizedVoiceRequest = false;
    let voiceSessionStatus: number | null = null;
    let voiceSessionResponsePathname: string | null = null;
    let voiceSessionCorrelationId: string | null = null;
    let voiceSessionRailwayRequestId: string | null = null;
    let voiceSessionServer: string | null = null;
    let voiceSessionCfRay: string | null = null;
    let voiceSessionRailwayEdge: string | null = null;
    let voiceSessionAuthorizationPresent = false;
    let voiceSessionConversationIdPresent = false;
    let transcriptResponsePathname: string | null = null;
    let transcriptCorrelationId: string | null = null;
    let transcriptRailwayRequestId: string | null = null;
    let transcriptServer: string | null = null;
    let transcriptCfRay: string | null = null;
    let transcriptRailwayEdge: string | null = null;
    let transcriptAuthorizationPresent = false;
    let transcriptAuthorizationHeader: string | null = null;
    let transcriptConversationIdPresent = false;

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/v1/')) return;
      const isConversation = url.pathname === '/api/v1/conversations';
      const isSession = url.pathname === '/api/v1/voice/sessions';
      const isTranscript = /\/api\/v1\/voice\/sessions\/[^/]+\/transcript$/.test(url.pathname);
      if (!isConversation && !isSession && !isTranscript) return;
      if (!request.headers().authorization?.startsWith('Bearer ')) unauthorizedVoiceRequest = true;
      if (isConversation && request.method() === 'GET') conversationRequests += 1;
      if (isSession && request.method() === 'POST') {
        sessionRequests += 1;
        voiceSessionAuthorizationPresent = Boolean(request.headers().authorization);
        try {
          const body = request.postDataJSON() as { conversation_id?: unknown } | null;
          voiceSessionConversationIdPresent = Boolean(body?.conversation_id);
        } catch {
          voiceSessionConversationIdPresent = false;
        }
      }
      if (isTranscript && request.method() === 'POST') {
        transcriptRequests += 1;
        transcriptAuthorizationPresent = Boolean(request.headers().authorization);
        transcriptAuthorizationHeader = request.headers().authorization ?? null;
        try {
          const body = request.postDataJSON() as { conversation_id?: unknown } | null;
          transcriptConversationIdPresent = Boolean(body?.conversation_id);
        } catch {
          transcriptConversationIdPresent = false;
        }
      }
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (response.request().method() === 'POST' && url.pathname === '/api/v1/voice/sessions') {
        voiceSessionStatus = response.status();
        voiceSessionResponsePathname = url.pathname;
        const headers = response.headers();
        voiceSessionCorrelationId = headers['x-correlation-id'] ?? null;
        voiceSessionRailwayRequestId = headers['x-railway-request-id'] ?? null;
        voiceSessionServer = headers.server ?? null;
        voiceSessionCfRay = headers['cf-ray'] ?? null;
        voiceSessionRailwayEdge = headers['x-railway-edge'] ?? null;
      }
      if (
        response.request().method() === 'POST'
        && /\/api\/v1\/voice\/sessions\/[^/]+\/transcript$/.test(url.pathname)
      ) {
        transcriptResponsePathname = url.pathname;
        const headers = response.headers();
        transcriptCorrelationId = headers['x-correlation-id'] ?? null;
        transcriptRailwayRequestId = headers['x-railway-request-id'] ?? null;
        transcriptServer = headers.server ?? null;
        transcriptCfRay = headers['cf-ray'] ?? null;
        transcriptRailwayEdge = headers['x-railway-edge'] ?? null;
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(email as string);
    await page.getByLabel('Password').fill(password as string);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // LoginPage redirects to returnPath, selectedDivision, or dashboard via
    // client-side router.push. Polling location handles all valid destinations
    // without requiring a full document load event.
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .not.toMatch(/^\/login(?:\/|$)/);

    await page.goto('/executive', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => conversationRequests, { timeout: 30_000 }).toBe(1);
    await expect.poll(() => sessionRequests, { timeout: 30_000 }).toBe(1);
    await expect.poll(() => voiceSessionStatus, { timeout: 30_000 }).not.toBeNull();
    console.log(
      `[voice-smoke] status=${voiceSessionStatus ?? 'unknown'} `
      + `pathname=${voiceSessionResponsePathname ?? 'unknown'} `
      + `x-correlation-id=${voiceSessionCorrelationId ?? 'absent'} `
      + `x-railway-request-id=${voiceSessionRailwayRequestId ?? 'absent'} `
      + `server=${voiceSessionServer ?? 'absent'} `
      + `cf-ray=${voiceSessionCfRay ?? 'absent'} `
      + `x-railway-edge=${voiceSessionRailwayEdge ?? 'absent'} `
      + `authorization_present=${voiceSessionAuthorizationPresent} `
      + `conversation_id_present=${voiceSessionConversationIdPresent}`,
    );
    if (voiceSessionStatus === null || voiceSessionStatus < 200 || voiceSessionStatus >= 300) {
      throw new Error('Voice session response was not successful; stopping before transcript.');
    }
    expect(unauthorizedVoiceRequest).toBe(false);

    await page.getByRole('button', { name: 'Keyboard' }).click();
    await page.getByLabel('Keyboard fallback / no audio is sent or stored').fill(
      'What is your risk management framework?',
    );

    const transcriptResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST'
        && /\/api\/v1\/voice\/sessions\/[^/]+\/transcript$/.test(url.pathname);
    }, { timeout: 60_000 });
    await page.getByRole('button', { name: 'Send' }).click();
    const response = await transcriptResponse;
    console.log(
      `[voice-smoke] transcript_status=${response.status()} `
      + `transcript_pathname=${transcriptResponsePathname ?? new URL(response.url()).pathname} `
      + `transcript_x-correlation-id=${transcriptCorrelationId ?? 'absent'} `
      + `transcript_x-railway-request-id=${transcriptRailwayRequestId ?? 'absent'} `
      + `transcript_server=${transcriptServer ?? 'absent'} `
      + `transcript_cf-ray=${transcriptCfRay ?? 'absent'} `
      + `transcript_x-railway-edge=${transcriptRailwayEdge ?? 'absent'} `
      + `transcript_authorization_present=${transcriptAuthorizationPresent} `
      + `transcript_conversation_id_present=${transcriptConversationIdPresent}`,
    );
    if (response.status() === 403) {
      const transcriptPathname = new URL(response.url()).pathname;
      const sessionId = transcriptPathname.match(/\/api\/v1\/voice\/sessions\/([^/]+)\/transcript$/)?.[1];
      if (!sessionId || !transcriptAuthorizationHeader) {
        throw new Error('Transcript 403 diagnostic could not reuse the authenticated request context.');
      }
      const diagnostic = await page.evaluate(async ({ sessionId, authorization }) => {
        const diagnosticResponse = await fetch(
          `/api/v1/admin/founder/voice/sessions/${sessionId}/authorization-diagnostic`,
          { headers: { Authorization: authorization } },
        );
        return {
          status: diagnosticResponse.status,
          correlationId: diagnosticResponse.headers.get('x-correlation-id'),
          railwayRequestId: diagnosticResponse.headers.get('x-railway-request-id'),
          body: await diagnosticResponse.json(),
        };
      }, { sessionId, authorization: transcriptAuthorizationHeader });
      console.log(`[voice-smoke] authorization_diagnostic=${JSON.stringify(diagnostic)}`);
      return;
    }
    expect(response.ok()).toBe(true);
    const payload = await response.json() as {
      session_id?: unknown;
      correlation_id?: unknown;
      response_text?: unknown;
      visual_response_text?: unknown;
      state?: unknown;
      demo?: unknown;
    };
    expect(transcriptRequests).toBe(1);
    expect(unauthorizedVoiceRequest).toBe(false);
    expect(typeof payload.session_id).toBe('string');
    expect(typeof payload.correlation_id).toBe('string');
    expect(typeof payload.response_text).toBe('string');
    expect((payload.response_text as string).length).toBeGreaterThan(0);
    expect(typeof payload.visual_response_text).toBe('string');
    expect(payload.state).toBe('completed');
    expect(payload.demo).toBe(false);
  });
});
