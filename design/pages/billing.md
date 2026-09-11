# Billing — Owner/Admin web (US-104)

**Stories:** US-104  
**Rules:** 157–161 (A111–A115, E90–E93)  
**Chrome:** Owner/Admin shell ([_patterns.md](_patterns.md)); Global Header unchanged  
**Density:** Web compact  
**Surfaces:** Web management only (Company + Individual Owner/Admin). **Not** driver, **not** public marketing, **not** Expo this slice.

**Purpose:** In-product billing landing for signed-in management roles. Calm placeholder until PSP/entitlements ship. Replaces footer **Pricing** for signed-in OA.

## Out of scope

| Out | Why |
| --- | --- |
| Stripe / card forms / invoices | A114 |
| `/v1/billing` or plan entitlement API | A114 |
| Driver billing | A112 |
| Changing public `/pricing` catalog | ADR-021 unchanged for unsigned-in |
| Side nav Billing item this slice | Footer entry is enough; do not invent nav unless BA adds |

## Layout

| Region | Spec |
| --- | --- |
| Shell | `AppShell` title **Billing**. No page primary CTA this slice. |
| Body | One `panel` raised plane on canvas. |
| Title in panel | Optional section title “Plan & billing” (`text-section` / label strong). |
| Status | Body copy: billing management is **not available yet** / plans are software catalog only — no charge collected here. Use `body` + `text-text-secondary` for secondary line. |
| Empty-ish | Not a table empty state — single status panel always. |
| Error/loading | No network dependency; no skeleton required. If shell loading from auth, inherit AppShell. |

## A11y

- Page title **Billing** matches shell `pageTitle`.
- Status text is readable prose; no color-only meaning.
- No dead “Upgrade” primary that implies checkout.

## Tokens

Reuse `panel`, `pageTitle`, `body`, `caption`, `label`. No new hex.
