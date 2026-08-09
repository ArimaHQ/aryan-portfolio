# Arima Finance Cinematic Experience

The official scroll-driven company experience for Arima Finance. It presents quantitative research, algorithm development, portfolio intelligence, company work and the Arima Finance Engine through a continuous institutional narrative.

## Technology

- Next.js 16 App Router running on the existing Cloudflare Worker through OpenNext
- React 19 and TypeScript
- Tailwind CSS 4
- GSAP with ScrollTrigger and scoped cleanup through `@gsap/react`
- Framer Motion for viewport-driven project transitions
- Lenis smooth scrolling on capable desktop devices
- CSS, SVG and DOM-based financial visuals; no video or mandatory WebGL payload

## Architecture

```text
app/
├── (auth)/                 # Login, registration and recovery
├── (protected)/            # Authenticated Executive OS routes
│   └── quant-research/     # Evidence-only Quant Trading Lab
├── (public)/               # Cinematic company experience
├── layout.tsx
└── providers.tsx
components/
├── avatar/                 # Arima avatar
├── dashboard/              # Authenticated workspace panels
├── executive/              # Executive, Voice and Quant Lab experiences
└── neural/                 # Performance-budgeted neural presentation
lib/
└── *-api.ts                # Typed same-origin API clients
```

Portfolio content is stored in typed data objects rather than embedded project-card markup. This keeps the catalogue CMS-ready and separates content from scene animation.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Copy the tracked environment template for a live local integration:

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` is compiled into the Next rewrite configuration. Restart
the dev server after changing it.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
npm run build:next
npm run test:e2e
```

`npm run build:next` validates the standard Next production build. `npm run
build` additionally creates the Cloudflare Worker bundle in `.open-next/`;
generated output is ignored by Git.

## Cloudflare Workers configuration

- Existing Worker: `aryan-portfolio`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Node.js version: 22 or newer

The Worker name is deliberately unchanged, preserving the existing
`arimafinance.xyz` custom domain, routes, runtime variables and deployment
history. Do not create a new Worker or switch the project back to a static
`out/` deployment.

`npm run build` produces `.open-next/`. Current Wrangler detects the OpenNext
configuration and delegates its deploy/version commands to the adapter, so the
existing Workers Builds trigger can remain in place without falling back to
the removed static export.

For a local Worker-runtime preview, run:

```bash
npm run preview
```

For an in-place production deployment after the build variables are configured,
run:

```bash
npm run deploy
```

The deploy commands pass `--keep-vars` so Wrangler preserves existing Worker
runtime variables.

### Production API and authentication

Set this Cloudflare Workers Builds variable for both Production and Preview
environments:

```env
NEXT_PUBLIC_API_URL=https://arima-executive-os-production.up.railway.app
NEXT_PUBLIC_ARIMA_DEMO_MODE=false
```

The API origin must not include `/api/v1`. The OpenNext Worker applies the
same-origin `/api/v1/*` rewrite to this Railway origin, so login, registration,
refresh, logout, profile, and session requests remain under
`https://arimafinance.xyz` in the browser while the Worker securely proxies the
backend response.

Before browser authentication can work from `https://arimafinance.xyz`, set
the following Railway service variables and redeploy the backend:

```env
ENVIRONMENT=production
FRONTEND_URL=https://arimafinance.xyz
CORS_ORIGINS=https://arimafinance.xyz,https://www.arimafinance.xyz
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
```

Leave `AUTH_COOKIE_DOMAIN` unset so cookies remain host-only for the Railway
API origin. Keep the backend `TRUSTED_HOSTS` list explicit and include both
`arima-executive-os-production.up.railway.app` and
`healthcheck.railway.app`. Without these backend variables, browsers reject
credentialed cross-origin requests even though the frontend build succeeds.

Keep `NEXT_PUBLIC_API_URL` present at build time. It is intentionally public
because it is the Railway origin compiled into the Worker rewrite, not a
credential. Runtime secrets and production bindings remain managed in the
existing Cloudflare Worker configuration.

## Experience behavior

- First visit: cinematic introduction with a persistent **Skip Intro** action.
- Completion: reaching Contact stores a local completion flag and reveals the final navigation.
- Returning visit: navigation is immediately available and early scenes use compact presentation.
- Replay: clears the completion flag and returns to the opening scene.
- Mobile: pinned and horizontal sequences are simplified; complex smooth scrolling is disabled.
- Reduced motion: pinned transitions and continuous animations are disabled while all content remains available.

## Public-content safeguards

- Institution names are environmental context only and never imply affiliation or endorsement.
- Client names, transaction terms, private datasets and operational credentials are excluded.
- The public Engine description does not expose proprietary strategy logic or configuration.
- Research status is sourced from external platform records.
- Performance and return claims are not published without validated evidence and context.

## Publication assets still needed

- Publication-approved founder portrait
- Reviewed public CV
- Engine handbook and approved documentation
- Approved research PDFs and case-study visuals
- Verified public LinkedIn profile URL
