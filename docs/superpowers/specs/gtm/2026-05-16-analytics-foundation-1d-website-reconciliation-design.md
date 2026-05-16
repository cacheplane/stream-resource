---
workstream: analytics-foundation-1d-website-reconciliation
status: approved
owner: brian
phase: 0
spec: docs/superpowers/specs/gtm/2026-05-16-analytics-foundation-1d-website-reconciliation-design.md
plan: docs/superpowers/plans/gtm/2026-05-16-analytics-foundation-1d-website-reconciliation.md
parent: docs/superpowers/specs/gtm/2026-05-13-gtm-meta-design.md
---

# Analytics Foundation 1D — Website Reconciliation (Design)

> Spec 1D of the Cacheplane GTM motion. Routes every first-party event through a per-app proxy so ad-blockers can't drop telemetry, and deduplicates the analytics guard logic shared by `apps/website` and `apps/cockpit`.

## 1. Goal

Two outcomes:

1. **First-party ingest end-to-end.** Every `marketing:*`, `docs:*`, `cockpit:*`, and `ngaf:*` event reaches PostHog via a same-origin Next.js route on a `*.cacheplane.ai` subdomain. The browser sees only `cacheplane.ai/api/ingest` or `cockpit.cacheplane.ai/api/ingest` — never `*.posthog.com` — so network-level ad-blockers stop dropping our telemetry.
2. **One source of truth for the capture guard.** `shouldCaptureAnalytics`, `isLocalhost`, and the shared helpers move into `@ngaf/telemetry`. The duplicate copies in `apps/website` and `apps/cockpit` get deleted.

## 2. Context

- Parent: `docs/superpowers/specs/gtm/2026-05-13-gtm-meta-design.md` §7 names 1D's deliverables as "audit complete; `marketing:lead_qualified` server enrichment ships; `/api/ingest` proxy live."
- The original meta-spec text scoped two additional items into 1D — the audit/drift guard and `marketing:lead_qualified` server enrichment. Both have been deliberately split out of 1D and will land in a separate follow-up spec. 1D's scope is therefore the proxy work plus the consolidation cleanup.
- The website's `/api/ingest` proxy already exists (Spec 1B shipped it) but accepts only events whose name starts with `ngaf:`. That tight scope was correct then — it was the consumer-app browser-silence path. With Spec 1C now emitting `cockpit:*` and the website still firing `marketing:*` + `docs:*` direct to `us.i.posthog.com`, the proxy needs to widen and a sibling proxy needs to stand up on the cockpit app.
- Spec 1C smoke (PR #357) confirmed end-to-end event capture works with direct ingest. 1D is the production-hardening step: route through first-party so ad-blockers don't silently corrupt the funnel.
- The cockpit iframe Angular apps are pure static builds — no server-side. They post cross-origin to the cockpit shell's proxy. CORS is therefore a first-class concern.

## 3. Scope

**In scope:**

- New `apps/cockpit/src/app/api/ingest/route.ts` Next.js route. Accepts events whose name matches `^cockpit:`. Validates the `PUBLIC_INGEST_KEY` anti-abuse field. Forwards to PostHog Cloud via `posthog-node`. Returns proper CORS headers so the iframe Angular apps can POST cross-origin.
- Widen `apps/website/src/app/api/ingest/route.ts` allowlist from `^ngaf:` to `^(ngaf|marketing|docs):`. The existing posthog-node forwarding stays; only the prefix check changes.
- Configure `posthog-js` in both shells to use the same-origin proxy:
  - `apps/website/instrumentation-client.ts` adds `api_host: '/api/ingest'`.
  - `apps/cockpit/instrumentation-client.ts` and `apps/cockpit/src/components/analytics-bootstrap.tsx` add `api_host: '/api/ingest'`.
- Update `apps/cockpit/src/components/run-mode/run-mode.tsx` so the `cockpit_host` URL param defaults to the cockpit shell's `/api/ingest` (absolute URL, env-driven for prod, current origin for dev) instead of `https://us.i.posthog.com`. Iframes pick this up via the existing `cockpit_host` URL param channel and pass it to `posthog.init({ api_host })`.
- Move `shouldCaptureAnalytics`, `isLocalhost` into `libs/telemetry/src/browser/properties.ts`. Move `toSafeAnalyticsString`, `getEmailDomain`, `normalizePostHogHost`, `getSourcePage` into `libs/telemetry/src/shared/properties.ts` (already exists). Export from the respective `public-api.ts`.
- Both apps update imports to consume from `@ngaf/telemetry/browser` (or `@ngaf/telemetry/shared`). The duplicated `apps/website/src/lib/analytics/properties.ts` and `apps/cockpit/src/lib/analytics/properties.ts` files are deleted in the same PR (no transitional shim — all consumers update at once). The remaining app-specific surfaces in `apps/<x>/src/lib/analytics/` (`client.ts`, `events.ts`, `distinct-id.ts`, etc.) are unchanged.
- New tests:
  - `apps/cockpit/src/app/api/ingest/route.spec.ts` covering accept/reject prefix matrix, key validation, CORS preflight (OPTIONS) handling, forwarding to posthog-node.
  - Update `apps/website/src/app/api/ingest/route.ts` route tests for the widened prefix matrix.
  - The moved `properties.spec.ts` tests follow the code into `libs/telemetry`.
- `.env.example` documents new env vars: `NEXT_PUBLIC_COCKPIT_INGEST_HOST` (the cockpit proxy's absolute URL for iframes to target — defaults to current origin in dev). Existing `NEXT_PUBLIC_COCKPIT_POSTHOG_HOST` remains for backward compatibility but is no longer set by default.

**Out of scope:**

- Audit/drift guard between taxonomy and code fire sites. Deferred to a follow-up spec.
- `marketing:lead_qualified` server enrichment and qualification rules. Deferred to a follow-up spec.
- Server-side event signing or per-tenant proxy keys. The shared `PUBLIC_INGEST_KEY` constant stays as a soft anti-abuse measure; defense against determined attackers is not a goal.
- Changes to the consumer-facing `@ngaf/telemetry` trust contract or its README.
- Dashboard or insight changes (no taxonomy churn in this spec).

**Success criteria:**

- DevTools network panel on `cacheplane.ai` and `cockpit.cacheplane.ai` shows no requests to `*.posthog.com` for `marketing:*`, `docs:*`, or `cockpit:*` events. All capture traffic goes to `*.cacheplane.ai/api/ingest`.
- DevTools network panel on `examples.cacheplane.ai` (cockpit iframes) shows cross-origin POSTs to `cockpit.cacheplane.ai/api/ingest`, returning 200 with proper `Access-Control-Allow-Origin`.
- `apps/website/src/lib/analytics/properties.ts` and `apps/cockpit/src/lib/analytics/properties.ts` are deleted (or shrunk to a thin re-export shim if a transitional period is needed).
- All existing event captures still land in PostHog with the same event names, properties, and distinct_id (cross-frame correlation unchanged).
- `npx nx run-many -t test -p website,cockpit,telemetry` is green.

## 4. Architecture

```
Browser (cacheplane.ai)               Browser (cockpit.cacheplane.ai)         Browser (examples.cacheplane.ai, iframe)
  │  posthog-js                          │  posthog-js                            │  posthog-js
  │  api_host: '/api/ingest'             │  api_host: '/api/ingest'               │  api_host: <cockpit_host URL param>
  │                                      │                                        │
  ▼                                      ▼                                        ▼  (cross-origin POST)
/api/ingest (website)                  /api/ingest (cockpit)                    cockpit.cacheplane.ai/api/ingest
  prefix allowlist:                      prefix allowlist:                        ▲
   ^(ngaf|marketing|docs):                 ^cockpit:                              │
  validates PUBLIC_INGEST_KEY            validates PUBLIC_INGEST_KEY              │
  posthog-node.capture()                 posthog-node.capture()                   │
       │                                      │                                   │
       └────────────────┬─────────────────────┘───────────────────────────────────┘
                        │
                        ▼
                 us.i.posthog.com  (server-side; never visible to ad-blockers)
```

## 5. Components

### 5.1 `libs/telemetry/src/browser/properties.ts` (new)

Exports the two functions both shells need:

```typescript
export interface ShouldCaptureInput {
  token: string | undefined;
  captureLocal: boolean;
  host: string | undefined;
}

export function shouldCaptureAnalytics(input: ShouldCaptureInput): boolean { ... }
export function isLocalhost(host: string | undefined): boolean { ... }
```

Re-exported from `libs/telemetry/src/browser/public-api.ts` so both shells consume via `import { shouldCaptureAnalytics } from '@ngaf/telemetry/browser';`. Tests move from the apps into `libs/telemetry/src/browser/properties.spec.ts` (jsdom). No new tests required beyond the relocation — the existing 4 cockpit + 5 website tests cover the matrix.

### 5.2 `libs/telemetry/src/shared/properties.ts` (extend)

The shared subpath already exists. Move the cross-runtime helpers here:

```typescript
export function toSafeAnalyticsString(value: unknown, maxLength = 200): string | undefined { ... }
export function getEmailDomain(email: unknown): string | null { ... }
export function getSourcePage(value: unknown): string { ... }
export function normalizePostHogHost(host: string | undefined): string { ... }
```

The website's server-side code (`apps/website/src/lib/analytics/server.ts`, `apps/website/src/app/api/leads/route.ts`, etc.) updates imports to `@ngaf/telemetry/shared`.

### 5.3 `apps/cockpit/src/app/api/ingest/route.ts` (new)

Mirrors the existing website route, with three differences:

1. **Prefix allowlist:** `^cockpit:` only. Reject anything else with 400.
2. **CORS headers** on both POST responses and OPTIONS preflight:
   - `Access-Control-Allow-Origin` matches request origin against an allowlist regex: `^https://([a-z-]+\.)?cacheplane\.ai$` (prod) plus `^http://localhost:\d+$` (dev). Reject other origins.
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type`
   - `Access-Control-Max-Age: 86400`
3. **Per-event distinct_id passthrough:** the iframe's `cockpit_did` is in the payload's `distinctId` field. Forward as-is — no derivation server-side.

The `PUBLIC_INGEST_KEY` constant in the cockpit route matches the website route's value (Spec 1B established the convention).

### 5.4 `apps/website/src/app/api/ingest/route.ts` (modified)

One change: the prefix check at line ~35 becomes:

```typescript
if (!event || !/^(ngaf|marketing|docs):/.test(event)) return null;
```

(was: `!event?.startsWith('ngaf:')`)

Everything else stays — same validation, same posthog-node forwarding, same response shape.

### 5.5 PostHog client config

**`apps/website/instrumentation-client.ts`:**

```typescript
posthog.init(token!, {
  api_host: '/api/ingest',      // NEW — was normalizePostHogHost(env)
  defaults: '2026-01-30',
  capture_pageview: true,
  person_profiles: 'always',
});
```

**`apps/cockpit/instrumentation-client.ts` + `apps/cockpit/src/components/analytics-bootstrap.tsx`:**

```typescript
posthog.init(token!, {
  api_host: '/api/ingest',      // NEW — was process.env.NEXT_PUBLIC_COCKPIT_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  persistence: 'memory',
  bootstrap: { distinctID: getCockpitSessionId() },
  autocapture: false,
  capture_pageview: false,
  defaults: '2026-01-30',
});
```

### 5.6 `apps/cockpit/src/components/run-mode/run-mode.tsx`

`buildIframeSrc` currently sets `cockpit_host` from `NEXT_PUBLIC_COCKPIT_POSTHOG_HOST`. Update to use `NEXT_PUBLIC_COCKPIT_INGEST_HOST` (new env var), falling back to the current origin's `/api/ingest` for dev:

```typescript
const ingestHost =
  process.env.NEXT_PUBLIC_COCKPIT_INGEST_HOST
    ?? `${window.location.origin}/api/ingest`;
if (ingestHost) url.searchParams.set('cockpit_host', ingestHost);
```

The Angular harness (`libs/cockpit-telemetry/src/lib/distinct-id.ts:readCockpitConfigFromIframe` and `cockpit-telemetry.service.ts`) already plumbs `posthogHost` to `posthog.init({ api_host })`. No library-side change needed.

## 6. Data flow

For a single `cockpit:chat_first_message` event fired from an iframe:

1. User submits first chat message in `examples.cacheplane.ai/streaming` (iframe).
2. `CockpitTelemetryService` observes `CHAT_LIFECYCLE.firstMessageSent` flip and calls `posthog.capture('cockpit:chat_first_message', { capability: 'streaming' })`.
3. `posthog-js` POSTs to `https://cockpit.cacheplane.ai/api/ingest` (read from `cockpit_host` URL param at init).
4. Cockpit `/api/ingest` handler:
   - Validates Origin header against allowlist regex (allows `https://examples.cacheplane.ai`).
   - Validates `PUBLIC_INGEST_KEY` field in body.
   - Validates event prefix `^cockpit:`.
   - Calls `posthog-node` to forward `(distinctId, event, properties)` to `https://us.i.posthog.com/e/`.
   - Returns `200 OK` with `Access-Control-Allow-Origin: https://examples.cacheplane.ai`.
5. Event lands in PostHog with `distinct_id: cockpit_<uuid>` matching the parent shell's session.

For a `marketing:cta_click` from the website:

1. User clicks tracked CTA on `cacheplane.ai/pricing`.
2. `track('marketing:cta_click', {...})` invokes `posthog.capture(...)`.
3. `posthog-js` POSTs to `/api/ingest` (relative URL, same-origin).
4. Website `/api/ingest` validates prefix + key, forwards via posthog-node.
5. Event lands in PostHog.

## 7. Error handling

- **Proxy 4xx on bad input:** prefix mismatch, missing key, malformed body all return 400 with `{ error: '<reason>' }`. No event capture happens.
- **CORS denial:** unknown Origin gets a 403 with no `Access-Control-Allow-Origin` header. Browser blocks the response.
- **PostHog cloud down:** posthog-node has internal retry; we don't add additional retry. Return 200 to the client regardless — analytics is fire-and-forget and we don't block UX on PostHog availability.
- **Lambda timeout:** posthog-node's `flushAt: 1` + `flushInterval: 0` should keep the proxy hot for ~50-100ms. If it ever exceeds 10s the lambda will be killed; the event is lost. Same trade-off as direct ingestion.
- **Silent fail at the source:** the `client.ts` `track()` wrapper in each app already wraps `posthog.capture()` in `try/catch`. No change.

## 8. Testing strategy

- **Unit (jsdom):** properties tests move with the code into `libs/telemetry`. Same matrix as today.
- **Route handler (vitest):** for each proxy:
  - Accept events matching the allowlist → forwarded to mock posthog-node, 200 returned.
  - Reject events outside the allowlist → 400 returned, no forward.
  - Reject missing/wrong `PUBLIC_INGEST_KEY` → 400 returned.
  - Reject missing `distinctId` or `event` → 400 returned.
  - Cockpit-only: OPTIONS preflight returns 204 with CORS headers; POST from allowed origin returns CORS-laden 200; POST from disallowed origin returns 403 without CORS headers.
- **Integration (manual, post-deploy):** load each cockpit + website page, open DevTools network, confirm no `*.posthog.com` requests appear and `*.cacheplane.ai/api/ingest` POSTs return 200.

## 9. Risks

- **The `/api/ingest` lambda becomes a single point of failure.** If it goes down, the funnel goes dark until it recovers. Mitigated by: (a) Vercel SLA, (b) posthog-node's silent-fail in the route handler so 200 always returns to the client, (c) source-side `try/catch`.
- **Extra Vercel lambda invocations.** Each capture is now a function call. Free-tier budget is ~100k/month. Conservative estimate for cockpit + website combined: <50k/month. If we ever exceed, we re-evaluate proxy strategy (e.g., edge runtime).
- **Cross-origin CORS regressions.** Adding/changing subdomains breaks the iframe path if the regex isn't updated. Mitigated by tests that exercise the matrix and the explicit allowlist regex (not `*`).
- **Existing PostHog-direct dashboards keep working** because the events land identically in PostHog regardless of routing. No taxonomy or insight change needed.

## 10. Phases

1. **Phase 0 — Consolidate `properties.ts`.** Move helpers into `libs/telemetry`. Update both apps to import from there. Delete duplicate sources. Tests follow. (~6 commits.)
2. **Phase 1 — Widen website proxy + posthog-js config.** Update the prefix regex in `apps/website/src/app/api/ingest/route.ts`. Configure `posthog-js` with `api_host: '/api/ingest'`. Update route tests. (~3 commits.)
3. **Phase 2 — New cockpit proxy + posthog-js config.** Create `apps/cockpit/src/app/api/ingest/route.ts` with CORS. Configure `posthog-js`. Update `run-mode.tsx` to point iframes at the proxy. New tests. (~5 commits.)
4. **Phase 3 — `.env.example` + dev docs.** Document `NEXT_PUBLIC_COCKPIT_INGEST_HOST`. Update cockpit's smoke procedure to use the proxy. (~2 commits.)

## 11. Deliverables

- ☐ `libs/telemetry/src/browser/properties.ts` + spec
- ☐ `libs/telemetry/src/shared/properties.ts` extended + spec
- ☐ `apps/website/src/app/api/ingest/route.ts` widened
- ☐ `apps/website/instrumentation-client.ts` updated
- ☐ `apps/cockpit/src/app/api/ingest/route.ts` + spec (new)
- ☐ `apps/cockpit/instrumentation-client.ts` + `analytics-bootstrap.tsx` updated
- ☐ `apps/cockpit/src/components/run-mode/run-mode.tsx` env-driven `cockpit_host`
- ☐ `apps/website/src/lib/analytics/properties.ts` deleted
- ☐ `apps/cockpit/src/lib/analytics/properties.ts` deleted
- ☐ Server-side imports updated to consume from `@ngaf/telemetry/shared` (`apps/website/src/lib/analytics/server.ts`, `apps/website/src/app/api/leads/route.ts`, etc.)
- ☐ `.env.example` documents `NEXT_PUBLIC_COCKPIT_INGEST_HOST`
- ☐ All affected projects' tests green
