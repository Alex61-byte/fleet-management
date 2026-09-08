# Daily usage (driver)

**Stories:** US-61–US-67  
**Rules:** 87–100; **A:** A57–A69; **E:** E59–E67  
**Surfaces:** Driver **web + mobile** only — create + **own** list. Entry from driver **start hub** ([driver-home.md](driver-home.md)).  
**Density:** Web compact (`contentPadCompact`, modest column); mobile comfortable (`contentPadComfortable`).  
**Chrome:** Driver shell only — [_patterns.md](_patterns.md). **No** Owner sidebar/tabs; **no** Owner/Admin Daily usage reporting this slice (A65, E64).  
**Purpose:** Log **day-use** of the driver’s **active next-travel** vehicle (places, distances, times). Distinct from handover custody and from next-travel selection (A57, rule 100).  
**Not in scope:** Edit/delete after create; GPS auto-fill; photos; unit picker; mileage write-through; Owner UI; auto-open on login.

Reuse existing classes only — [tailwind.theme.ts](../tailwind.theme.ts). Prefer `panel`, `banner*`, `badge*`, `emptyState`, `input` / `inputError` / `errorText`, `buttonPrimary` / `buttonSecondary` / `buttonDisabled`, `caption`, `label`, `sectionTitle`, `listRow` / `tableWrap`, `skeleton`. **No new hex. No new semantic color tokens.**

## Product rules (design must not contradict)

| Rule | UI implication |
| --- | --- |
| Active next-travel required to create (A58, E59) | Form gated; CTA to **Next travel** when missing — same pattern as handover |
| Seven fields all required (A59) | Required labels; block submit if empty (E61) |
| Units from vehicle country (A34, A60) | Distance labels/hints **Miles** or **Kilometers**; **no** unit control |
| end ≥ start distance; start ≥ `vehicle.mileage` when set (A61) | Inline validation; optional floor caption |
| end_time ≥ start_time same date (A63) | Inline validation (E63) |
| Default date = **today local** (A63) | Prefill Date on new form; editable |
| Multiple rows per day OK (A64) | List shows all; no “one per day” empty lock |
| Own list only, newest first (A65) | Driver list; no peer rows |
| No edit/delete (A66, E65) | List read-only rows; no row menus, trash, or edit affordances |
| No mileage write-through (A62) | No copy implying odometer/fleet mileage updates |
| Offline submit blocked (A68, E67) | `bannerWarning` + Submit disabled |
| Not handover (A57) | No Out/In badges, damage grid, or open-Out dependency |

## Routes

| Surface | Path | Role |
| --- | --- | --- |
| Web | `/driver/daily-usage` | Task screen: form (when eligible) + own list |
| Mobile | `/(driver)/daily-usage` | Same outcomes |

Align with existing `/driver/travel`, `/driver/handover` and mobile `/(driver)/travel`, `/(driver)/handover`. Auth redirects still land on **Start** — **never** auto-open Daily usage (A67, US-66).

---

## Layout

### Task screen (web)

```
page (bg-canvas min-h-full)
driverAppBar title Daily usage
contentPadCompact max-w-auth-card mx-auto flex flex-col gap-2
  buttonSecondary Back to Home
  [offline] bannerWarning You are offline.
  [no next-travel]
    panel gated
      sectionTitle Daily usage
      body Select next travel first before logging daily usage.
      buttonPrimary Go to Next travel
  [else]
    panel create  aria-label Log daily usage
      sectionTitle Log daily usage
      caption {Make Model} · {plate}   (bound next-travel; read-only)
      caption Units: Miles | Kilometers  (country; not editable)
      fields… (see inventory)
      buttonPrimary Submit daily usage
    panel list  aria-label Your daily usage
      sectionTitle Your entries
      [toolbar caption optional “{n} entries” font-tabular]
      list / table of own rows (newest first)
```

### Task screen (mobile)

```
Safe area
appBarMobile / pageTitleMobile Daily usage
contentPadComfortable gap-2
  buttonSecondary Back to Home
  …same gated | create + list stack as web…
```

**One create panel** when eligible — never stacked with a second “edit” form. List is always the driver’s own history on this screen (may be empty). **No** photos, map, or GPS controls.

### Hub entry (start only)

Spec lives on [driver-home.md](driver-home.md): third `hubLink` **Daily usage** (with Next travel and Vehicle handover). Calm **Ready** cue when next-travel active (**Should**); guidance when not. Not opened on login.

---

## When the form appears

| Condition | UI |
| --- | --- |
| No active next-travel | Form **omitted**. Gated `panel`: body guidance + `buttonPrimary` **Go to Next travel**. List may still load own past rows if any (read-only); if list also empty, gated panel is enough — do not invent a fake create. |
| Active next-travel | Create `panel` bound to that vehicle + unit captions + Submit |
| Loading eligibility / list | Skeleton create block and/or list rows; app bar real |
| Offline | `bannerWarning` “You are offline.”; **Submit** `buttonDisabled` (list may show cached/stale if already loaded — no new create) |
| Owner/Admin / unsigned deep link | No form → [denied.md](denied.md) (E60/E64) |
| Blocked / server deny on create | `bannerDanger` with failure meaning; no partial row |

---

## Field inventory (create)

All **required**. Single column stack inside create `panel`. Controls: native date/time where platform-appropriate; text/number otherwise. Classes: `label` + `input`; errors `inputError` + `errorText`.

| Field | Control | Label | Hint / default | Validation copy (`errorText` or form `bannerDanger`) |
| --- | --- | --- | --- | --- |
| Date | date | **Date** | Default **today** (local calendar). Editable. | Required; “Enter a valid date” (E61) |
| Start place | text | **Start place** | Free text; no map/GPS | Required; “Enter a start place” (E61) |
| Start distance | number / decimal text | **Start distance (Miles\|Kilometers)** | Unit **in label**; optional `caption` floor when mileage known | Required; “Enter a non-negative number with at most one decimal”; if end &lt; start handled on end; if below vehicle floor: “Start distance cannot be lower than the vehicle’s current reading” (E62) |
| Start time | time | **Start time** | Local wall-clock `HH:mm` on Date | Required; “Enter a start time” (E61) |
| End place | text | **End place** | Free text; no map/GPS | Required; “Enter an end place” (E61) |
| End distance | number / decimal text | **End distance (Miles\|Kilometers)** | Same unit as start; **no** picker | Required; non-negative ≤1 decimal; “End distance must be at least the start distance” when end &lt; start (E62) |
| End time | time | **End time** | Local wall-clock on same Date | Required; “End time must be at or after start time” (E63) |

**Units:** From active next-travel vehicle country (A34/A60). Changing next-travel on the travel screen updates unit labels the next time this screen loads/refreshes bound vehicle — **no** conversion of typed values. **No** unit picker.

**Mileage floor (Should):** When `vehicle.mileage` is set, calm `caption` under start distance: “Must be at least {n} {mi\|km}.” Does **not** claim Daily usage updates fleet mileage (A62).

**Not on form:** Damages, photos, Out/In type, odometer “save selection”, company fields.

### Primary action

| | Spec |
| --- | --- |
| Label | `buttonPrimary` **Submit daily usage** |
| Busy | **Submitting…**; inputs read-only / primary disabled |
| Success | Clear or reset form defaults (Date stays **today** local; other fields empty); new row appears at **top** of list; optional polite live region “Daily usage saved.” |
| No draft | No secondary Save draft. Leave = navigate away; no partial server row |
| Offline | Primary disabled (`buttonDisabled`) |
| Gated / denied | Primary absent or disabled |

---

## Own list

**Sort:** Newest first (Must). **Immutable** rows — tap does **not** open edit (no detail editor this slice). Optional read-only expand is **out**; keep rows summary-only.

### Web (compact)

Inside list `panel` / raised plane:

```
sectionTitle Your entries
caption optional {n} entries (tabular)
tableWrap (or stacked rows if column is narrow)
  Date | Start → End | Distance | Time
```

| Column | Class | Content |
| --- | --- | --- |
| Date | `tableCell` / tabular | `usage_date` local |
| Places | `tableCell` | `{start_place} → {end_place}` |
| Distance | `tableCellNum` | `{start}–{end} {mi\|km}` stored unit |
| Time | `tableCellNum` | `{start_time}–{end_time}` |

No row action menu. No delete. Hover `tableRowHover` optional; row is **not** an edit affordance (cursor default or neutral).

### Mobile (comfortable)

`listRow` per entry:

- Primary `label`: date · `{start_time}–{end_time}`
- Secondary `caption`: `{start_place} → {end_place}`
- Tertiary `caption`: `{start}–{end} {mi\|km}`
- Hairline `border-divider`; **no** chevron implying edit

### Empty / loading / error (list)

| State | UI |
| --- | --- |
| **Empty** (eligible, no rows) | `emptyState` title **No daily usage yet.** sentence **Submit a log for today’s trips on your selected vehicle.** No Owner CTA |
| **Empty** (gated, no rows) | Rely on gated panel; omit second emptyState or use short `caption` only — avoid double empty chrome |
| **Loading** | `skeleton` rows (3–5) in list region |
| **Error** | `bannerDanger` + **Retry** (`buttonSecondary`) |
| **Offline** | `bannerWarning` on screen; list stale OK; no submit |
| **Other driver’s data** | Never shown (E64) |

---

## States (screen matrix)

| State | UI |
| --- | --- |
| **Loading** | App bar “Daily usage”; skeleton create + list |
| **Gated** (no next-travel) | CTA panel → Next travel; list own rows if any |
| **Eligible default** | Create with Date=today; bound vehicle/unit captions; empty or populated list |
| **Validation** | Field `inputError` + `errorText`; focus first invalid; no row (E61–E63) |
| **Submitting** | Primary busy; fields locked |
| **Success** | List prepends row; form ready for another entry (multiplicity A64) |
| **Server error** | `bannerDanger`; list unchanged |
| **Offline** | `bannerWarning`; Submit disabled (E67) |
| **Denied** | [denied.md](denied.md) — no driver form chrome leak |
| **No edit/delete** | No affordances; attempts not offered (E65) |

---

## A11y

| Control | Accessible name |
| --- | --- |
| Screen | Daily usage |
| Back | Back to Home |
| Gated panel | Daily usage, select next travel first |
| Go to Next travel | Go to Next travel |
| Create panel | Log daily usage |
| Vehicle context | (caption; included in panel description if needed) |
| Date | Date |
| Start place | Start place |
| Start distance | Start distance in {miles\|kilometres} |
| Start time | Start time |
| End place | End place |
| End distance | End distance in {miles\|kilometres} |
| End time | End time |
| Floor caption | Must be at least {n} {miles\|kilometres} |
| Submit | Submit daily usage |
| List | Your daily usage |
| List row | Daily usage {date}, {start place} to {end place}, {start} to {end} {unit}, {start time} to {end time} |
| Offline banner | You are offline |
| Retry | Retry loading daily usage |

- Required fields announced required; errors **not** color-only (`errorText` + `inputError`).
- Unit in accessible **name** (and visible label) for both distance fields — not colour alone.
- Hits ≥ 44pt (`min-h-hit`); focus `inputFocus` / `buttonFocus`.
- Reduce-motion: static `skeleton`; no pulse on offline banner.
- Success live region polite, not assertive spam on every keystroke.
- Do not expose other drivers’ rows or Owner fleet chrome.

---

## Token / class usage

| Role | Class |
| --- | --- |
| Screen chrome | Driver app bar / `appBarMobile` / `pageTitle` · `pageTitleMobile` |
| Layout | `contentPadCompact` · `contentPadComfortable` · `gap-2` · `max-w-auth-card` (web column) |
| Surfaces | `panel` · `tableWrap` · `listRow` |
| Type | `sectionTitle` · `body` · `label` · `caption` · `overline` (if needed) |
| Fields | `input` · `inputHover` · `inputFocus` · `inputError` · `errorText` |
| Actions | `buttonPrimary` · `buttonSecondary` · `buttonDisabled` · `buttonFocus` |
| Feedback | `bannerWarning` · `bannerDanger` · `emptyState` · `skeleton` |
| List density | `tableCell` · `tableCellNum` · `tableRow` · `tableRowHover` (web); `listRow` (mobile) |
| Hub (start) | `panel` pressable/link + optional `badgeNeutral` **Ready** — see driver-home |

**No** `handoverDamage*`, **no** `vehicleSide*`, **no** Owner `vehicleFormTab*`, **no** new badge tokens.

---

## Engineering follow-ups (Design → Architect)

- Contracts: driver create + list-own Daily usage; authz driver-only; company + principal scope; reject edit/delete; gate on active next-travel; store distance **value + unit**; do **not** patch `vehicle.mileage`.
- Payload field names/types for the seven required fields; list sort newest-first; error codes aligned E59–E67.
- FE: routes above; reuse driver task chrome + form patterns from travel/handover; hub third link; offline banner shared pattern.
- **No** Owner Daily usage UI this slice; hard-delete driver removes rows is API/lifecycle (A69) — no extra driver chrome.
