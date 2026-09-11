# ADR-025 — Web Terms and Conditions page + footer link

## Status

Accepted

## Context

US-105 / US-106 add a public **Terms and Conditions** page and a **Terms** footer link on all web footer variants. Prior A107 forbade invented legal pages; product now approves static Terms copy. Privacy is covered separately (US-107/108, ADR-026). No acceptance gate.

## Decision

- **FE-only** static route `apps/web/app/terms/page.tsx` under **public chrome** (same pattern as `/pricing` header/body/footer).
- **No** `/v1` contract changes; **no** backend; **no** legal CMS.
- **No** role gate and **no** forced redirect away from `/terms` for signed-in users (readable while signed in).
- `AppFooter` always includes **Terms** → `/terms` (public, auth, OA, driver). Session-aware Pricing/Billing rules unchanged (ADR-023/024).
- Copy is **product-owned static** draft meeting the required section set (A118); not lawyer-certified.

## Consequences

- Backend: **no-op**.
- Design: [design/pages/terms.md](../../design/pages/terms.md); footer pattern amended for Terms on all variants.
- Tests: footer asserts Terms link; terms page asserts public chrome + required headings.
