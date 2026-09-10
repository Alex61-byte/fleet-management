# Public pricing (web)

**Stories:** US-91, US-92  
**Catalog:** [docs/pricing-plans.md](../../docs/pricing-plans.md)  
**Surface:** Web compact only. **No** mobile marketing pricing.  
**Purpose:** Unsigned-in plan comparison. Not checkout. Not Owner/Admin home. No vehicle/driver records.  
**Chrome:** Same public landing chrome as [landing.md](landing.md) — `pagePublic` + `publicHeader` + `publicBody`. **Not** auth canvas, **not** authenticated shell.

## Purpose and density

| | |
| --- | --- |
| Density | Web compact. Header `h-app-bar`. Body `contentPadCompact`. |
| Personality | Ops console, not neon SaaS pricing theater. Raised **plan cards** on sunken canvas. One accent “popular” treatment max. |
| Identity | **Fleet** in header lockup. Page title **Pricing**. |
| Actions | Header: **Pricing** (current, plain text or muted) optional; **Sign in** secondary; **Create account** primary. Per card: one CTA → sign-up path. |

## Layout

```mermaid
flowchart TB
  header[publicHeader]
  body[publicBody]
  title[pageTitle Pricing]
  sub[pageSubtitle catalog note]
  tabs[kindToggle Individual | Company]
  grid[pricingGrid 2 cards]
  note[pricingFootnote no checkout]
  header --> body
  body --> title
  body --> sub
  body --> tabs
  body --> grid
  body --> note
```

| Region | Spec |
| --- | --- |
| Page | `pagePublic` min viewport. |
| Header | Same as landing: lockup → `/`; **Pricing** link current; Sign in; Create account. |
| Title | `pageTitle` **Pricing** + `pageSubtitle`: “Software plans. No hardware. Prices in USD; tax not included.” |
| Kind toggle | Two options: **Individual** / **Company**. Segmented control using `buttonSecondary` selected state or `badgeNeutral`+border — not underline-only. Default **Individual**. Shows **two** cards for the selected kind. |
| Grid | `pricingGrid`: 1 col narrow, 2 col `md+`. Gap `gap-3`. |
| Card | `pricingCard` = `panel` + flex column. Name, price, meter caption, feature list, CTA. |
| Popular | Plus and Fleet may use `pricingCardPopular` (`border-brand` 2px) + `badgeNeutral` or small caption “Popular”. Max one popular per kind view. |
| Features | `pricingFeatureList` body/label text; included = text-primary; excluded = text-secondary with em dash or “Not included”. |
| CTA | Individual → `/individual-sign-up` (Personal/Plus). Company → `/sign-up` (Team/Fleet). Label **Create account** or **Get started**. `buttonPrimary` on popular; `buttonSecondary` on entry. |
| Footnote | `caption`: “Checkout and plan limits are not billed in-product yet. Creating an account does not charge a card.” |
| States | Loading session: header skeletons like landing. Offline: `OfflineBanner`. Error: n/a (static). Empty: n/a. |
| a11y | One `h1` Pricing. Cards are sections with `h2` plan name. Toggle is `role="tablist"` or radiogroup. CTAs min-h-hit. Focus rings `buttonFocus` / `shadow-ring`. |

## Copy lock (from catalog)

| Plan | Price line | Meter |
| --- | --- | --- |
| Personal | $1.50 | per active vehicle / month |
| Personal Plus | $9 | per month (workspace; up to 10 vehicles) |
| Team | $5 | per active vehicle / month |
| Fleet | $8 | per active vehicle / month (min 5 billed) |

Custom expirations: Plus & Fleet only — 3/vehicle included; +$0.70/mo per extra row.

## Out of scope UI

Stripe, annual toggle (optional later), comparison mega-table, testimonials, mobile app pricing screen, authenticated billing portal.
