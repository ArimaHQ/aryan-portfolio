# Isolated authentication E2E runbook

This preparation artifact does not authorize production testing, deployment,
customer-data access, QTrade, or customer capital.

## Required guard

The runner requires `ARIMA_E2E_RUN=1`, `ARIMA_E2E_ENV=isolated`,
`ARIMA_E2E_CONFIRMATION=ISOLATED_ONLY`, an explicit `ARIMA_E2E_ENV_ID`, an
explicit HTTPS `ARIMA_E2E_BASE_URL`, and `ARIMA_E2E_TARGET_MANIFEST` pointing
to an externally supplied JSON manifest with `approved: true`,
`environment: "isolated"`, the exact `baseURL`, exact `hostname`, and exact
`environmentId`. The configured URL,
hostname, and environment ID must all match that manifest; no target is
guessed or inferred. Test-account credentials must be injected through an
approved secret manager as `ARIMA_E2E_EMAIL`/`ARIMA_E2E_PASSWORD`.

The isolated suite disables traces, screenshots, videos, and retained failure
output so authentication secrets are not written to Playwright artifacts.

## One-run workflow

1. Have the authorized environment owner supply an approved manifest for the
   already provisioned isolated application. This runbook does not provision,
   discover, or validate Railway targets.
2. Provision two non-customer test accounts in separate scopes when isolation
   coverage is required. The privileged account must be authorized for MFA.
3. Inject credentials through the secret manager; never put them on the command
   line, in a file, or in logs.
4. Run from this project:

```bash
npm run test:e2e:isolated-auth
```

The suite covers login, cookie flags, memory-only access-token storage, MFA
enrollment, protected routes, Founder/Super Admin rejection for an ordinary
account, two-account boundary checks, and logout invalidation. The existing
backend auth/security tests cover the controlled recovery, rate-limit,
refresh-rotation/replay, CSRF, and concurrent-session cases; run those in the
same isolated application/database evidence window.

This remains isolated-environment evidence, not production proof. Do not mark
Authentication Security closed until the complete authorized run passes.
