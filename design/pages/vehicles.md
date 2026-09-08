# Vehicles (list, create, edit)

**Stories:** US-11, US-12, US-13, US-15, **US-28** (nav/tab urgency — chrome only; see [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking)), **US-35–US-39** (optional side appearance images), **US-41–US-44** (larger side previews + view-only zoom viewer), **US-45–US-49** (optional vehicle mileage / kilometres), **US-55–US-57** (Owner/Admin **Handovers** tab — history + detail, read-only), **US-86–US-90** (custom expiration definitions on Details)  
**Density:** Web compact **table**; mobile comfortable **rows**. **Company** Owner/Admin **and** **Individual** Owner (own tenant only — US-81).  
**Purpose:** Fleet records: **Make** + **Model** (two free-text fields), plate, optional **current mileage** (odometer reading; unit Miles/Kilometers from country), insurance, inspection, country of registration, road tax **dates**, optional **custom expiration** rows (label + date; max 10), plus optional **appearance photos** from four sides (**FRONT**, **LEFT**, **RIGHT**, **BACK**), plus **handover history** (Out/In) on a third tab. Warn on list **and** detail (BA Q8 — design: **both**). Country is a text field, not a catalog. Make/Model are free text — **no** make/model catalog dropdowns. Compliance stays **dates only** — **no** insurance/inspection/tax/registration/custom **document** upload (A2). Side images are **not** compliance documents (A35–A40). Handover damage photos are **not** side-appearance slots (A50, A56). **US-41–US-44:** larger Images-tab frames; filled sides open a **view-only** zoom viewer; dismiss leaves data unchanged. **US-45–US-49:** optional mileage on Details tab + list when present (rules 64–71). **US-55–US-56:** Handovers tab list + detail; **no** edit/delete (E57). **US-86–US-90:** custom expirations CRUD on **Details** only — same A1 badges as insurance/inspection/road tax; no separate pages; built-in four dates unchanged. Shared handover patterns: [handover.md](handover.md).  
**Chrome:** Authenticated **management** shell. Sidebar / tab **Vehicles** selected when on this area. No search. **US-28:** Vehicles nav/tab may show red/orange urgency fill from **tenant**-wide worst section dates — pattern chrome, not list badges. **Should (US-89):** worst-wins urgency may include custom expiration dates with the same 7-day bands. **Individual:** same Vehicles area; no Drivers/Admins chrome beside it.  
**Parity (A16):** Company Owner/Admin: list / create / edit / side-image manage **and** side-image viewer **and** Handovers history on web + management mobile. **Individual Owner:** same list / create / edit **Details** (identity, built-in dates, **custom expirations**, mileage) only — **omit Images and Handovers tabs** (A86, E80). Drivers have **no** side-image manage or viewer UI (A40, E38), **no** custom-expiration manage UI, and **no** Handovers history tab (E55). Management roles **do not** create handovers here (driver-only create — E54).

## List — web

```
pageHeader
  pageTitle Vehicles
  pageSubtitle Insurance, inspection, road tax, registration, and other dates
  pageHeaderActions buttonPrimary Add vehicle
toolbar
  caption font-tabular “{n} vehicles”
tableWrap sticky header
  Vehicle | Plate | Mileage | Country | Insurance | Inspection | Road tax | Registration
```

| Column | Class | Content |
| --- | --- | --- |
| Vehicle | `tableCellLink` | Primary identity: **`{Make} {Model}`** (single space between make and model). No underline at rest; hover `tableCellLinkHover`. Plate stays `tableCellMuted` (not underlined). Empty make or model: still join with one space; trim ends (e.g. make-only shows make). **Should (US-39):** when the vehicle has **≥1** side image, show a compact **presence cue** immediately after the identity string in the same cell (not a new column). |
| Plate | `tableCellMuted` | License plate — secondary |
| Mileage | `tableCellNum` / `caption` | **US-49:** when `mileage` is set, show `{n}` + unit short (`km` / `mi`) or full label; `font-tabular`. When null/unknown: **em dash** or empty cell — **no** fabricated `0`. Unit from `mileage_unit` / country (not editable on list). |
| Country | `tableCellMuted` | Free text |
| Date columns | `tableCellNum` | Tabular date; if due/expired, `badgeWarning` / `badgeExpired` **and** the date. Built-in Insurance / Inspection / Road tax only in these columns (Registration never badges). |

Row hover `tableRowHover`; tap → edit. Do **not** use a card per vehicle on web. Do **not** split Make/Model into two list columns. Do **not** put four side thumbnails on the list (not a gallery). Do **not** add a fifth fixed column per custom label (variable count).

### List custom expiration badges (US-89 Should)

| Surface | Placement | Treatment |
| --- | --- | --- |
| Web table | Same row, **after** built-in date cells or trailing wrap in the last visible date-ish area — prefer wrap under the identity/plate cluster if columns stay fixed | For each custom item in A1 window: `badgeWarning` / `badgeExpired` **plus** truncated **label** (not color-only). Cap visible chips sensibly (e.g. first few + `caption` “+{n} more”); full set on Details. |
| Mobile row | Badge wrap with built-in date badges | Same chips: badge + custom **label** text; wrap; hairline row unchanged |
| None due/expired | — | **No** extra chips |
| Loading list | Skeleton rows | Do **not** flash custom chips until row data known |

- Same A1 window as insurance/inspection/road tax (30-day Due soon / past Expired).
- Label is the badge companion text (like section name on built-ins).
- Does **not** replace built-in columns or invent a multi-column custom matrix on the list.

### List presence cue (US-39 Should)

Compact “has photos” signal only — **not** four previews, **not** which sides are filled, **not** a lightbox.

| Surface | Placement | Treatment |
| --- | --- | --- |
| Web table | Same **Vehicle** cell, after `{Make} {Model}`, `gap-1` | `vehicleSidePresence`: optional decorative glyph `vehicleSidePresenceIcon` (`navIcon` size, `currentColor`, `aria-hidden`) + text **Photos** (text preferred). Same visual language as `badgeNeutral` (sunken chip, caption). |
| Mobile row | Under plate `caption` line, or trailing end of primary row if space | Same `vehicleSidePresence` chip; wrap with compliance badges; hairline row unchanged |
| No images | — | **No** cue, no empty chip, no “0 photos” |
| Loading list | Skeleton rows | Do **not** flash presence cue until row data known |

- Cue is **boolean** (any side filled). Do not invent per-side dots on the list.
- Not color-only: chip has text (or accessible name when icon-only).
- Does **not** replace or restyle A1 date badges or US-28 nav urgency.
- Tap still opens **edit** (whole row); cue is not a separate control.

## List — mobile

`appBarMobile` “Vehicles” + Add. `listRow`: primary identity **`{Make} {Model}`** as `label`, plate as `caption` (muted secondary). **US-49:** when mileage present, second `caption` line or same caption trail: `Mileage {n} {km|mi}` / unit label — omit line when null. Badges wrap (`badgeWarning` / `badgeExpired` with date name **or custom label**). **Should:** `vehicleSidePresence` when any side image exists. **Should (US-89):** custom expiration chips in the same wrap. Hairline divider, not raised cards.

## Empty / loading

| State | UI |
| --- | --- |
| Empty | `emptyState` title “No vehicles yet.” sentence “Add a vehicle to track compliance dates.” CTA “Add vehicle” |
| Loading | Header + toolbar; skeleton rows matching table/list |
| Error / offline | `bannerDanger` / `bannerWarning` |
| Unauthenticated | No records → [denied.md](denied.md) |

## Create / edit form

Push page (or same route with mode). **One** `panel` with **three tabs** (not a single long scroll of fields + photos + history):

| Tab | Contents | Save vehicle |
| --- | --- | --- |
| **Details** (default) | Identity + built-in compliance dates + **Custom expirations** — `vehicleFormDetails` max ~400px | Visible |
| **Images** | Side appearance only — same four-side grid (US-35–US-39) | Visible (**Company** only; **omit** for Individual — E80) |
| **Handovers** (third) | Read-only Out/In **history** + drill-in **detail** (US-55–US-56) | **Hidden** on this tab — history is not vehicle field save; **omit** tab for Individual (E80) |

Tab chrome: `vehicleFormTabList` + `vehicleFormTab` / `vehicleFormTabSelected` (selected = bottom `border-brand` + semibold; not color-only). Panels: `vehicleFormTabPanel`. **Save vehicle** stays **below the tab strip** on **Details** and **Images** so field save is not buried under photos. On **Handovers**, omit Save (read-only). Same Details/Images field inventory for create and edit — **not** two visual systems. **Handovers** tab: **Owner/Admin only**; omit for drivers (E55). On **create** (no persisted vehicle yet), **omit or disable** Handovers — prefer **omit** until the vehicle exists; optional `caption` only if tab kept disabled: “Save the vehicle to view handovers.” **Web (desktop) Must;** mobile **Should** use the same three tabs (comfortable density) rather than stacking Appearance/history under dates.

**Cross-link:** list columns, empty/loading, detail chrome, damage thumbs → [handover.md](handover.md). Driver Out/In forms live on [driver-home.md](driver-home.md), not this page.

### Create vs edit (prepopulate)

| Mode | Entry | Page title | Fields | Primary |
| --- | --- | --- | --- | --- |
| **Create** | Header “Add vehicle” / empty CTA | “Add vehicle” | **Blank** — empty text inputs; mileage empty; date controls empty / unset (no placeholder fake dates); **custom expirations empty** (calm empty caption; no starter row); **all four side slots empty** | `buttonPrimary` “Save vehicle” |
| **Edit** | List row tap / identity link | “Edit vehicle” (subtitle optional: plate or `{Make} {Model}` once known) | **Prepopulated** from stored vehicle: make, model, plate, country, mileage (empty if null), each built-in section date, **custom expiration rows** (`id`, `label`, `expires_on`), **and** side images (filled preview or empty slot per side) as returned by API (US-39, US-46, rule 59, US-87) | Same `buttonPrimary` “Save vehicle” |

- Edit must show stored values on first paint after load (no flash of empty then fill if avoidable; loading uses form skeleton in the same `panel`, including custom-expiration row skeletons and four side-slot skeletons).
- Create must **not** inherit the last-edited vehicle, its images, or its custom rows.
- Under each **warnable** date on **both** modes: if the current field value warrants it, badge + `caption` (“Insurance · Expired” / “Inspection · Due soon” / “{custom label} · Due soon”) — same A1 rules as list. Empty date → no badge. **Registration** never badges.
- No separate “detail read-only” screen in this slice: row opens **edit** with prepopulated fields (Details/Images). **Handovers** is the read-only history surface for custody records only.
- Denied paths (driver create, other-company edit, driver Handovers history) → [denied.md](denied.md); form not shown with foreign data; **no** image manage controls for drivers (E38); **no** custom-expiration manage for drivers; **no** Handovers tab for drivers (E55).

| Field | Type | Copy |
| --- | --- | --- |
| Make | Select (+ text if Other) | “Make” — options from static client catalog (`@fleet/sdk`); last option **Other** shows free-text Make |
| Model | Select (+ text if Other) | “Model” — options filtered by selected make; disabled until make chosen; **Other** shows free-text Model |
| License plate | Text | “License plate” |
| Country of registration | Text | “Country of registration” — free text, not a law catalog |
| Mileage (current) | Number / decimal text | **US-45–US-47:** one control. **Label** = unit from country: **“Miles”** or **“Kilometers”** (same strings as driver odometer). **Hint/caption** may repeat unit. Optional; empty = unknown. No separate unit picker. Place **after country**, **before** insurance date. |
| Insurance date | Date | “Insurance” |
| Inspection date | Date | “Inspection” — Admin-entered; not computed from country |
| Road tax date | Date | “Road tax” |
| Registration date | Date | “Registration” — optional stored date; **no** expiry badge or nav urgency |
| Custom expirations | Repeatable rows | **Details** only — see **Custom expirations (US-86–US-90)**. After registration; before Save on Details. |
| Side appearance | Four slots | **Images** tab only — see **Side appearance images** |

**Make and Model** are two separate controls, stacked with the same form `gap-2` as other fields (Make above Model). Do not combine into one “Car” field. Catalog is **client-only** (no server enum). Changing make clears model selection. Existing stored values outside the list open as **Other** + free text so edit never loses data.

### Mileage control (US-45–US-49)

| | |
| --- | --- |
| Placement | **Details** tab only; after country; before first date |
| Label | Dynamic from country (client may mirror A34 / `mileage_unit`): **Miles** or **Kilometers** — field name *is* the unit (not a separate “Mileage” label) |
| Input | Single text/number; numeric keyboard on mobile; allow one decimal |
| Empty | Valid; means unknown/null — do not coerce to `0` on save |
| Validation | Inline `errorText` or form `bannerDanger`: required only if product shows parse fail — “Enter a non-negative number with at most one decimal” (E42) |
| Country change | Unit label updates immediately from country field; **no** conversion of typed/stored number (E43); optional calm `caption` only if needed — prefer silent label swap |
| Edit load | Prepopulate stored number as plain decimal string; empty if null |
| A11y | Accessible name is the unit label (e.g. “Kilometers” or “Miles”); not color-only |

One date each for built-ins (BA Q7 — **single date per item**). Custom rows also carry **one** `expires_on` each (US-86).

Primary `buttonPrimary` “Save vehicle” on **Details** / **Images** only. Saving with expired/soon dates **allowed**; badges show immediately on insurance/inspection/road tax **and** custom rows (A11 / US-89). Saving **without any side images** is allowed (US-35, rule 57). Saving **without custom expirations** is allowed (empty section). Side images are **optional** and independent of date validity. Custom rows validate on save (and inline where noted). **Handovers** tab never offers Save, edit, or delete of custody rows (E57).

## Custom expirations (US-86–US-90)

**In scope:** Company **Owner/Admin** and **Individual Owner** on **create + edit** **Details** tab (web + management mobile). Items: `{ id, label, expires_on }` — label **1–80** after trim, **unique per vehicle** (case-insensitive), **max 10** rows. Same **A1** 30-day badges as insurance / inspection / road tax. **Must** on Details; list badges **Should**; nav urgency **Should**; notification menu inclusion **Could** (no separate notification redesign this pass).

**Out of scope:** Separate custom-expiration pages or tabs; changing built-in four date fields; document upload; driver manage UI; more than 10 rows; catalog of preset labels.

### Placement (Details only)

Inside `vehicleFormDetails` / `vehicleFormTabPanel`, **after** the four built-in dates (Insurance → Inspection → Road tax → Registration), **before** primary **Save vehicle**. Still **one** raised `panel` — no second card. **Individual** keeps this section (still **no** Images / Handovers).

```
… Registration date …
── vehicleCustomExpirations (gap-2) ──
  sectionTitle Custom expirations
  [empty caption | list of rows]
  buttonSecondary Add expiration   ← disabled at 10
buttonPrimary Save vehicle
```

| Region | Class / token | Notes |
| --- | --- | --- |
| Section | `vehicleCustomExpirations` | `flex flex-col gap-2`; optional top hairline `border-t border-divider` + `pt-2` if needed to separate from Registration — prefer calm stack without extra chrome |
| Heading | `sectionTitle` | **Custom expirations** (alt OK: **Other expirations** — pick one product-wide; default **Custom expirations**) |
| Empty | `caption` | **No custom expirations yet.** — calm; **not** full-page `emptyState`; **no** primary CTA (Add is the secondary control) |
| List | `vehicleCustomExpirationList` | Stack of rows; `gap-2` |
| Row | `vehicleCustomExpirationRow` | See anatomy; reusable **labeled date row** pattern in [_patterns.md](_patterns.md#labeled-date-row-custom-expiration) |
| Add | `buttonSecondary` | **Add expiration**; `buttonDisabled` at cap 10 |
| Cap hint | `caption` | When count = 10: **Maximum of 10 custom expirations.** under Add (or replacing helper). When count &lt; 10, optional calm `caption` “Up to 10.” is unnecessary — prefer silence until cap |

### Row anatomy (US-86 add / US-87 edit)

Match built-in date **field language**: visible `label`, `input`, optional badge/`caption` under the date, inline `errorText`. Prefer **stacked** label field then date field (same as Insurance block) for a11y and mobile Dynamic Type. **Compact pair** (label | date on one row) is allowed on **wide web only** if both controls keep visible labels and ≥44pt hits — mobile **Must** stack.

```
vehicleCustomExpirationRow
  [header row: optional overline “Expiration {n}” + buttonIcon Remove]
  label “Label” → input (text)
  errorText? (label)
  label “Expires on” → input (date)
  badgeWarning | badgeExpired ? + caption “{Label} · Due soon” | “{Label} · Expired”
  errorText? (date)
```

| Element | Class | Spec |
| --- | --- | --- |
| Row wrapper | `vehicleCustomExpirationRow` | `flex flex-col gap-2`; full width of `vehicleFormDetails`; not a nested raised card |
| Label field | `label` + `input` | Visible **Label**; placeholder optional muted e.g. “e.g. Fire extinguisher” — never as the only name |
| Date field | `label` + `input` | Visible **Expires on** (or **Expiration date**); same date control as Insurance |
| Badge under date | `badgeWarning` / `badgeExpired` + `caption` | A1 only; empty date → no badge; copy uses **current label value** (fallback “Custom” only if label empty while typing — prefer hide badge until label non-empty **or** still show date-only badge text “Due soon”/“Expired” with field name “Expires on”) |
| Remove | `buttonIcon` | Trash outline, `text-danger` glyph, `min-h-hit` `w-hit`; name **Remove {label} expiration** (or **Remove custom expiration** if label empty). **First tap opens confirm only** (rule 61) — never deletes immediately |
| Focus | `inputFocus` / `buttonFocus` | Standard ring; error `inputError` |

**Stable `id`:** each persisted row keeps `id` for a11y/`aria` and remove confirm. New unsaved rows may use client temp ids until save — do not flash empty then reshuffle order if API returns stable order (document order / created order — Architect).

### Add (US-86)

| Step | UI |
| --- | --- |
| Activate **Add expiration** | Append one empty row (empty label, unset date) at end of list; focus **Label** input of new row |
| Count becomes 10 | Add → `buttonDisabled`; cap `caption` shown |
| Count &lt; 10 after remove | Add re-enables |
| Offline | Add `buttonDisabled`; `bannerWarning` “You are offline.” |
| Busy save | Prefer keep rows editable until submit; primary Save shows busy — do not double-submit |

Rows are part of the **vehicle Details** form: **Save vehicle** persists label/date create+update (Architect: embed vs sub-resource). UI must not invent a second primary “Save expirations”.

### Edit (US-87)

- Prepopulate `label` + `expires_on` per row on edit load.
- Inline edit in place (no drill-in page).
- Changing label updates badge companion text live.
- Duplicate label (CI, trim) → `inputError` + `errorText` on the offending **Label** field(s): **Label must be unique on this vehicle.**
- Label empty / whitespace-only on save → **Enter a label (1–80 characters).**
- Label &gt; 80 after trim → **Label must be 80 characters or fewer.**
- Missing date on a row that was added → **Choose an expiration date.** (both label and date required per item when row present)
- Unchanged built-in dates stay independent controls above this section.

### Remove (US-88 + rule 61)

| | |
| --- | --- |
| Trigger | Row `buttonIcon` remove — opens **ConfirmDeleteDialog** / sheet; **does not** remove on first tap |
| Pattern | Same overlay family as side-image clear and driver delete: `bg-surface-overlay` + raised `shadow-overlay` panel ([_patterns.md](_patterns.md) Sheet) |
| Title | **Remove {label}?** — if label empty: **Remove custom expiration?** |
| Body | **This removes the custom expiration from the vehicle.** Optional calm second line: **You can add it again later.** |
| Cancel | `buttonSecondary` **Cancel** (default focus) — no change; return focus to remove trigger |
| Confirm | `buttonDanger` **Remove** (busy **Removing…**) |
| Success | Row gone from list; if zero rows → empty caption; Add enabled if was at cap |
| Web | Modal dialog semantics |
| Mobile | Bottom sheet / anchored sheet (destructive family — **not** full-screen viewer) |

Do **not** merge remove confirm with Save. Do **not** swipe-to-delete without confirm.

### States matrix

| State | UI |
| --- | --- |
| **Empty** | `caption` **No custom expirations yet.** + **Add expiration** enabled (if online / not denied) |
| **Filled (1–9)** | Rows stacked; Add enabled; badges per A1 under each date |
| **Cap reached (10)** | Ten rows; Add `buttonDisabled` + cap `caption`; remove still available per row |
| **Add in progress** | New empty row visible; focus Label |
| **Edit** | Fields prepopulated; inline validation as above |
| **Remove confirm open** | Sheet/dialog; underlying row still visible; focus trapped in confirm |
| **Removing busy** | Confirm **Removing…**; actions disabled until settle |
| **Validation errors** | Per-field `inputError` + `errorText`; keep values; optional form `bannerDanger` only for global save fail |
| **Loading (edit)** | Skeleton blocks for section heading + 0–n row-shaped skeletons (or one skeleton stack); Add/Remove not actionable until loaded |
| **Save busy** | Primary **Saving…**; avoid duplicate Save; prefer leave row inputs readable |
| **Offline** | `bannerWarning`; Add/Remove/Save disabled as appropriate; existing rows still visible read-only if already loaded |
| **Denied** | No section with foreign data → [denied.md](denied.md) |
| **Individual** | Same section on Details; no Images/Handovers |
| **Driver** | No manage UI |

### Density

| | Web | Mobile |
| --- | --- | --- |
| Form width | Inside `vehicleFormDetails` ~400px | Full comfortable content width |
| Row layout | Stacked fields **Must**; optional compact pair only if wide + labeled | **Stacked only** |
| Hits | 44pt inputs, Add, Remove icon | 44pt; thumb-friendly Remove |
| Tabs | Section only on Details | Same |

### Warning rules (A1) for custom rows

Same table as built-in warnable dates — see [Warning rules](#warning-rules-a1--list--form-only). Registration still never badges. Custom **always** participates in A1 when `expires_on` set.

### List + chrome (US-89)

| Surface | Priority | Behavior |
| --- | --- | --- |
| Details badges | **Must** | Under each custom date |
| List chips | **Should** | Badge + label; wrap; no new columns |
| Nav / tab urgency | **Should** | Include custom `expires_on` in tenant worst-wins with insurance/inspection/road tax (still **not** registration); same red/orange bands — [_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking) |
| Notifications menu | **Could** | If product includes later: grain vehicle + custom label; same 30-day window; do not block this slice on menu redesign |

### A11y (section)

| Control | Name / behavior |
| --- | --- |
| Section heading | Custom expirations (`id` target e.g. `vehicle-custom-expirations-heading`) |
| List | `aria-labelledby` → heading; when empty, empty caption referenced or spoken as section status |
| Row group | Prefer `role="group"` **Custom expiration: {label}** (or **New custom expiration** when label empty) |
| Label input | Label |
| Date input | Expires on |
| Add | Add expiration · when disabled: **Add expiration, maximum of 10 reached** |
| Remove | Remove {label} expiration |
| Confirm dialog | `role="dialog"` `aria-modal="true"` `aria-labelledby` → title **Remove {label}?** |
| Confirm primary | Remove |
| Confirm cancel | Cancel |
| Badge | Not color-only — text Due soon / Expired + label in caption/name |
| Errors | `aria-describedby` / `aria-invalid` on fields; announce with field name |
| Focus | Add → focus new Label; Cancel confirm → Remove trigger; after successful remove → Add or adjacent row |
| Live region | Optional polite on cap reached / remove success; no spam |

### What not to build

- Separate route/page for custom expirations  
- Replacing or renaming built-in Insurance / Inspection / Road tax / Registration  
- Required custom rows (zero is valid)  
- Drag-reorder chrome unless Architect later requires stable order UX  
- Hex, nested cards per row, or a second design system  

## Handovers tab (US-55–US-57)

**Audience:** Owner/Admin on an **existing** company vehicle (web + mobile). **Not** drivers (E55). **Not** a create-handover surface (E54 — drivers use [driver-home.md](driver-home.md)).

**Shared patterns:** [handover.md](handover.md) (type badges, list columns, detail inventory, damage viewer).

### Tab visibility

| Role / mode | Handovers tab |
| --- | --- |
| Owner, edit existing vehicle | Shown (third) |
| Admin, edit existing vehicle | Shown (third) |
| Owner/Admin, **create** (unsaved) | **Omitted** (prefer) or disabled until save |
| Driver | **Absent** — no history chrome (E55) |
| Other company | Denied — [denied.md](denied.md) (E56) |

### History list

**Sort:** newest first (Must).

#### Web (compact)

```
vehicleFormTabPanel
  [optional] caption font-tabular “{n} handovers”
  tableWrap sticky header
    Type | When | Driver | Mileage | Service
```

| Column | Class | Content |
| --- | --- | --- |
| Type | badge + text | `badgeNeutral` **Out** · `badgeOk` **In** — not color-only |
| When | `tableCellNum` | Recorded timestamp; tabular |
| Driver | `tableCell` | Identity/email; if unavailable: `caption` **Unavailable** |
| Mileage | `tableCellNum` | `{n}` + stored unit short (`km` / `mi`) |
| Service | `tableCellMuted` | `{days}d · {distance} {km\|mi}` |

Row: `tableRowHover`; activate → **detail** (read-only). **No** row menu, edit, or delete.

#### Mobile (comfortable)

`listRow` / hairline list (not raised card stack):

| Line | Content |
| --- | --- |
| Primary | Type badge + when (short/relative ok) |
| Secondary `caption` | Driver · mileage + unit |
| Optional third | Service summary |

Tap row → detail. Same newest-first order.

### Empty / loading / error (history)

| State | UI |
| --- | --- |
| **Empty** | `emptyState` title **No handovers yet.** sentence **Out and In records for this vehicle will show up here.** **No** “Add handover” CTA (Owner cannot create) |
| **Loading** | Skeleton table rows (web) or list rows (mobile) inside tab panel; tab chrome real |
| **Error** | `bannerDanger` + **Retry** |
| **Offline** | `bannerWarning`; list may stay stale; no fake rows |
| **Denied** | [denied.md](denied.md); no foreign handovers |

### Detail (read-only)

| Surface | Chrome |
| --- | --- |
| **Web** | Centered read-only dialog **or** push panel on `bg-surface-raised` + `border-border` + `rounded-lg` + `shadow-overlay` (same elevation family as side viewer — **not** bottom sheet) |
| **Mobile** | Full-screen push/modal on `bg-canvas`; back/close → history |

```
header  Close / Back + title “Handover detail” + type badge Out|In
body gap-2
  When
  Driver (or Unavailable)
  Mileage + unit
  Next service (days)
  Next service distance + unit
  Damages text | caption “No damages noted.”
  Damage photos
    empty → caption “No damage photos.”
    else → handoverDamageGrid read-only thumbs → tap simplified viewer
```

| Allowed | Not offered |
| --- | --- |
| View fields + photos | Edit any field |
| Enlarge damage photo (view-only zoom) | Delete handover |
| Close / back | Remove damage image post-submit (E57) |
| | Create Out/In from this tab |

Detail states: loading skeleton · ready · image fail (viewer fail caption; metadata kept) · load error `bannerDanger` + Back · denied → [denied.md](denied.md).

### Damage photos on detail

- Grid: `handoverDamageGrid` + `handoverDamageThumb` (48px), read-only (no remove icon).
- Enlarge: reuse `vehicleSideViewer*` — title **Damage photo {n} of {m}**; zoom +/−; dismiss unchanged (same simplified pattern as driver attach preview in [handover.md](handover.md)).
- **Not** the four-side appearance grid; **not** clear/replace side-slot flows.

### Density

| | Web | Mobile |
| --- | --- | --- |
| Tab strip | Compact `vehicleFormTab*` | Same three tabs, comfortable hits `min-h-hit` |
| History | Compact table | Comfortable `listRow` |
| Detail | Modal/panel compact type | Full-screen comfortable pad |
| Save vehicle | Hidden on Handovers tab | Hidden on Handovers tab |

### Handovers tab — states summary

| State | UI |
| --- | --- |
| Tab hidden (driver / create omit) | Not in tab list |
| History empty / loading / error | Table above |
| Detail open | Focus trap in dialog/screen; return focus to row on close |
| Concurrent Images viewer | Do not stack handover detail under side viewer or vice versa — one modal family at a time |

## Side appearance images (US-35–US-39, US-41–US-44)

**In scope:** Owner/Admin create + edit on **web and mobile**. Exactly four sides: **FRONT**, **LEFT**, **RIGHT**, **BACK** (A35). One current image per side; upload again = **replace** (US-36, rule 53). Clear empties that side (US-37). **Any image type**; max **5 MB** each; non-image rejected (rule 56). Bytes in Supabase Storage; UI shows **preview from reference**, not a compliance PDF uploader. **US-41:** larger preview frames on the Images tab. **US-42–US-44:** filled side opens a **view-only** modal/full-screen viewer with zoom; close leaves vehicle data unchanged.

**Out of scope:** compliance document upload; multi-image gallery per side; driver manage UI; list four-up gallery or list lightbox; camera product chrome beyond platform picker; crop/edit studio; pinch-to-zoom **on the slot** (viewer only); multi-image per side; API contract invention in Design.

### Section layout (inside the single form `panel`)

Place **after** registration date, **before** primary Save. Separated with the same language as other secondary blocks:

```
… Registration date …
── Images tab → vehicleSideSection (gap-2; no top hairline — tab already separates) ──
  sectionTitle optional or caption only (tab label is Images)
  caption Optional. One photo per side. Any image type · max 5 MB each.
  vehicleSideGrid
    [FRONT slot] [LEFT slot]
    [RIGHT slot] [BACK slot]
buttonPrimary Save vehicle
```

| Region | Class / token | Notes |
| --- | --- | --- |
| Section wrapper | `vehicleSideSection` | `gap-2`; stays **inside** the one raised `panel` (no second card). Tab already separates Details/Images. |
| Heading | `sectionTitle` | Optional “Appearance”; tab label is **Images** |
| Helper | `caption` | Limits + optional nature; not a second page subtitle |
| Grid web | `vehicleSideGrid` | **2×2** (`grid-cols-2 gap-2`); `max-w-vehicle-side-grid-max` (400px) — larger frames, still ops grid not mosaic |
| Grid mobile | `vehicleSideGrid` | Same **2×2**; full width of comfortable content pad; slots share width; same 176px frame height |
| Slot stack | `vehicleSideSlot` | Label → frame → actions → per-side error |

**Side order (fixed, both platforms):** FRONT → LEFT → RIGHT → BACK (reading order L→R, T→B). Do not reorder by fill state.

**Labels (visible + a11y root):** **Front**, **Left**, **Right**, **Back** — sentence case on UI; API/side keys remain FRONT/LEFT/RIGHT/BACK. Use `label` above each frame.

### Slot anatomy

Each side is an independent control group:

```
vehicleSideSlot
  label {Front|Left|Right|Back}
  vehicleSideFrame | vehicleSideFrameFilled   ← empty | filled (viewer target) | uploading | error
  vehicleSideActions ← Add / Replace / Clear (state-dependent; optional View on dense UIs)
  errorText          ← per-side only when that side failed
```

| Element | Class | Spec |
| --- | --- | --- |
| Frame (empty / loading) | `vehicleSideFrame` | Height `h-vehicle-side-slot` (**176px** token, US-41); width full of cell, `max-w-vehicle-side-slot` so web does not stretch into a banner. `bg-surface-sunken`, `border-border`, `rounded-md`, clip overflow. Empty add hit ≥ 44pt (frame and/or Add). |
| Frame (filled) | `vehicleSideFrameFilled` | Same size/chrome as frame + filled preview. **Primary open control for the viewer (US-42):** whole frame is a button/control (`min-h-hit`, keyboard-activable). Does **not** open file picker on click — Replace stays the replace path. |
| Focus | `vehicleSideFrameFocus` | `shadow-ring` + `border-focus` when frame / file control / filled viewer trigger is focused |
| Error chrome | `vehicleSideFrameError` | `border-danger` on that side only (pairs with `errorText`) |
| Preview | `vehicleSidePreview` | Filled: image covers frame (`object-cover` / RN resize cover). Image decorative inside named control; control name includes side. |
| Empty | frame + `caption` centered | Short cue **Add photo** (muted). **Does not** open viewer. No fake plate illustration. |
| Uploading | frame + `skeleton` overlay or full-frame `skeleton` | Keep side label; disable Replace/Clear/Add/View **and** do **not** open viewer for **that** side until settle; other sides stay interactive |
| Actions row | `vehicleSideActions` | `gap-1`, wrap allowed; all controls `min-h-hit`. Filled: Replace + Clear; optional `buttonGhost` **View** if product wants an explicit control in addition to frame tap (same open path). |

### Per-side states

| State | Frame | Actions | Viewer | Copy / feedback |
| --- | --- | --- | --- | --- |
| **Empty** | Sunken empty + “Add photo” | `buttonSecondary` **Add photo** (or frame is the add target + visually hidden file input) | **Cannot open** | No Clear. No Replace. No View. |
| **Filled** | `vehicleSideFrameFilled` + `vehicleSidePreview` | `buttonSecondary` **Replace photo**; **icon** clear (`buttonIcon` + trash, “Clear {side} photo”) → clear confirm only; optional **View** | **Can open** via frame activate (Enter/Space/click/tap) or View | One image only; Replace ≠ View |
| **Replacing / uploading** | Prior preview dimmed **or** `skeleton` | Actions `buttonDisabled`; busy “Uploading…” | **Blocked** on that side | Keep prior on failure (E39) |
| **Clear confirm open** | Preview still shown | Clear-confirm sheet open (separate from viewer) | Viewer **closed** if it was open; do not stack viewer under clear sheet | Cancel → filled unchanged **(E41)** |
| **Clearing** | Preview held until success | Confirm primary busy “Clearing…” | Closed | Success → **Empty** |
| **Viewer open** | Filled preview still under modal | Slot actions not reachable until dismiss (focus trapped in viewer) | See [Side image viewer](#side-image-viewer-us-42us-44) | Dismiss → data **unchanged** (US-44) |
| **Per-side error** | `vehicleSideFrameError` | Re-enable; prior filled/empty kept | Filled+error still **can** open viewer on prior preview if still filled | `errorText` under that side only |
| **Form load (edit)** | Skeleton four frames | Not actionable | **Cannot open** until filled known | No wrong preview flash |

**Replace (US-36):** Choosing a new file on a filled side is **replace**, not a second concurrent image. UI never shows two stacked photos for one side. Label on filled side file action is **Replace photo** (not “Add another”). Replace does **not** open the viewer.

**Open viewer (US-42) — choice:**

| Trigger | When | Behavior |
| --- | --- | --- |
| **Primary:** activate filled frame | Filled only | Opens viewer for **that side only** (not a four-up carousel) |
| **Secondary (optional):** `buttonGhost` / text **View** in `vehicleSideActions` | Filled only | Same open path; useful when frame is not obvious as a control |
| Empty frame / Add | Empty | Picker / add only — **never** viewer |
| Uploading frame | Busy | No open |
| Clear trash icon | Filled | Clear **confirm** only — **never** viewer |
| List **Photos** cue | List | Unchanged; still opens **edit**, not viewer (US-39) |

**Clear (US-37 + A41):** Filled side only. **Icon button** (trash outline, `buttonIcon`, 44pt hit, `text-danger` glyph) opens **confirm sheet** — same overlay pattern as driver hard-delete ([_patterns.md](_patterns.md) Sheet). **Separate** from the image viewer (never merge zoom chrome with clear confirm). Copy:

| | |
| --- | --- |
| Title | Clear {Front\|Left\|Right\|Back} photo? |
| Body | This removes the photo from the vehicle. You can add a new one later. |
| Cancel | `buttonSecondary` **Cancel** (default focus) |
| Confirm | `buttonDanger` **Clear photo** (busy **Clearing…**) |

Cancel/dismiss → no API call **(E41)**. After successful clear, slot matches **Empty**; product must not keep showing the old file (A40). Empty side: **no** clear icon.

**Optional save:** Primary **Save vehicle** does not require any side filled. Side upload/clear may complete **before or with** vehicle field save per Architect/API — UI must still allow empty sides and must not block Save on missing photos. If upload is in flight, prefer: disable Save while any side is `uploading` to avoid races; optional calm `caption` “Finish photo upload before saving.” only if Save is blocked. **Viewer open does not block Save** on other work once dismissed; while viewer is open, form is inert under the modal (focus trapped) — dismiss first.

### Side image viewer (US-42–US-44)

**Purpose:** Inspect one filled side photo larger than the slot, with **view-only** zoom. **Not** an editor, crop studio, multi-side gallery, or clear/replace surface.

**Audience:** Owner/Admin on create/edit **Images** tab only (web + Owner mobile). Drivers: no viewer.

#### Chrome choice (parity)

| Surface | Pattern | Why |
| --- | --- | --- |
| **Web** | Centered **modal dialog** `vehicleSideViewerDialog` over `vehicleSideViewerOverlay` (`bg-surface-overlay` + `shadow-overlay`) | Matches confirm-dialog elevation language; form stays under scrim; Escape + backdrop dismiss familiar on desktop |
| **Mobile** | **Full-screen modal** `vehicleSideViewerScreen` on `bg-canvas` (safe-area top/bottom) | Comfortable zoom stage; **not** a bottom sheet — bottom sheet stays reserved for destructive **clear/delete** confirms ([_patterns.md](_patterns.md)) so users do not confuse view with clear |

Do **not** implement mobile viewer as the clear-confirm bottom sheet. Do **not** open viewer from the list Photos cue.

#### Layout

```
vehicleSideViewerOverlay | vehicleSideViewerScreen
  vehicleSideViewerToolbar
    leading: Close (X) buttonIcon
    center:  vehicleSideViewerTitle  “{Front|Left|Right|Back} photo”
    trailing: vehicleSideViewerZoomGroup  [ − ] [ + ]
  vehicleSideViewerStage
    vehicleSideViewerImage  (contain; scaled by zoom factor)
```

| Region | Class | Spec |
| --- | --- | --- |
| Scrim (web) | `vehicleSideViewerOverlay` | `fixed inset-0 z-30`; `bg-surface-overlay`; centers dialog; **backdrop click dismisses** (US-44) |
| Dialog (web) | `vehicleSideViewerDialog` | One raised plane: `bg-surface-raised`, `border-border`, `rounded-lg`, `shadow-overlay`; `max-w` ~720px token-free width ok via existing content rhythm; `max-h-[90vh]`; `m-2` |
| Screen (mobile) | `vehicleSideViewerScreen` | Full viewport under status/safe area; `bg-canvas`; toolbar raised strip |
| Toolbar | `vehicleSideViewerToolbar` | Height `h-vehicle-side-viewer-toolbar` (56px); `border-b border-divider`; Close + title + zoom cluster; all hits ≥ 44pt |
| Title | `vehicleSideViewerTitle` | Side label + “photo”; truncate; also `aria-labelledby` target |
| Zoom group | `vehicleSideViewerZoomGroup` | `gap-1`; **Zoom out** then **Zoom in** (LTR). Disabled states when at min/max |
| Stage | `vehicleSideViewerStage` | `flex-1`, `bg-surface-sunken`, clip overflow, center content, `p-2` |
| Image | `vehicleSideViewerImage` | `object-contain` / RN contain; transform scale from zoom factor; no edit handles |

#### Zoom behavior

| Control | Spec |
| --- | --- |
| Default | **1×** every open (US-43) — do not restore prior zoom |
| Zoom in / out | Buttons required; step `motion.vehicle-side-zoom` (0.5); min 1 / max 3 |
| Wheel (web Should) | Optional; same clamps |
| Pinch (mobile Should) | Optional; same clamps; +/− remain |
| Reduce-motion | Instant scale; no bounce |

#### Dismiss (US-44)

Close, Escape (web), backdrop (web), system back (mobile). **No** data change; zoom forgotten; return focus to opener.

### Validation & errors (US-38) — per side

| Condition | UI |
| --- | --- |
| Not an image (E35) | That side not updated; `vehicleSideFrameError` + `errorText` “Upload an image file.” |
| File > 5 MB (E36) | That side not updated; prior kept; `errorText` “Image must be 5 MB or smaller.” |
| Storage / upload failure (E39) | Prior reference or empty kept; `errorText` “Photo could not be uploaded. Try again.” Optional page `bannerDanger` only if failure is global; prefer per-side |
| Authz / other company / driver (E38) | No manage UI or denied → [denied.md](denied.md); images unchanged |
| Offline | Add/Replace/Clear `buttonDisabled`; `bannerWarning` “You are offline.” |

Do **not** use a single form-level `inputError` for all sides. Failures are **scoped to the side** that failed; other sides unchanged.

### Web vs mobile interaction

| | Web | Mobile |
| --- | --- | --- |
| Density | Compact; 2×2 in panel; slot **176px** height (`vehicle-side-slot`); grid max 400px | Comfortable; same 2×2; **176px** frames; full-width cells |
| Picker | Hidden file input accept `image/*` + Add/Replace | System image library / camera **if** OS offers; still enforce image vs non-image and size after pick |
| Keyboard | Tab: side label → filled frame (View) / empty add → Replace → Clear → next side → Save. Viewer open: trap inside toolbar + stage controls; Tab cycles Close, Zoom out, Zoom in (and stage if focusable). **Escape** closes viewer | Focus order mirrors visual order; 44pt hits; platform back closes viewer |
| Preview | CSS cover in slot; contain in viewer | RN cover in slot; contain in viewer |
| Viewer | Centered modal + scrim; backdrop + Escape dismiss | **Full-screen** modal (not bottom sheet); Close + system back |
| Zoom | +/− **Must**; wheel **Should** | +/− **Must**; pinch **Should** |
| Clear | `buttonIcon` trash → **confirm modal** (not viewer) | Same icon → **confirm sheet**; no swipe-to-clear; no clear inside viewer |

### What not to build

- Four-up **list** gallery or hover lightbox of all sides  
- List Photos cue opening the viewer  
- Compliance PDF/scan fields beside Appearance  
- Per-side required asterisks  
- Driver home / next-travel requiring or managing these images  
- Extra sides (roof, interior, etc.)  
- Crop / rotate / filter / multi-image / pinch-zoom **on the slot**  
- Merging clear-confirm with the zoom viewer  
- Hex, ad-hoc spacing, or a second raised card only for photos  
- Sticky zoom level across opens or across sides

## Warning rules (A1) — list & form only

Applies to **Insurance, Inspection, Road tax**, and **each custom expiration** with a set `expires_on`. **Registration never shows** `badgeExpired` / `badgeWarning`.

| Condition | Treatment |
| --- | --- |
| Date in past | `badgeExpired` “Expired” + date name **or custom label** |
| Date within 30 days including today | `badgeWarning` “Due soon” + date name **or custom label** |
| Date > 30 days | Date only, no badge |
| Empty date | No badge |
| Registration any value | Date only, **no** badge |

Show on **list** (web cells / mobile wrap — built-in columns + **Should** custom chips) **and** **edit/create form** (inline under insurance/inspection/road tax **and** each custom date). **Unchanged by US-28** chrome bands and **unchanged by US-35–US-39**. Custom Details badges are **Must (US-89)**.

## Nav / tab urgency (US-28) — chrome only

Worst-wins fleet urgency on the **Vehicles** sidebar item (web) and **Vehicles** tab (mobile Owner/Admin). **Not** painted on list rows, date cells, form badges, or side-image slots.

| Band | When | Chrome |
| --- | --- | --- |
| Red | Any tenant section `daysUntil < 7` (incl. overdue) | `navItemUrgencyCritical` / `tabItemUrgencyCritical` |
| Orange | No red; any section `daysUntil = 7` | `navItemUrgencySoon` / `tabItemUrgencySoon` |
| None | Else | Base nav/tab only |

**Sources:** non-null `insurance_on`, `inspection_on`, `road_tax_on`, and **Should (US-89)** each custom `expires_on`. **Not** `registration_on`.

Full state matrix, selected+urgency stacking, contrast, and accessible names: [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking). List/detail stay on the **30-day** badge window (A1); nav uses the **7-day / exact-7** bands (A20).

## States

| State | UI |
| --- | --- |
| Driver create / image manage / custom expirations | Denied; no vehicle created; no image or custom-expiration UI → [denied.md](denied.md) |
| Other company edit / images / custom | Denied; vehicle, images, custom rows unchanged |
| Validation (fields) | Built-in + custom inline/`bannerDanger` as specified; empty built-in dates mean no warning; empty custom **section** is valid; **incomplete custom row** blocks save with field errors (US-90) |
| Custom empty / cap / remove confirm | See [Custom expirations](#custom-expirations-us-86us-90) |
| Side image validation | Per-side only (table above); vehicle field save still allowed with empty sides |
| Partial sides | Filled sides show preview; empty sides stay empty (US-35) |
| Handovers empty / loading / error | See [Handovers tab](#handovers-tab-us-55us-57) |
| Handover detail | Read-only; no edit/delete (E57) |

## Token usage

| Role | Class |
| --- | --- |
| Table | `tableWrap` `tableHeader` `tableCell` `tableCellNum` `tableCellLink` `tableCellMuted` `tableRowHover` |
| Form tabs | `vehicleForm` `vehicleFormTabList` `vehicleFormTab` `vehicleFormTabSelected` `vehicleFormTabPanel` `vehicleFormDetails` |
| Custom expirations | `vehicleCustomExpirations` `vehicleCustomExpirationList` `vehicleCustomExpirationRow` — layout only; fields reuse `sectionTitle` `label` `input` `inputHover` `inputFocus` `inputError` `errorText` `caption` `badgeWarning` `badgeExpired` `buttonSecondary` `buttonDisabled` `buttonIcon` `buttonDanger` `buttonFocus` |
| Side frames / actions | `vehicleSideSection` `vehicleSideGrid` `vehicleSideSlot` `vehicleSideFrame` `vehicleSideFrameFilled` `vehicleSideFrameFocus` `vehicleSideFrameError` `vehicleSidePreview` `vehicleSideActions` |
| Side actions | `buttonSecondary` `buttonGhost` `buttonDisabled` `buttonFocus` |
| Side viewer | `vehicleSideViewerOverlay` `vehicleSideViewerOverlayMobile` `vehicleSideViewerDialog` `vehicleSideViewerScreen` `vehicleSideViewerToolbar` `vehicleSideViewerTitle` `vehicleSideViewerZoomGroup` `vehicleSideViewerStage` `vehicleSideViewerImage` `vehicleSideViewerClose` `vehicleSideViewerZoomIn` `vehicleSideViewerZoomOut` |
| Side / form errors | `errorText` (+ optional page `bannerDanger` / `bannerWarning`) |
| Handovers history | `badgeNeutral` `badgeOk` `emptyState` `listRow` `caption` `bannerDanger` `bannerWarning` |
| Handover damage (detail) | `handoverDamageGrid` `handoverDamageThumb` `handoverDamageThumbFocus` — read-only (no remove) |
| List presence (Should) | `vehicleSidePresence` `vehicleSidePresenceIcon` — **unchanged** by custom expirations |
| Loading | `skeleton` |
| Spacing tokens | `vehicle-side-slot` **176px**; `vehicle-side-grid-max` **400px**; `vehicle-side-viewer-toolbar` **56px**; damage thumbs use spacing **`6`** (48px); custom rows use form `gap-2` only |
| Zoom tokens | `motion.vehicle-side-zoom` min **1** / max **3** / step **0.5** / default **1** |

**No new color or spacing tokens** for US-86–US-90. Confirm remove reuses Sheet / ConfirmDeleteDialog pattern from [_patterns.md](_patterns.md).

## A11y

| Control | Name |
| --- | --- |
| Screen (list) | Vehicles |
| Screen (create) | Add vehicle |
| Screen (edit) | Edit vehicle |
| Add vehicle | Add vehicle |
| Row (no photos) | {Make} {Model}, {plate}, {date name \| custom label} expired \| due soon |
| Row (has photos, Should) | {Make} {Model}, {plate}, has photos, {date name \| custom label} expired \| due soon |
| List presence chip | Photos (decorative icon hidden) |
| Make | Make |
| Model | Model |
| Save | Save vehicle |
| Tab Details | Details |
| Tab Images | Images |
| Tab Handovers | Handovers |
| Handover history | Handover history |
| Handover row | {Out\|In}, {when}, {driver}, mileage {n} {unit} |
| Handover detail | Handover detail, {Out\|In} |
| Close handover detail | Close handover detail |
| Handover damage thumb | Damage photo {n}; activate to enlarge |
| Custom expirations heading | Custom expirations |
| Custom expiration row | Custom expiration: {label} |
| Custom label field | Label |
| Custom date field | Expires on |
| Add expiration | Add expiration |
| Add expiration (cap) | Add expiration, maximum of 10 reached |
| Remove custom | Remove {label} expiration |
| Remove confirm | Remove {label}? |
| Remove confirm primary | Remove |
| Remove confirm cancel | Cancel |
| Appearance section | Appearance (heading) |
| Side slot group | Front photo \| Left photo \| Right photo \| Back photo |
| Add (empty side) | Add Front photo (etc.) |
| Filled frame (open viewer) | View Front photo (etc.) — button/dialog trigger |
| Optional View action | View Front photo (etc.) |
| Replace | Replace Front photo (etc.) |
| Clear | Clear Front photo (etc.) |
| Side error | Announced with the side name; not color-only (`errorText` + `vehicleSideFrameError`) |
| Viewer dialog | `{Front\|Left\|Right\|Back} photo` (`aria-labelledby` → title; `role="dialog"` `aria-modal="true"` web) |
| Viewer close | Close photo viewer |
| Zoom in | Zoom in |
| Zoom out | Zoom out |
| Zoom in disabled | Zoom in, maximum zoom (or `aria-disabled` + name) |
| Zoom out disabled | Zoom out, minimum zoom |
| Vehicles nav/tab (none) | Vehicles |
| Vehicles nav/tab (orange) | Vehicles, expiry in 7 days |
| Vehicles nav/tab (red) | Vehicles, critical expiry within 7 days |

- Badges not color-only; nav urgency not color-only (name + fill + selected edge).
- Side presence cue not color-only (text **Photos** and/or name on row).
- Date picker 44pt; web keyboard reachable.
- Custom Add/Remove and label/date fields ≥ 44pt; remove confirm focus-trapped; Cancel default focus.
- Suggested stable ids (Architect/FE): `vehicle-custom-expirations-heading`, `vehicle-custom-expiration-list`, `vehicle-custom-expiration-{id}`, `vehicle-custom-expiration-{id}-label`, `vehicle-custom-expiration-{id}-expires-on`, `vehicle-custom-expiration-add`, `vehicle-custom-expiration-{id}-remove`, `vehicle-custom-expiration-remove-dialog`.
- Side Add/Replace/Clear/View and frames ≥ 44pt hits; focus `vehicleSideFrameFocus` / `buttonFocus`.
- **Viewer (web):** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title. **Focus trap** while open; initial focus **Close** (or dialog). On dismiss, return focus to the **filled frame** (or View) that opened it.
- **Viewer (mobile):** modal/accessibilityViewIsModal (or equivalent) so VO stays in viewer; dismiss returns focus/accessibility to the slot trigger.
- Backdrop is dismissive but not the only path — visible Close always present.
- Zoom not gesture-only: +/− always available and named.
- Do not clip labels; wrap badges, custom chips, and presence chip on mobile.
- Edit: fields keep visible labels; prepopulated values and image previews are the accessible value, not a second unlabeled string.
- List primary identity is one string (`Make Model`); form exposes Make and Model as separate labeled controls; custom label is its own control (not merged into built-in date labels).
- Live regions: optional polite announce on per-side upload/clear success, custom remove success, or cap reached; optional polite zoom percent; do not spam on every poll.
- Reduce-motion: no shimmer pulse on skeleton; static `skeleton` fill; viewer open/zoom without spring