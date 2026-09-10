# ADR-021 — Public pricing page (static catalog)

**Status:** Accepted  
**Slice:** US-91, US-92

## Decision

- **`/pricing`** is a **public web** route using the same chrome and session redirects as `/` ([ADR-007](ADR-007-web-public-entry.md)): unsigned-in sees catalog; Owner/Admin → `/home`; driver → `/driver`.
- Plan content is **static client data** aligned to [pricing-plans.md](../pricing-plans.md). **No** `GET /v1/plans`, **no** Stripe, **no** entitlement enforcement this slice.
- CTAs: Individual plans → `/individual-sign-up`; Company plans → `/sign-up`. Header **Create account** remains `/account-kind`.
- Landing (`/`) **Should** link to `/pricing` (US-92). Header lockup on pricing may link to `/`.
- **HTTP `/v1`:** no-op. Mobile: no marketing pricing screen.

## Alternatives

1. **CMS / `/v1/plans`** — rejected until billing BA; catalog is git-versioned markdown + FE constant.
2. **Pricing only on landing** — rejected: landing stays ops-entry density; full matrix needs its own page.
3. **Checkout on CTA** — out of scope (A101).

## Consequences

- Frontend owns copy parity with pricing-plans.md; tests lock prices and routes.
- Future billing slice adds provider + entitlements without changing the public URL if possible.
