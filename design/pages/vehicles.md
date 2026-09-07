# Vehicles (list, create, edit)

**Stories:** US-11, US-12, US-13, US-15, **US-28** (nav/tab urgency — chrome only; see [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking)), **US-35–US-39** (optional side appearance images), **US-41–US-44** (larger side previews + view-only zoom viewer), **US-45–US-49** (optional vehicle mileage / kilometres), **US-55–US-57** (Owner/Admin **Handovers** tab — history + detail, read-only)  
**Density:** Web compact **table**; mobile comfortable **rows**. Owner/Admin.  
**Purpose:** Fleet records: **Make** + **Model** (two free-text fields), plate, optional **current mileage** (odometer reading; unit Miles/Kilometers from country), insurance, inspection, country of registration, road tax **dates**, plus optional **appearance photos** from four sides (**FRONT**, **LEFT**, **RIGHT**, **BACK**), plus **handover history** (Out/In) on a third tab. Warn on list **and** detail (BA Q8 — design: **both**). Country is a text field, not a catalog. Make/Model are free text — **no** make/model catalog dropdowns. Compliance stays **dates only** — **no** insurance/inspection/tax/registration **document** upload (A2). Side images are **not** compliance documents (A35–A40). Handover damage photos are **not** side-appearance slots (A50, A56). **US-41–US-44:** larger Images-tab frames; filled sides open a **view-only** zoom viewer; dismiss leaves data unchanged. **US-45–US-49:** optional mileage on Details tab + list when present (rules 64–71). **US-55–US-56:** Handovers tab list + detail; **no** edit/delete (E57). Shared handover patterns: [handover.md](handover.md).  
**Chrome:** Authenticated shell. Sidebar / tab **Vehicles** selected when on this area. No search. **US-28:** Vehicles nav/tab may show red/orange urgency fill from fleet-wide worst section dates — pattern chrome, not list badges.  
**Parity (A16):** Same list / create / edit / side-image manage **and** side-image viewer **and** Handovers history/detail on web and Owner/Admin mobile. Drivers have **no** side-image manage or viewer UI (A40, E38) and **no** Handovers history tab (E55). Owner/Admin **do not** create handovers here (driver-only create — E54).

## List — web

```
pageHeader
  pageTitle Vehicles
  pageSubtitle Insurance, inspection, road tax, and registration dates
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
| Date columns | `tableCellNum` | Tabular date; if due/expired, `badgeWarning` / `badgeExpired` **and** the date |

Row hover `tableRowHover`; tap → edit. Do **not** use a card per vehicle on web. Do **not** split Make/Model into two list columns. Do **not** put four side thumbnails on the list (not a gallery).

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

`appBarMobile` “Vehicles” + Add. `listRow`: primary identity **`{Make} {Model}`** as `label`, plate as `caption` (muted secondary). **US-49:** when mileage present, second `caption` line or same caption trail: `Mileage {n} {km|mi}` / unit label — omit line when null. Badges wrap (`badgeWarning` / `badgeExpired` with date name). **Should:** `vehicleSidePresence` when any side image exists. Hairline divider, not raised cards.

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
| **Details** (default) | Identity + compliance dates — `vehicleFormDetails` max ~400px | Visible |
| **Images** | Side appearance only — same four-side grid (US-35–US-39) | Visible |
| **Handovers** (third) | Read-only Out/In **history** + drill-in **detail** (US-55–US-56) | **Hidden** on this tab — history is not vehicle field save |

Tab chrome: `vehicleFormTabList` + `vehicleFormTab` / `vehicleFormTabSelected` (selected = bottom `border-brand` + semibold; not color-only). Panels: `vehicleFormTabPanel`. **Save vehicle** stays **below the tab strip** on **Details** and **Images** so field save is not buried under photos. On **Handovers**, omit Save (read-only). Same Details/Images field inventory for create and edit — **not** two visual systems. **Handovers** tab: **Owner/Admin only**; omit for drivers (E55). On **create** (no persisted vehicle yet), **omit or disable** Handovers — prefer **omit** until the vehicle exists; optional `caption` only if tab kept disabled: “Save the vehicle to view handovers.” **Web (desktop) Must;** mobile **Should** use the same three tabs (comfortable density) rather than stacking Appearance/history under dates.

**Cross-link:** list columns, empty/loading, detail chrome, damage thumbs → [handover.md](handover.md). Driver Out/In forms live on [driver-home.md](driver-home.md), not this page.

### Create vs edit (prepopulate)

| Mode | Entry | Page title | Fields | Primary |
| --- | --- | --- | --- | --- |
| **Create** | Header “Add vehicle” / empty CTA | “Add vehicle” | **Blank** — empty text inputs; mileage empty; date controls empty / unset (no placeholder fake dates); **all four side slots empty** | `buttonPrimary` “Save vehicle” |
| **Edit** | List row tap / identity link | “Edit vehicle” (subtitle optional: plate or `{Make} {Model}` once known) | **Prepopulated** from stored vehicle: make, model, plate, country, mileage (empty if null), each section date, **and** side images (filled preview or empty slot per side) as returned by API (US-39, US-46, rule 59) | Same `buttonPrimary` “Save vehicle” |

- Edit must show stored values on first paint after load (no flash of empty then fill if avoidable; loading uses form skeleton in the same `panel`, including four side-slot skeletons).
- Create must **not** inherit the last-edited vehicle or its images.
- Under each date on **both** modes: if the current field value warrants it, badge + `caption` (“Insurance · Expired” / “Inspection · Due soon”) — same A1 rules as list. Empty date → no badge.
- No separate “detail read-only” screen in this slice: row opens **edit** with prepopulated fields (Details/Images). **Handovers** is the read-only history surface for custody records only.
- Denied paths (driver create, other-company edit, driver Handovers history) → [denied.md](denied.md); form not shown with foreign data; **no** image manage controls for drivers (E38); **no** Handovers tab for drivers (E55).

| Field | Type | Copy |
| --- | --- | --- |
| Make | Text | “Make” — free text; **not** a catalog dropdown |
| Model | Text | “Model” — free text; **not** a catalog dropdown |
| License plate | Text | “License plate” |
| Country of registration | Text | “Country of registration” — free text, not a law catalog |
| Mileage (current) | Number / decimal text | **US-45–US-47:** one control. **Label** = unit from country: **“Miles”** or **“Kilometers”** (same strings as driver odometer). **Hint/caption** may repeat unit. Optional; empty = unknown. No separate unit picker. Place **after country**, **before** insurance date. |
| Insurance date | Date | “Insurance” |
| Inspection date | Date | “Inspection” — Admin-entered; not computed from country |
| Road tax date | Date | “Road tax” |
| Registration date | Date | “Registration” — optional stored date; **no** expiry badge or nav urgency |
| Side appearance | Four slots | **Images** tab only — see **Side appearance images** |

**Make and Model** are two separate controls, stacked with the same form `gap-2` as other fields (Make above Model). Do not combine into one “Car” field. No make/model pickers or typeahead catalogs in this slice.

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

One date each (BA Q7 — **single date per item**).

Primary `buttonPrimary` “Save vehicle” on **Details** / **Images** only. Saving with expired/soon dates **allowed**; badges show immediately on insurance/inspection/road tax (A11). Saving **without any side images** is allowed (US-35, rule 57). Side images are **optional** and independent of date validity. **Handovers** tab never offers Save, edit, or delete of custody rows (E57).

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

##Driver Handovers history | Tab absent (E55); no history API chrome |
| Other company edit / images / handovers | Denied; vehicle, images, handovers unchanged |
| Validation (fields) | BA Q6 open — all listed fields shown; empty dates mean no warning |
| Side image validation | Per-side only (table above); vehicle field save still allowed with empty sides |
| Partial sides | Filled sides show preview; empty sides stay empty (US-35) |
| Handovers empty / loading / error | See [Handovers tab](#handovers-tab-us-55us-57) |
| Handover detail | Read-only; no edit/delete (E57) |

## Token usage

| Role | Class |
| --- | --- |
| Table | `tableWrap` `tableHeader` `tableCell` `tableCellNum` `tableCellLink` `tableCellMuted` `tableRowHover` |
| Form tabs | `vehicleForm` `vehicleFormTabList` `vehicleFormTab` `vehicleFormTabSelected` `vehicleFormTabPanel` `vehicleFormDetails` |
| Side frames / actions | `vehicleSideSection` `vehicleSideGrid` `vehicleSideSlot` `vehicleSideFrame` `vehicleSideFrameFilled` `vehicleSideFrameFocus` `vehicleSideFrameError` `vehicleSidePreview` `vehicleSideActions` |
| Side actions | `buttonSecondary` `buttonGhost` `buttonDisabled` `buttonFocus` |
| Side viewer | `vehicleSideViewerOverlay` `vehicleSideViewerOverlayMobile` `vehicleSideViewerDialog` `vehicleSideViewerScreen` `vehicleSideViewerToolbar` `vehicleSideViewerTitle` `vehicleSideViewerZoomGroup` `vehicleSideViewerStage` `vehicleSideViewerImage` `vehicleSideViewerClose` `vehicleSideViewerZoomIn` `vehicleSideViewerZoomOut` |
| Side errors | `errorText` (+ optional page `bannerDanger` / `bannerWarning`) |
| Handovers history | `badgeNeutral` `badgeOk` `emptyState` `listRow` `caption` `bannerDanger` `bannerWarning` |
| Handover damage (detail) | `handoverDamageGrid` `handoverDamageThumb` `handoverDamageThumbFocus` — read-only (no remove) |
| List presence (Should) | `vehicleSidePresence` `vehicleSidePresenceIcon` — **unchanged** by US-41–US-44 / handovers |
| Loading | `skeleton` |
| Spacing tokens | `vehicle-side-slot` **176px**; `vehicle-side-grid-max` **400px**; `vehicle-side-viewer-toolbar` **56px**; damage thumbs use spacing **`6`** (48px) |
| Zoom tokens | `motion.vehicle-side-zoom` min **1** / max **3** / step **0.5** / default **1** |

## A11y

| Control | Name |
| --- | --- |
| Screen (list) | Vehicles |
| Screen (create) | Add vehicle |
| Screen (edit) | Edit vehicle |
| Add | Add vehicle |
| Row (no photos) | {Make} {Model}, {plate}, {date name} expired \| due soon |
| Row (has photos, Should) | {Make} {Model}, {plate}, has photos, {date name} expired \| due soon |
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
| Appearance section | Appearance (heading) |
| Side slot group | Front photo \| Left photo \| Right photo \| Back photo |
| Add (empty side) | Add Front photo (etc.) |
| Filled frame (open viewer) | View Front photo (etc.) — button/dialog trigger |
| Optional View action | View Front photo (etc.) |
| Replace | Replace Front photo (etc.) |
| Clear | Clear Front photo (etc.) |
| Side error | Announced with the side name; not color-only (`errorText` + `vehicleSideFrameError`) |
| Viewer dialog | `{Front\|Left\|Right\|Back} photo` or **Damage photo {n} of {m}**
| Opening | Instant under reduce-motion; otherwise optional `motion.duration.fast` fade — no bounce |
| Ready | Image contained at 1×; focus to **Close** (safe default) or dialog container per platform dialog pattern |
| Zoomed | Image scaled; ± enablement updates; live region **optional polite** “Zoom {n}%” — do not spam every half-step if noisy |
| Image load fail in viewer | Stage `caption` “Photo could not be shown.” + Close; does not clear side data |
| Offline | Viewer may still show already-loaded blob/URL if cached; otherwise same fail caption; no upload from viewer |

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

Applies to **Insurance, Inspection, Road tax** only. **Registration never shows** `badgeExpired` / `badgeWarning`.

| Condition | Treatment |
| --- | --- |
| Date in past | `badgeExpired` “Expired” + date name |
| Date within 30 days including today | `badgeWarning` “Due soon” + date name |
| Date > 30 days | Date only, no badge |
| Empty date | No badge |
| Registration any value | Date only, **no** badge |

Show on **list** (web cells / mobile wrap) **and** **edit/create form** (inline under insurance/inspection/road tax). **Unchanged by US-28** and **unchanged by US-35–US-39**.

## Nav / tab urgency (US-28) — chrome only

Worst-wins fleet urgency on the **Vehicles** sidebar item (web) and **Vehicles** tab (mobile Owner/Admin). **Not** painted on list rows, date cells, form badges, or side-image slots.

| Band | When | Chrome |
| --- | --- | --- |
| Red | Any company section `daysUntil < 7` (incl. overdue) | `navItemUrgencyCritical` / `tabItemUrgencyCritical` |
| Orange | No red; any section `daysUntil = 7` | `navItemUrgencySoon` / `tabItemUrgencySoon` |
| None | Else | Base nav/tab only |

Full state matrix, selected+urgency stacking, contrast, and accessible names: [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking). List/detail stay on the **30-day** badge window (A1); nav uses the **7-day / exact-7** bands (A20).

## States

| State | UI |
| --- | --- |
| Driver create / image manage | Denied; no vehicle created; no image UI → [denied.md](denied.md) |
| Other company edit / images | Denied; vehicle and images unchanged |
| Validation (fields) | BA Q6 open — all listed fields shown; empty dates mean no warning |
| Side image validation | Per-side only (table above); vehicle field save still allowed with empty sides |
| Partial sides | Filled sides show preview; empty sides stay empty (US-35) |

## Token usage

| Role | Class |
| --- | --- |
| Table | `tableWrap` `tableHeader` `tableCell` `tableCellNum` `tableCellLink` `tableCellMutedilled` `vehicleSideFrameFocus` `vehicleSideFrameError` `vehicleSidePreview` `vehicleSideActions` |
| Side actions | `buttonSecondary` `buttonGhost` `buttonDisabled` `buttonFocus` |
| Side viewer | `vehicleSideViewerOverlay` `vehicleSideViewerOverlayMobile` `vehicleSideViewerDialog` `vehicleSideViewerScreen` `vehicleSideViewerToolbar` `vehicleSideViewerTitle` `vehicleSideViewerZoomGroup` `vehicleSideViewerStage` `vehicleSideViewerImage` `vehicleSideViewerClose` `vehicleSideViewerZoomIn` `vehicleSideViewerZoomOut` |
| Side errors | `errorText` (+ optional page `bannerDanger` / `bannerWarning`) |
| List presence (Should) | `vehicleSidePresence` `vehicleSidePresenceIcon` — **unchanged** by US-41–US-44 |
| Loading | `skeleton` |
| Spacing tokens | `vehicle-side-slot` **176px**; `vehicle-side-grid-max` **400px**; `vehicle-side-viewer-toolbar` **56px** |
| Zoom tokens | `motion.vehicle-side-zoom` min **1** / max **3** / step **0.5** / default **1** |

## A11y

| Control | Name |
| --- | --- |
| Screen (list) | Vehicles |
| Screen (create) | Add vehicle |
| Screen (edit) | Edit vehicle |
| Add | Add vehicle |
| Row (no photos) | {Make} {Model}, {plate}, {date name} expired \| due soon |
| Row (has photos, Should) | {Make} {Model}, {plate}, has photos, {date name} expired \| due soon |
| List presence chip | Photos (decorative icon hidden) |
| Make | Make |
| Model | Model |
| Save | Save vehicle |
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
- Side Add/Replace/Clear/View and frames ≥ 44pt hits; focus `vehicleSideFrameFocus` / `buttonFocus`.
- **Viewer (web):** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title. **Focus trap** while open; initial focus **Close** (or dialog). On dismiss, return focus to the **filled frame** (or View) that opened it.
- **Viewer (mobile):** modal/accessibilityViewIsModal (or equivalent) so VO stays in viewer; dismiss returns focus/accessibility to the slot trigger.
- Backdrop is dismissive but not the only path — visible Close always present.
- Zoom not gesture-only: +/− always available and named.
- Do not clip labels; wrap badges and presence chip on mobile.
- Edit: fields keep visible labels; prepopulated values and image previews are the accessible value, not a second unlabeled string.
- List primary identity is one string (`Make Model`); form exposes Make and Model as separate labeled controls.
- Live regions: optional polite announce on per-side upload/clear success is fine; optional polite zoom percent; do not spam on every poll.
- Reduce-motion: no shimmer pulse on skeleton; static `skeleton` fill; viewer open/zoom without spring
- Side Add/Replace/Clear and frames ≥ 44pt hits; focus `vehicleSideFrameFocus` / `buttonFocus`.
- Do not clip labels; wrap badges and presence chip on mobile.
- Edit: fields keep visible labels; prepopulated values and image previews are the accessible value, not a second unlabeled string.
- List primary identity is one string (`Make Model`); form exposes Make and Model as separate labeled controls.
- Live regions: optional polite announce on per-side upload/clear success is fine; do not spam on every poll.
- Reduce-motion: no shimmer pulse required on skeleton; static `skeleton` fill.
