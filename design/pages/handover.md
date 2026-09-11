# Vehicle handovers (shared)

**Stories:** US-51–US-60, **US-110** (driver open-Out notify), **US-111** (OA menu `open_out` — see [global-header.md](global-header.md); no extra OA board this slice)  
**Rules:** 72–86; **A:** A45–A56; **E:** E45–E58  
**Surfaces:** Driver create Out/In — [driver-home.md](driver-home.md). Owner/Admin history + detail — [vehicles.md](vehicles.md) **Handovers** tab.  
**Density:** Driver web compact / mobile comfortable. Owner/Admin web compact table or list; mobile comfortable rows.  
**Purpose:** Record **Out** (custody start) and **In** (return) against the driver’s **active next-travel** vehicle; Owner/Admin review **immutable** history per vehicle.  
**Not in scope:** Edit/delete past handovers; unit picker; side-appearance slots; compliance docs; driver history tab; Owner/Admin create handover; OS push/email/SMS.

Reuse chrome from [_patterns.md](_patterns.md). **No hex** — classes from [tailwind.theme.ts](../tailwind.theme.ts). Prefer existing `panel`, `banner*`, `badge*`, `emptyState`, `vehicleFormTab*`, `buttonPrimary`, `errorText`, `skeleton`. Damage enlarge reuses a **simplified** side-image viewer (`vehicleSideViewer*`).

## Product rules (design must not contradict)

| Rule | UI implication |
| --- | --- |
| Out / In only | Type badge + form title; never a free-text “type” |
| Driver + active next-travel only for create | Form gated; no create on Owner vehicle page |
| Required: mileage, next_service_days, next_service_distance | Asterisk / required labels; block submit if empty |
| Damages text + images optional | No required mark; 0–10 images |
| Units from country | Label/hint Miles or Kilometers; **no** unit control |
| History Owner/Admin only | Third tab never on driver chrome |
| No edit/delete | Detail is read-only; no trash/edit affordances |
| Newest first | History sort fixed |

## Type chrome

| Type | Visible | Class | Notes |
| --- | --- | --- | --- |
| **Out** | Badge **Out** | `badgeNeutral` + text | Custody start; open until In |
| **In** | Badge **In** | `badgeOk` + text | Closes paired Out |
| Open Out (driver cue, US-60 / US-110) | Banner + badge | `bannerWarning` + `badgeNeutral` **Out open** | Not color-only; body says complete **Handover In**; same pattern on Start hub |

Do **not** invent `badgeOut` / `badgeIn` / `badgeOpenOut` tokens — reuse neutral / success / warning chips.

---

## Driver — Handover form (Out / In)

**Placement:** Dedicated **Handover** task route (`/driver/handover`, `/(driver)/handover`), opened from the driver **start** hub — not auto-shown on login. When no next-travel, show CTA to Next travel instead of the form. See [driver-home.md](driver-home.md).

### When the form appears

| Condition | UI |
| --- | --- |
| No active next-travel | No handover form. Optional calm `caption`: “Select a vehicle for next travel before handover.” |
| Active selection, **no** open Out (driver + vehicle eligible) | **Handover Out** panel + primary **Submit Handover Out** |
| Active selection, **open Out** held by **this** driver on that vehicle | **Required** open-Out / need-In cue + **Handover In** panel + primary **Submit Handover In** (US-110 entry point) |
| Open Out on another vehicle / blocked (E46/E47/E48/E49) | Form disabled or hidden; `bannerDanger` with failure meaning (no partial create); **no** “my” need-In banner for someone else’s Out |
| Loading eligibility | Skeleton handover panel |

### Open-Out banner (handover entry)

When this driver holds open Out on the bound vehicle, show **before** or as first child of the form panel (same copy as Start):

| | Spec |
| --- | --- |
| Chrome | `bannerWarning` |
| Copy | “Out open — complete **Handover In** when you return the vehicle.” |
| Title row | optional `badgeNeutral` **Out open** beside **Handover In** |
| Clear | After In success or void — banner and badge gone; mode returns to Out if eligible |
| A11y | Name: “Out open, complete Handover In when you return the vehicle”; not color-only |
| Motion | No pulse (reduce-motion safe) |

### Layout

```
panel handoverForm  aria-label Handover Out | Handover In
  [open Out for me] bannerWarning  Out open — complete Handover In when you return the vehicle.
  sectionTitle  Handover Out | Handover In   (+ badge Out open when In)
  caption  {Make Model} · {plate}   (bound to active next-travel; read-only)
  caption  Units: Miles | Kilometers   (from vehicle country; not editable)

  Field Mileage *          label = Miles | Kilometers (same pattern as vehicle mileage / odometer)
  Field Next service days *     integer ≥ 1
  Field Next service distance * label includes unit (Miles | Kilometers)
  Field Damages (optional)      multiline text
  Damage photos (optional)
    caption  Up to 10 images · image types only · max 5 MB each
    handoverDamageGrid
    buttonSecondary  Add photos   (disabled at 10)

  buttonPrimary  Submit Handover Out | Submit Handover In
```

### Fields

| Field | Control | Label / hint | Validation copy (inline `errorText` or form `bannerDanger`) |
| --- | --- | --- | --- |
| Mileage | number / decimal text | **Miles** or **Kilometers** (unit *is* the label, as vehicle Details mileage) | Required; “Enter a non-negative number with at most one decimal”; if below floor: “Mileage cannot be lower than the vehicle’s current reading” / In: “…lower than the Out mileage” (E51) |
| Next service days | integer text | **Next service (days)** | Required; “Enter a whole number of 1 or more” (E52) |
| Next service distance | number / decimal | **Next service (Miles\|Kilometers)** | Required; non-negative, ≤1 decimal (E52) |
| Damages | textarea | **Damages** (optional) | No required error; empty OK with or without images (A49) |
| Damage images | multi attach | **Damage photos** | See below |

**Units:** Derived from active vehicle country / payload unit (A34, A51). Changing next-travel vehicle updates unit labels immediately; **no** conversion of typed values. **No** unit picker.

**Monotonic floor (display only, optional Should):** When `vehicle.mileage` known, `caption` under mileage: “Must be at least {n} {mi\|km}.” On In, also respect Out mileage — prefer one calm caption with the **higher** floor if both apply; Architect/FE may supply a single `min_mileage` hint.

### Damage images (driver attach) — US-54

| | Spec |
| --- | --- |
| Max | **10** per handover submit |
| Types | Image only; reject non-image (E53) |
| Size | ≤ **5 MB** each (E53) |
| Storage | Object storage + refs on handover; **not** vehicle side FRONT/LEFT/RIGHT/BACK slots (A50, A56) |
| Optional | 0 images OK |
| Grid | `handoverDamageGrid` — wrap row of thumbs, `gap-1` |
| Thumb | `handoverDamageThumb` — **48×48** (`h-6 w-6`), sunken, `rounded-md`, cover crop |
| Remove before submit | Per-thumb `buttonIcon` clear (name “Remove damage photo {n}”) — **local only** until submit; not post-submit remove (E57) |
| Add | `buttonSecondary` **Add photos**; multi-select **Should** where OS allows; stop at 10 |
| At 10 | Add disabled; `caption` “Maximum 10 photos.” |
| Uploading | Thumbs show `skeleton` / busy; primary submit disabled while any attach in flight (avoid E58 partial) |
| Per-file error | That file dropped; `errorText` under grid: non-image / too large / storage fail; other files kept |
| Preview enlarge | Tap/activate thumb → **simplified** viewer (`vehicleSideViewer*`): title **Damage photo {n} of {m}**; zoom +/− same as side viewer; **no** replace/clear inside viewer; dismiss unchanged pending set |
| Fail closed | If submit cannot store submitted images → no handover row (E58); `bannerDanger` “Handover could not be saved. Try again.” |

**Do not** reuse the four-side `vehicleSideGrid` layout for damages (wrong metaphor). **Do not** open vehicle side-appearance manage UI from handover.

### Primary actions

| Mode | Primary | Busy | Success |
| --- | --- | --- | --- |
| Out | `buttonPrimary` **Submit Handover Out** | **Submitting…** | Calm success: panel switches to **In** cue/form (open Out); optional polite live region “Handover Out saved.” |
| In | `buttonPrimary` **Submit Handover In** | **Submitting…** | Open cue clears; Out form available if still eligible; “Handover In saved.” |

No secondary “Save draft.” Cancel = leave fields / navigate away (no partial server row).

### Driver form states

| State | UI |
| --- | --- |
| **Loading** | Skeleton inside handover `panel` (title + 3 field bones + actions) |
| **Eligible Out** | Out title + empty/defaults fields + Submit Out |
| **Open Out (In)** | `bannerWarning` need-In cue **required** + In title + `badgeNeutral` **Out open** + Submit In; summary may show open Out time if API provides; cue clears after In/void |
| **No next-travel** | Form omitted; next-travel empty copy only |
| **Blocked** (E45–E49) | `bannerDanger` + primary `buttonDisabled` or form hidden; no silent fail |
| **Validation** | Field `inputError` + `errorText`; focus first invalid; no row created (E50) |
| **Submitting** | Primary busy; inputs read-only/`buttonDisabled` |
| **Attach error** | Grid `errorText`; handover not submitted |
| **Server / storage error** | `bannerDanger`; prior open/closed custody unchanged |
| **Offline** | `bannerWarning` “You are offline.”; Submit + Add photos disabled |
| **Denied** (Owner path / unsigned) | No form → [denied.md](denied.md) (E54) |
| **Empty damages** | Valid |

### Driver a11y names

| Control | Name |
| --- | --- |
| Panel | Handover Out \| Handover In |
| Open cue | Out open, complete Handover In when you return the vehicle |
| Mileage | Miles \| Kilometers (handover) |
| Next service days | Next service in days |
| Next service distance | Next service distance in {miles\|kilometres} |
| Damages | Damages, optional |
| Damage grid | Damage photos, optional, {n} of 10 |
| Add photos | Add damage photos |
| Thumb | Damage photo {n}; activate to enlarge |
| Remove thumb | Remove damage photo {n} |
| Submit Out | Submit Handover Out |
| Submit In | Submit Handover In |
| Viewer | Damage photo {n} of {m}; Close photo viewer; Zoom in; Zoom out |

- Required fields announced required; errors not color-only.
- Unit in accessible name for mileage and next_service_distance.
- Hits ≥ 44pt; focus rings `inputFocus` / `buttonFocus` / `handoverDamageThumbFocus`.
- Reduce-motion: no pulse on open-Out banner; static skeleton.

---

## Owner/Admin — Handovers tab (history + detail)

**Placement:** Vehicle create/edit chrome — **third** tab after **Details** and **Images**. Spec continues in [vehicles.md](vehicles.md). Drivers: **no** tab (E55).

### Tab model (extends vehicle form tabs)

| Tab | Role | Save vehicle |
| --- | --- | --- |
| Details | Edit fields | Visible |
| Images | Side appearance | Visible |
| **Handovers** | Read-only history | **Hidden** — history is not part of vehicle field save |

Tab chrome: existing `vehicleFormTabList` / `vehicleFormTab` / `vehicleFormTabSelected` / `vehicleFormTabPanel`. Selected = bottom `border-brand` + semibold (not color-only). Label **Handovers**.

**Visibility:** Owner + Admin only, company vehicle only. Create mode (no vehicle id yet): tab **disabled** or omitted with `caption` “Save the vehicle to view handovers.” — prefer **omit** until vehicle exists.

### History list

**Sort:** Newest first (Must).

#### Web (compact)

```
vehicleFormTabPanel Handovers
  toolbar optional caption “{n} handovers” font-tabular
  tableWrap
    Type | When | Driver | Mileage | Service
```

| Column | Class | Content |
| --- | --- | --- |
| Type | badge + text | `badgeNeutral` **Out** / `badgeOk` **In** |
| When | `tableCellNum` | Timestamp (company/local display per existing date style); tabular |
| Driver | `tableCell` / muted if missing | Email or display identity; if unavailable after hard-delete: `caption` **Unavailable** |
| Mileage | `tableCellNum` | `{n} {km\|mi}` from stored unit |
| Service | `tableCellMuted` | `{days}d · {distance} {km\|mi}` short summary |

Row hover `tableRowHover`; whole row opens **detail** (not edit). No row actions menu. No delete.

#### Mobile (comfortable)

`listRow` per handover:

- Leading/primary: type badge + relative or short datetime  
- Secondary `caption`: driver · mileage + unit  
- Tertiary optional: service summary  
- Hairline divider; tap → detail  

### Empty / loading / error (history)

| State | UI |
| --- | --- |
| **Empty** | `emptyState` title **No handovers yet.** sentence **Out and In records for this vehicle will show up here.** No CTA to create (Owner cannot create) |
| **Loading** | Skeleton rows (table or list) inside tab panel |
| **Error** | `bannerDanger` + **Retry** |
| **Offline** | `bannerWarning`; list stale or empty + disabled retry polish |
| **Denied / other company** | [denied.md](denied.md); no leak of foreign rows (E56) |
| **Driver** | Tab absent (E55) |

### Detail view

**Web:** push panel **or** right-hand / centered **read-only** dialog using raised plane (`bg-surface-raised` `border-border` `rounded-lg` `shadow-overlay`) — same elevation family as side viewer, **not** a bottom sheet.  
**Mobile:** full-screen push or modal on `bg-canvas` (comfortable); back/close returns to list.

```
header  Close / Back
  title  Handover detail
  badge  Out | In
body gap-2
  label/caption pairs:
    When (created / recorded)
    Driver
    Vehicle context optional plate if not obvious
    Mileage + unit
    Next service (days)
    Next service distance + unit
    Damages text  (or caption “No damages noted.”)
  Damage photos
    empty → caption “No damage photos.”
    else handoverDamageGrid read-only thumbs → tap opens simplified viewer
```

| Rule | UI |
| --- | --- |
| Edit | **None** |
| Delete | **None** |
| Remove photo | **None** (E57) |
| Damages empty | Explicit empty caption — not a missing section hole |
| Images empty | Caption only |
| Driver gone | **Unavailable** — still show handover metrics |

### Detail states

| State | UI |
| --- | --- |
| Loading | Skeleton detail |
| Ready | Full read-only inventory |
| Image load fail | Thumb placeholder + viewer fail caption (side-viewer pattern); metadata still shown |
| Error load | `bannerDanger` + Back |
| Denied | [denied.md](denied.md) |

### Owner history / detail a11y

| Control | Name |
| --- | --- |
| Tab | Handovers |
| History table/list | Handover history |
| Row | {Out\|In}, {when}, {driver}, mileage {n} {unit} |
| Detail | Handover detail, {Out\|In} |
| Close detail | Close handover detail |
| Damage thumb | Damage photo {n}; activate to enlarge |
| Empty | No handovers yet |

---

## Damage image viewer (shared, simplified)

Reuse [vehicles.md](vehicles.md) **Side image viewer** chrome classes:

| | |
| --- | --- |
| Web | `vehicleSideViewerOverlay` + `vehicleSideViewerDialog` |
| Mobile | `vehicleSideViewerScreen` (full-screen; **not** clear-confirm sheet) |
| Title | **Damage photo {n} of {m}** (driver pending or Owner detail) |
| Zoom | +/− Must; same motion tokens; view-only |
| No | Replace, clear, download, crop, multi-select inside viewer |
| Dismiss | Close, Escape, backdrop (web), system back (mobile) → data unchanged |

Optional **Should:** prev/next control in toolbar when m > 1 — only if FE can keep 44pt hits without crowding; not required this slice.

---

## Token / class usage

| Role | Class / token |
| --- | --- |
| Panels / tabs | `panel` `vehicleFormTab*` `vehicleFormTabPanel` |
| Type | `badgeNeutral` `badgeOk` |
| Open Out cue | `bannerWarning` |
| Errors / offline | `bannerDanger` `bannerWarning` `errorText` `inputError` |
| Empty | `emptyState` |
| Actions | `buttonPrimary` `buttonSecondary` `buttonIcon` `buttonDisabled` `buttonFocus` |
| Damage grid | `handoverDamageGrid` `handoverDamageThumb` `handoverDamageThumbFocus` `handoverDamageThumbRemove` |
| Viewer | `vehicleSideViewer*` (reuse) |
| Loading | `skeleton` |
| Thumb size | spacing **`6`** (48px) — no new spacing token required |

**Theme additions (minimal):** only `handoverDamage*` in [tailwind.theme.ts](../tailwind.theme.ts). No new hex / semantic colors.

---

## What not to build

- Unit picker or dual-unit display toggles  
- Owner/Admin create/edit/delete handover  
- Driver Handovers history tab or other drivers’ history  
- Merging damage photos into FRONT/LEFT/RIGHT/BACK appearance slots  
- Post-submit photo remove  
- Color-only Out/In (badge text required)  
- FAB / marketing CTAs  
- Second visual system or hex in specs  
