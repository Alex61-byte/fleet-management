# Design — enterprise operations console (first slice)

BA sources: [docs/requirements.md](../docs/requirements.md), [docs/business-rules.md](../docs/business-rules.md), [docs/stories.md](../docs/stories.md). Architecture and HTTP contracts already exist under `docs/`. This pass is **visual only**.

**Out of visual scope:** dispatch boards, **ops tracking maps** (live GPS / slippy / vehicle pins), trip UI, SMS MFA, document upload, country-law catalog, search/filters not in BA, two app store listings, **account-kind conversion**, Individual drivers, CMS, billing, Individual driver-ops shell. **Exception — public landing only:** a **static** street-map **image** in the hero (US-24). Not a map product.

## 0. This pass — Custom expirations (US-86–US-90)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** add new hex or semantic color tokens.

| Problem | Spec now |
| --- | --- |
| Extra label + date rows on vehicle Details | [pages/vehicles.md](pages/vehicles.md) — section **Custom expirations** after built-in dates |
| Same A1 badges as insurance/inspection/road tax | Details **Must**; list chips **Should**; nav urgency **Should**; notifications **Could** |
| Cap 10 + unique label CI + confirm remove | Add `buttonSecondary` disabled at 10; rule 61 ConfirmDelete / Sheet; validation copy in page |
| Individual parity | Same Details section; still no Images/Handovers |
| Reusable row pattern | [_patterns.md](pages/_patterns.md) — Labeled date row + Sheet note |

**Classes / tokens:** layout aliases only (`vehicleCustomExpirations*`); reuse `label` `input*` `badgeWarning` `badgeExpired` `buttonSecondary` `buttonIcon` `buttonDanger` `caption` `errorText` `gap-2` form stack. **No** new color/spacing tokens.

**Next specialist: Senior Software Architect** — custom expiration resource shape (`id`, `label`, `expires_on`), embed vs sub-routes, uniqueness/cap errors, urgency/list derivation, a11y id contract; then BE → FE.

## 0-prior. Account kinds (US-77–US-85)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** add new hex or semantic color tokens.

| Problem | Spec now |
| --- | --- |
| Choose Company vs Individual before fields | [pages/account-kind.md](pages/account-kind.md) |
| Individual email+password only | [pages/individual-sign-up.md](pages/individual-sign-up.md) |
| Company path after kind choice | [pages/sign-up.md](pages/sign-up.md) |
| Landing dual create (Should) | [pages/landing.md](pages/landing.md) — header **Create account** → chooser |
| Individual shell without Drivers/Admins | [_patterns.md](pages/_patterns.md), [owner-home.md](pages/owner-home.md), [nav-icons.md](pages/nav-icons.md) |
| Deep-link deny | [pages/denied.md](pages/denied.md) E77 |
| Sign-in / reset / TOTP parity | [sign-in.md](pages/sign-in.md), [password-reset.md](pages/password-reset.md), [totp-settings.md](pages/totp-settings.md) |

**Classes / tokens:** reuse auth + shell only; optional FE alias `accountKindOption` from existing utilities — **no** new color/spacing tokens.

**Next specialist: Senior Software Architect** — `account_kind` on tenant, sign-up split contracts, authz for Individual subset, grandfather company; then BE → FE.

## 0-prior. Owner/Admin Global Header (US-68–US-76)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** add new hex or semantic color tokens.

| Problem | Spec now |
| --- | --- |
| Shared OA chrome identity + alerts | [pages/global-header.md](pages/global-header.md) — sticky header; bell; compliance menu |
| Dual lockup (sidebar + header) | **Single** lockup in Global Header; sidebar **role-only** ([_patterns.md](pages/_patterns.md), [mark.md](pages/mark.md)) |
| Menu platform | Web popover / mobile bottom sheet; empty/loading/error; count badge not color-only |
| Navigate | Item → `/vehicles/{id}` (existing OA vehicle edit/detail) |
| MVP sources | insurance / inspection / road tax ≤30d or past; **not** registration; cap 50 |
| Driver/public/auth | Unchanged — no OA notification chrome |

**Classes / tokens:** `spacing.notif-menu`, `notif-badge-min`; `themeClasses.globalHeader*`, `sidebarRole`, `notif*`.

**Next specialist: Senior Software Architect** — notification feed contract (or client derive), authz, ordering/cap; shell ownership; then BE → FE.

## 0-prior. Driver Daily usage (US-61–US-67)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** add new hex or semantic color tokens.

| Problem | Spec now |
| --- | --- |
| Hub entry (not auto-open) | [pages/driver-home.md](pages/driver-home.md) — third hub link **Daily usage**; IA routes web/mobile |
| Create + own list; next-travel gate | [pages/daily-usage.md](pages/daily-usage.md) — seven required fields; gated CTA; newest-first immutable list |
| Units / validation / offline | Miles/Kilometers from country (no picker); distance + time rules; `bannerWarning` + Submit disabled offline |
| Token drift | Reuse `panel` `banner*` `input*` `button*` `emptyState` `listRow`/`tableWrap` `skeleton` only |

**Classes / tokens:** none new — existing `themeClasses` only.

**Next specialist: Senior Software Architect** — Daily usage create/list-own contracts, authz, next-travel gate, no mileage write-through, no edit/delete; then BE → FE.

## 0-prior. Vehicle handovers (US-51–US-60)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** add new hex or semantic color tokens.

| Problem | Spec now |
| --- | --- |
| Driver Out / In on active next-travel | [pages/driver-home.md](pages/driver-home.md) — handover panel under next-travel; Out vs In + US-60 open-Out cue |
| Required fields + optional damages/images | [pages/handover.md](pages/handover.md) — mileage, next_service_days/distance; ≤10 images ≤5MB; units from country |
| Owner/Admin history | [pages/vehicles.md](pages/vehicles.md) — third tab **Handovers**; newest-first list + read-only detail; no edit/delete; drivers never see tab |
| Damage preview | Thumb grid + simplified reuse of `vehicleSideViewer*` (not side-slot manage) |
| Token drift | Reuse `panel` `vehicleFormTab*` `badgeNeutral`/`badgeOk` `banner*` `emptyState`; minimal `handoverDamage*` classes only |

**Classes / tokens:** `themeClasses.handoverDamageGrid`, `handoverDamageThumb`, `handoverDamageThumbFocus`, `handoverDamageThumbRemove`. No new spacing/color tokens (thumbs use spacing `6` = 48px).

**Next specialist: Senior Software Architect** — handover create/history/detail contracts, authz (driver write / Owner read), image refs, mileage write-through; then BE → FE.

## 0-prior. Vehicle side preview size + view-only viewer (US-41–US-44)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** invent contracts/ADRs. **Did not** change list Photos cue or clear-confirm copy.

| Problem | Spec now |
| --- | --- |
| Small 96px side frames hard to inspect | [pages/vehicles.md](pages/vehicles.md) — `vehicle-side-slot` **176px**; grid max token 400px; filled frame opens viewer |
| No inspect path without replace/clear | View-only modal (web) / full-screen (mobile); zoom +/− Must; pinch Should mobile; close unchanged data |
| Modal vs clear sheet confusion | Viewer ≠ clear confirm; mobile viewer is **full-screen**, not bottom sheet ([_patterns.md](pages/_patterns.md) Image viewer) |
| Token / hex drift | Spacing + motion zoom tokens; `themeClasses.vehicleSideFrameFilled` + `vehicleSideViewer*` — no raw hex |

**Classes / tokens:** `spacing.vehicle-side-slot` (176px), `vehicle-side-grid-max`, `vehicle-side-viewer-toolbar`; `motion.vehicle-side-zoom` (1–3, step 0.5); `themeClasses.vehicleSideFrameFilled`, `vehicleSideViewer*`.

**Next specialist: Senior Software Architect** — confirm API no-op for view/zoom (client-only); FE owns modal/sheet wiring; clear-confirm remains separate; then BE no-op → FE.

## 0-prior. Vehicle side appearance images (US-35–US-39)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** add compliance document upload. **Did not** invent contracts/ADRs.

| Problem | Spec now |
| --- | --- |
| Optional FRONT/LEFT/RIGHT/BACK photos on create/edit | [pages/vehicles.md](pages/vehicles.md) — Appearance section in the single form `panel`; 2×2 slots; empty / filled / replace / clear / uploading / per-side error |
| List four-up gallery risk | **Should** compact `vehicleSidePresence` chip (“Photos”) only when ≥1 side filled — not a gallery column |
| Token drift / hex | Spacing token `vehicle-side-slot` (now 176px per US-41); themeClasses for frames/actions/presence; reuse `buttonSecondary` `buttonGhost` `errorText` `skeleton` `caption` `sectionTitle` |
| Drivers | No side-image manage UI; denied paths unchanged |

**Classes / tokens:** `spacing.vehicle-side-slot`; `themeClasses.vehicleSideSection|Grid|Slot|Frame*|Preview|Actions|Presence*`.

**Next specialist: Senior Software Architect** — storage references, upload/replace/clear interaction contract, list `has_side_image` (or equivalent) for presence cue; then BE → FE.

## 0-prior. Company legal fields + driver invite (US-01/07/09/09a/10)

**Did not** implement `apps/web` or `apps/mobile`. **No** new color/spacing tokens. Address lookup is page-local on sign-up (existing field classes).

| Problem | Spec now |
| --- | --- |
| Sign-up email/password only | [pages/sign-up.md](pages/sign-up.md) — reg number, VAT, address + free OSM/Nominatim assist (E33/E34); no company display name |
| Temp-password driver create | [pages/drivers.md](pages/drivers.md) — email only; badge **Invite pending**; resend while pending (US-09a); empty copy without temp |
| Forced change after temp sign-in | **Retired** [pages/driver-password-change.md](pages/driver-password-change.md) → [pages/driver-invite-accept.md](pages/driver-invite-accept.md) auth canvas, token + email + set password |
| Sign-in temp path | [pages/sign-in.md](pages/sign-in.md) — pending cannot password-sign-in (E31); subsequent → minimal home |
| Patterns / denied / home | Driver shell points at invite accept; denied/home entry rules updated |

**Next specialist: Senior Software Architect** — contracts for company legal fields, invite token accept/resend, retire temp-password paths. Then BE → FE.

## 0-prior. US-31 / US-32 nav & tab icons (visual only)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** change routes, US-28 urgency rules, or Driver/public chrome.

| Problem | Spec now |
| --- | --- |
| Label-only Owner/Admin chrome | [pages/nav-icons.md](pages/nav-icons.md) — content-reflecting **outline** icons + visible labels on web sidebar (US-31) and mobile tabs (US-32) |
| Metaphor drift web vs mobile | Shared map: Home=house, Drivers=users, Vehicles=truck, Security=shield, Admins=user-cog, More=more-horizontal |
| Icon size / color ad hoc | Token `nav-icon` 20px; classes `navIcon` / `navIconGlyph`; stroke outline + **`currentColor`** / tab tint with nav-fg, selected, urgency-fg |
| A11y | Icons decorative (`aria-hidden`); names stay on labels + existing Vehicles urgency phrases |
| Library | Prefer **six custom SVGs** (BrandMark pattern); lucide pair only if needed; no font-icon packs |

**Classes / tokens:** `spacing.nav-icon`, `themeClasses.navIcon`, `navIconGlyph`. Chrome notes in [pages/\_patterns.md](pages/\_patterns.md).

**Next specialist: Senior Software Architect** — presentation-only; shared icon module vs per-app; optional `react-native-svg` pin; BE **no-op**. Then Frontend.

## 0-prior. Vehicles edit prepopulate + US-28 nav urgency (visual only)

**Did not** implement `apps/web` or `apps/mobile`. **Did not** change list/detail 30-day badges (A1).

| Problem | Spec now |
| --- | --- |
| Create vs edit form unclear | [pages/vehicles.md](pages/vehicles.md) — same field inventory; **create blank**, **edit prepopulated** from stored vehicle; titles Add vs Edit vehicle |
| US-28 Vehicles nav urgency | [pages/\_patterns.md](pages/\_patterns.md) — web sidebar + mobile Owner/Admin **Vehicles** tab only; red `daysUntil < 7`, orange `= 7`, worst-wins; selected+urgency stacking |
| Pastel badges on navy rail | New solid tokens `nav-urgency-critical` / `nav-urgency-soon` / `nav-urgency-fg` (+ hover). **Not** `danger-subtle` / `warning-subtle` on sidebar |
| Color-only risk | Accessible names: “Vehicles, critical expiry within 7 days” / “Vehicles, expiry in 7 days”; selected keeps semibold + inverse edge |

**Classes:** `navItemUrgencyCritical|Soon` (+ Hover, Selected), `tabItem` / `tabItemSelected` / `tabItemUrgency*`. Theme bridge + CSS vars updated.

**Next specialist (that pass):** Senior Software Architect — contracts/data for fleet worst `daysUntil` on chrome (if not already), then BE/FE.

## 0a. Prior pass — public landing hero + description (visual only)

Follow-up after public landing chrome (US-17–22). **Did not** restyle `apps/web` or `apps/mobile`. **Did not** add a marketing campaign.

| Problem | Spec now |
| --- | --- |
| Identity-only body | [pages/landing.md](pages/landing.md) — sticky header **unchanged**. Body is **hero + one description** (US-23–25). Identity **Fleet** / **Fleet operations** **moved into** the hero (no duplicate identity block). Header CTAs stay header-only. |
| User asked for a map | Hero contains a **static open-map image** (US-24). Not live GPS, not interactive, not company pins. Image fail → rest of page remains (E18). No records fallback (US-26). |
| Description copy | One `panel` titled **What Fleet is for**. First-slice facts only (company, Owner/Admin, drivers, vehicles, compliance dates). No dispatch / tracking / geofence claims. Not on auth. Signed-in still US-22. |

**Next specialist (that pass):** Senior Software Architect — static asset hosting (client file, **no API**, no GPS). Then Frontend.

## 0b. Prior pass — public landing chrome (visual only)

Follow-up after identity. **Did not** restyle `apps/web` or `apps/mobile`. **Did not** add a marketing site.

| Problem | Spec now |
| --- | --- |
| No unsigned-in web entry except auth cards | [pages/landing.md](pages/landing.md) — identity + entry (US-17). Web compact. Header actions: Sign in (secondary) then Create company (primary). **Superseded body:** this pass replaces identity-only with hero + description. Header chrome from this pass is unchanged. |
| Header vs auth mixed | Public header is **landing only**. Auth canvas unchanged — no global header on sign-in / sign-up / password (user lock). Patterns split the two chromes. |
| Shielded navy mark on a light header | US-19 public variant: plate **without** navy shield. Dedicated 40×20 viewBox (`brandMarkPublic`). Contrast: `mark-plate-face` enamel + `mark-fill` edge/ink. Auth + sidebar keep shielded 24/32 SVG. |

## 0c. Prior pass — links + identity (visual only)

Follow-up after the enterprise-console kit. **Did not** restyle `apps/web` or `apps/mobile`.

| Problem | Spec now |
| --- | --- |
| Links looked like body text (`themeClasses.link` = brand + label, no underline/hover/focus) | Full link system: `link` underline at rest, `linkHover`, `linkFocus` (ring **and** underline), `linkPressed`, `linkMuted`, `linkDisabled`. Visited omitted (AA). Auth secondaries use this, stacked, `min-h-hit`. |
| Identity was shouting `FLEET` overline + unlabeled 24px navy square | Product **Fleet** (sentence case). **Fleet registration plate** mark (24/32 SVG: keyline + shield + plate + country band + 3 character blocks). Lockup: mark + “Fleet”; auth caption “Fleet operations”. Sidebar meta = role. 2px `brand-accent` bar on auth card / sidebar top only. |
| Nav vs link mixed | Sidebar stays `navItem` (fill + border-l-2 + semibold). Tables: row hover + `tableCellLink` on identity cell only. |

**This identity pass:** the prior “shield + solid plate + 2px accent on the plate top” collapsed to a minus at 24/32. Spec is now the **Fleet registration plate** ([pages/mark.md](pages/mark.md)) — SVG only; 1px `mark-glyph` keyline on navy sidebar.

**Next specialist: Senior Frontend Specialist** — replace `BrandMark` with the registration-plate SVG on web + mobile. Do not invent a product name. Do not implement in this Design pass.

## 1. Audit — what was wrong (prior console pass)

The first-slice kit read as a generic CRUD demo, not an enterprise fleet console.

| Area | Problem |
| --- | --- |
| Color | Flat navy/gray, few steps. No canvas, sidebar, sunken, hover, selected, ring, brand-subtle, divider, table, or nav roles. |
| Dark | Pale brand on dark; inverted danger/warning (pastel fg on dark red/amber bg). Unpolished; not ops-console. |
| Type | Five sizes 12–28. No overline, page vs section title, tabular nums, table header. |
| Spacing | 8px-only too coarse for compact tables/toolbars. Content max 960px + `p-3` felt like a tutorial. |
| Elevation | Two weak shadows → card-on-card gray soup. No canvas vs raised vs overlay vs hairline. |
| Components | No hover, focus-visible ring, selected nav, table row hover/selected, input hover, icon button, toolbar, KPI, auth card. |
| Chrome | 48px bar, 240px unlabeled “Fleet”, naked auth title+form. |
| Lists | Stacked raised cards on web instead of sticky-header tables. |

Existing page **inventory** and BA copy/behavior are preserved (expiry on list+detail, TOTP Off until Confirm, generic reset message, driver home minimal).

## 2. Token changes

Hex only in token JSON (and CSS variable comments in the theme bridge). Page class lists use semantic names.

| File | Additions |
| --- | --- |
| [tokens/color.json](tokens/color.json) | Fuller gray / navy / status ramps (50–900) for canvas, sidebar, hover, selected, dark AA foregrounds |
| [tokens/spacing.json](tokens/spacing.json) | 4px usable steps (`px`, `0-5`, `1-5`, `2-5`); `sidebar` 256 / `sidebar-collapsed` 64; `page-header` / `app-bar` 56; `table-row` 44; `list-row` 56; `auth-card` 420; compact vs comfortable gutters |
| [tokens/typography.json](tokens/typography.json) | `overline`, `table`, `section`, `page`; `display` 32 KPI; `fontFamily.tabular`; `letterSpacing`; weight `bold` |
| [tokens/radius.json](tokens/radius.json) | Tighter enterprise radii (`md` 6, `lg` 8); `xl` 12 |
| [tokens/elevation.json](tokens/elevation.json) | `none` (hairline), `raised` (panel/KPI/auth), `overlay` (sheet), `focus-ring` |
| [tokens/motion.json](tokens/motion.json) | `instant`; reduce-motion still required |
| [tokens/semantic.json](tokens/semantic.json) | Same names in light and dark: canvas, surface-sunken, sidebar*, nav-fg*, divider, table*, brand-hover/subtle, danger-hover, ring, hover/pressed/selected. **Identity pass:** `brand-accent` (chrome bar + mark country band), `mark-fill` (shield + character blocks), `mark-glyph` (keyline + plate face), `link` / `link-hover` / `link-pressed`. **Landing pass:** `mark-plate-face` (unshielded public enamel). Dark: brighter status **foreground** on dark `*-subtle` (not inverted chips). Component aliases: button hover, ghost, icon, input hover, badge success/neutral, nav, table, toolbar, **link, mark, lockup** |
| [tokens/color.json](tokens/color.json) | **This pass:** `steel.300` / `steel.500` — accent only |
| [tokens/spacing.json](tokens/spacing.json) | **Identity pass:** `mark` 24, `mark-auth` 32, `brand-bar` 2, `link-underline-offset` 2. **Landing chrome pass:** `mark-public` 20, `mark-public-width` 40. **This pass:** `hero-map` 320 — public landing static map image max height |
| [tailwind.theme.ts](tailwind.theme.ts) | Theme keys + `themeClasses` for page/shell/sidebar/nav/table/kpi/auth-card/toolbar/page-header/button/input/badge. **Identity pass:** `link*` states, `brandMark` / `brandMarkAuth`, `brandMarkFill` / `brandMarkGlyph` / `brandMarkAccent`, `authLockup`, `tableCellLink`, `appBarProduct`. **Landing chrome pass:** `pagePublic`, `publicHeader`, `publicLockup`, `publicWordmark`, `publicHeaderActions`, `publicBody`, `publicIdentity*` (retired), `brandMarkPublic`, `brandMarkPlateFace`, `brandMarkPlateEdge`. **This pass:** `publicHero*`, `publicHeroMap*`, `publicDescription*` |

Light and dark use the **same semantic names**. `semantic.component.*` documents structure; runtime paints from `semantic.color.light` \| `dark`.

## 3. Chrome (patterns)

See [pages/_patterns.md](pages/_patterns.md).

| Region | Now |
| --- | --- |
| Web sidebar | 256px `bg-sidebar` + 2px top `brand-accent` bar; lockup **registration-plate** mark 24 (white `mark-glyph` keyline on navy) + wordmark “Fleet”; meta = **role**; nav hover/selected/focus (not `link`); optional 64px collapsed |
| Web content | Full remaining width on `bg-canvas` (not max 960). Gutter 24px compact |
| Page header | 56px: title + subtitle + primary/secondary actions |
| Toolbar | 44px on lists; count only — **no search** |
| Mobile Owner | 56px app bar (mark 24 + “Fleet”); 44pt tabs; comfortable 16px gutter |
| Auth | Centered `authCanvas` + `authCard` 420px + 2px accent bar; lockup **shielded** registration-plate mark 32 + “Fleet” + “Fleet operations”; **no public header**; secondary actions are underlined `link`s |
| Public landing | Sticky `publicHeader` 56px (`surface-raised` + divider + 2px `brand-accent` top bar); unshielded plate 40×20 + “Fleet”; Sign in / Create company. Body: **hero** (Fleet / Fleet operations + static map image on one raised plane) + **one** description panel. Auth does not inherit hero. |

**Table vs card**

- **Web lists** (Drivers, Vehicles, Admins, home due-soon): sticky-header **table**.
- **Web KPIs**: caption + tabular count tiles on canvas — not gray card stacks.
- **Web forms**: **one** raised `panel`.
- **Mobile lists**: 56px hairline **rows**, not a card per row.
- **Empty**: title + one sentence + one CTA; no illustration.
- **Skeletons** match final layout.

## 4. Page specs · Product mark: [pages/mark.md](pages/mark.md)

Shared: [pages/_patterns.md](pages/_patterns.md)

| Page | File | Stories |
| --- | --- | --- |
| Public landing | [pages/landing.md](pages/landing.md) | US-17–26 |
| Sign-up | [pages/sign-up.md](pages/sign-up.md) | US-01 — reg, VAT, address + lookup assist |
| Sign-in | [pages/sign-in.md](pages/sign-in.md) | US-02, US-09, US-10, US-29, US-30 — no temp path; pending E31 |
| Password reset | [pages/password-reset.md](pages/password-reset.md) | US-03 |
| TOTP challenge | [pages/totp-challenge.md](pages/totp-challenge.md) | US-04 |
| TOTP settings | [pages/totp-settings.md](pages/totp-settings.md) | US-04, US-05 |
| Owner/Admin home | [pages/owner-home.md](pages/owner-home.md) | US-02, US-13 |
| Admins | [pages/admins.md](pages/admins.md) | US-06 |
| Drivers | [pages/drivers.md](pages/drivers.md) | US-07, US-08, US-09a, US-16, US-27 — email invite; **Invite pending** |
| Vehicles | [pages/vehicles.md](pages/vehicles.md) | US-11–13, US-15 |
| Driver invite accept | [pages/driver-invite-accept.md](pages/driver-invite-accept.md) | US-09 — web + mobile set password |
| Driver password change | [pages/driver-password-change.md](pages/driver-password-change.md) | **Retired** stub → invite accept |
| Driver home | [pages/driver-home.md](pages/driver-home.md) | US-10, US-14 — **web + mobile** minimal shell |
| Denied | [pages/denied.md](pages/denied.md) | US-14 / E8, US-15 — **no** E7 driver-web blanket |

Each spec: purpose, density, regions, `themeClasses` names, heights, states (default/loading/empty/error/offline/denied), a11y **Name**.

## 5. Visual decisions (not BA)

- Expiry warnings on **list and detail**.
- One date field per insurance / inspection / road tax / registration.
- TOTP stays **Off** until Confirm.
- Reset request uses a **generic** message (no email enumeration).
- Driver home is intentionally **minimal** (no fleet) on **web and mobile**.
- Web = compact enterprise; mobile = comfortable; drivers use a **minimal shell** on both (no Owner chrome). **E7 retired.**
- Status = badge **+ text** (never color-only).
- Dark mode keeps AA with bright status fg on dark subtle surfaces (not pastel-on-pastel).

## 6. Unresolved (do not invent hex or fields)

- Company **name** on sign-up (BA Q10) — email/password only.
- Required vs optional vehicle fields (BA Q6) — all shown; empty date = no badge.
- Extra driver fields (name, phone) — email + password only until BA.

## 7. Do not implement (this stage)

Do **not** restyle `apps/web` or `apps/mobile` in the Design Specialist pass.

**Next specialist: Senior Software Architect** — static map **asset** vs any API (**should be no API**, client static file). No GPS. No Mapbox/Google/Leaflet as the hero. Signed-in `/` still US-22. Do not invent contracts here.

Then **Senior Frontend Specialist** — replace identity-only body with `publicHero` + `publicDescription`; keep `publicHeader` unchanged; do not put hero on auth; do not flash records.

Not Backend. Not a new BA pass unless scope changes.
