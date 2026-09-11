# ADR-023 — Web application footer (chrome only)

## Status

Accepted

## Context

US-100–US-103 add a calm product footer on web public, auth, Owner/Admin, and driver shells. No backend behavior, legal CMS, or mobile chrome.

## Decision

- **FE-only** shared `AppFooter` component; no `/v1` contract changes.
- Mount in: public landing/pricing, `AuthShell`, `AppShell` main column, `DriverShell`.
- Content: `© {year} Fleet` + optional links to existing `/` and `/pricing` only.
- Sticky-footer via parent `min-h-screen flex flex-col` + `mt-auto` on footer.

## Consequences

- Backend: **no-op**.
- Design tokens: `appFooter*` in `design/tailwind.theme.ts`.
- Expo mobile unchanged.

## Amendment (US-104)

Signed-in Owner/Admin footer links **Billing** (`/billing`) instead of **Pricing**. Drivers omit both. See [ADR-024](ADR-024-web-billing-page.md).

## Amendment (US-106)

All web footer variants include **Terms** → `/terms`. See [ADR-025](ADR-025-web-terms-page.md).

## Amendment (US-108)

All web footer variants include **Privacy** → `/privacy`. See [ADR-026](ADR-026-web-privacy-page.md).
