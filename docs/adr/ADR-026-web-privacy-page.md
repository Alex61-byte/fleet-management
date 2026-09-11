# ADR-026 — Web Privacy notice + footer link

## Status

Accepted

## Context

Fleet will operate globally. US-107 / US-108 add a public **Privacy** notice and footer link on all web footer variants. Complements Terms (ADR-025). Not a certified GDPR opinion letter or DSAR product.

## Decision

- **FE-only** static route `apps/web/app/privacy/page.tsx` under **public chrome** (same pattern as `/terms`).
- **No** `/v1` contract changes; **no** backend DSAR APIs; **no** legal CMS.
- **No** role gate; readable while signed in; **no** acceptance checkbox.
- `AppFooter` always includes **Privacy** → `/privacy` alongside **Terms**.
- Reuse existing `termsDocument*` theme tokens for visual consistency.
- Copy is **product-owned static** draft meeting the required section set (A124).

## Consequences

- Backend: **no-op**.
- Design: [design/pages/privacy.md](../../design/pages/privacy.md); footer pattern includes Privacy.
- Future counsel review can replace static copy without changing the route.
