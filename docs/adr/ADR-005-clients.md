# ADR-005 — Clients (web and one mobile app)

**Status:** Accepted

## Decision

- **Web:** Next.js App Router. Owner/Admin **management** screens **and** driver **auth + minimal shell** (sign-in, forced password change, minimal driver home, E8 denied). Driver access tokens **may** be issued for `client=web`. If a driver session hits Owner/Admin routes, API returns **403**; UI shows denied in driver chrome (not blanket “no driver web”).
- **Mobile:** one Expo binary. After `GET /v1/me` (or login payload): `role=driver` → driver shell (password change or home). `owner` \| `admin` → Owner/Admin tabs. No second store listing.
- Tokens from Identity; no business writes from the Next.js server that bypass Fastify.

## Alternatives

1. Two Expo apps — rejected by product lock.
2. Separate driver-only web host — rejected; same Next.js app with role shells is enough for this slice.

## Consequences

Frontend Specialist implements both clients **after** Backend routes exist. Shared OpenAPI/types from Fastify schemas — Architect does not require a separate BFF.
