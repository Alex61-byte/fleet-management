# ADR-024 — Web Billing page (placeholder) + signed-in footer

## Status

Accepted

## Context

Signed-in users should not be pushed to public `/pricing` from product chrome. US-104 adds `/billing` for Owner/Admin and swaps the footer link. Checkout remains out of scope (A101/A114).

## Decision

- **FE-only** `apps/web/app/billing/page.tsx` under `AppShell`.
- No `/v1/billing`, no Stripe, no entitlement enforcement.
- `AppFooter` is auth-aware: OA → Billing; unsigned → Pricing; driver → neither.
- Public `/pricing` and ADR-021 redirects for direct visits remain (OA on `/pricing` still → `/home`).

## Consequences

- Backend: **no-op**.
- Future billing slice can deepen `/billing` without changing the path.
