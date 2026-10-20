# ARIMA Journey guide and access requests

The guide lives at the end of `/journey/` (`public/cinematic/guide.js`, markup and styles in
`features/cinematic-home/index.html`). It answers only from the Journey's approved content
(`public/cinematic/content.js` and page text) and never quotes prices, dates or account status.

## Server pieces

| Path | Purpose |
| --- | --- |
| `POST /api/access-requests` | Stores a confirmed request, then tries to email it |
| `POST /api/access-requests/email-setup` | Operator check of the Resend key and sending domain (same bearer token) |
| `GET /api/access-requests/status?reference=ARQ-…` | Operator view of one stored request and its email status, no personal details (same bearer token) |
| `POST /api/access-requests/retry` | Operator retry of pending emails (`Authorization: Bearer $ACCESS_REQUEST_ADMIN_TOKEN`; add `?include_failed=1` to requeue permanent failures) |
| `POST /api/email/resend-webhook` | Resend webhook: `email.received` is stored as an inbound email; `email.delivered`, `email.bounced`, `email.delivery_delayed`, `email.complained` and `email.failed` set the delivery status of the access request they belong to. Requires a valid Svix signature made with `RESEND_WEBHOOK_SECRET`; each event id is processed once |
| `GET /api/email/inbound` | Operator list of received emails, masked unless `?full=1` (same bearer token) |
| `GET /api/guide/status` | Booleans only: storage, email and server voice switched on |
| `POST /api/guide/speech` | Optional neural voice (Azure AI Speech) |

Requests are stored in the `AccessRequestsStore` Durable Object (SQLite storage,
`lib/access-requests/durable-object.mjs`, exported from `cloudflare-worker.mjs`) before any email is attempted.
It is created with the Worker deployment, so the Cloudflare token needs no D1 permission.
States: `pending` → `accepted` (the email provider accepted the message) or `failed`.
`accepted` is not proof of inbox delivery. Retries back off from 5 minutes up to 6 attempts and
use an idempotency key, so a retry never sends a second email.

## Configuration (Worker settings, never in browser code)

| Name | Kind | Needed for |
| --- | --- | --- |
| `ACCESS_REQUESTS_DO` | Durable Object binding | Storing requests (declared in `wrangler.jsonc`) |
| `RESEND_API_KEY` | Secret | Sending email through Resend |
| `ACCESS_REQUEST_EMAIL_FROM` | Secret | Sender; set by the deploy once the domain is verified (default `onboarding@resend.dev`) |
| `ACCESS_REQUEST_EMAIL_TO` | Var | Destination; defaults to the confirmed ARIMA address |
| `RESEND_WEBHOOK_SECRET` | Secret | Signing secret (`whsec_…`) of the Resend webhook endpoint |
| `ACCESS_REQUEST_ADMIN_TOKEN` | Secret | Using the retry endpoint |
| `ACCESS_REQUEST_RETENTION_DAYS` | Var | Retention shown in the privacy notice and enforced on purge (default 180) |
| `ACCESS_REQUEST_HASH_SALT` | Secret | Salt for the hashed client address used in rate limiting |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Secret, var | Neural voice; without them the browser's own voice is used |

Put `RESEND_API_KEY` on the Worker (Cloudflare dashboard → Workers & Pages → aryan-portfolio → Settings →
Variables and Secrets → Add → Secret), or as a GitHub Actions secret, which the deploy copies to the Worker. Each deploy
sets `ACCESS_REQUEST_ADMIN_TOKEN` (the GitHub secret of that name, or a fresh random one), then calls
`POST /api/access-requests/email-setup`: the Worker checks `arimafinance.xyz` in Resend with its own key, adds the domain if
missing, and the run summary lists any DNS records still needed. Once the domain is verified the deploy sets the sender
to `access@arimafinance.xyz`; until then it is `onboarding@resend.dev`, which Resend only delivers to the account owner's
address. Run the workflow with `send_test_request` to post one labelled test request (`ARIMA-QA-Test`) and print its stored
record and email status.

Other secrets can be set with `npx wrangler secret put NAME` (or Cloudflare dashboard → Workers → aryan-portfolio
→ Settings → Variables and secrets). The deploy uses `--keep-vars`, so they survive deploys.

## Spam and privacy

Same-origin check, a hidden honeypot field, a minimum completion time, 5 requests per client per hour,
and one record per `submissionId` (repeat clicks return the same reference). Routine logs carry only the
reference and email status. Records older than the retention period are purged on each submission and
retry run.

## Received email

Resend receives mail for `arimafinance.xyz` (its MX record) and posts `email.received` to
`https://arimafinance.xyz/api/email/resend-webhook`. The Worker checks the signature and timestamp (5 minutes),
stores the event id so a redelivery is acknowledged without being processed again, stores the email's metadata
in the `inbound_emails` table of the Durable Object, then reads the body from Resend
(`GET /emails/receiving/{id}`). A sending-only API key cannot read bodies; the email is still stored with
`body_status` `http_401` or `http_403`. Received email and webhook events are purged after the retention period.
Run the deploy workflow with `check_inbound` to list the newest received emails with masked addresses.
