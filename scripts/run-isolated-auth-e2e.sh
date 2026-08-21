#!/usr/bin/env bash
set -euo pipefail
fail() { echo "ISOLATED_E2E_REFUSED: $1" >&2; exit 2; }
[[ "${ARIMA_E2E_RUN:-}" == "1" ]] || fail "set ARIMA_E2E_RUN=1"
[[ "${ARIMA_E2E_ENV:-}" == "isolated" ]] || fail "set ARIMA_E2E_ENV=isolated"
[[ "${ARIMA_E2E_CONFIRMATION:-}" == "ISOLATED_ONLY" ]] || fail "set ARIMA_E2E_CONFIRMATION=ISOLATED_ONLY"
[[ -n "${ARIMA_E2E_ENV_ID:-}" ]] || fail "set ARIMA_E2E_ENV_ID"
[[ "${ARIMA_E2E_BASE_URL:-}" == https://* ]] || fail "set an explicit HTTPS ARIMA_E2E_BASE_URL"
[[ -n "${ARIMA_E2E_TARGET_MANIFEST:-}" && -f "${ARIMA_E2E_TARGET_MANIFEST}" ]] || fail "set ARIMA_E2E_TARGET_MANIFEST to an approved manifest file"
node -e '
const fs = require("node:fs");
let m;
try { m = JSON.parse(fs.readFileSync(process.env.ARIMA_E2E_TARGET_MANIFEST, "utf8")); } catch { process.stderr.write("ISOLATED_E2E_REFUSED: manifest is not readable JSON\n"); process.exit(2); }
let u;
try { u = new URL(m.baseURL); } catch { process.stderr.write("ISOLATED_E2E_REFUSED: manifest URL is invalid\n"); process.exit(2); }
if (m.approved !== true || m.environment !== "isolated" || !m.environmentId || !m.hostname || u.protocol !== "https:" || u.hostname !== m.hostname || u.toString() !== m.baseURL || m.baseURL !== process.env.ARIMA_E2E_BASE_URL || m.environmentId !== process.env.ARIMA_E2E_ENV_ID || u.username || u.password || u.search || u.hash || u.pathname !== "/") { process.stderr.write("ISOLATED_E2E_REFUSED: isolated URL, hostname, and environment ID must exactly match the approved manifest\n"); process.exit(2); }
'
[[ -n "${ARIMA_E2E_EMAIL:-}" && -n "${ARIMA_E2E_PASSWORD:-}" ]] || fail "inject isolated credentials through the secret manager"
exec npm run test:e2e -- tests/isolated-auth.e2e.spec.ts --project=chromium-desktop
