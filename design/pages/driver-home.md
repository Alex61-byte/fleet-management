# Driver home (start)

**Stories:** US-10, US-14, **US-33**, **US-34**, **US-51–US-54**, **US-58–US-60**, **US-61–US-67**, **US-110** (open-Out notify strengthen)  
**Density:** Web compact content; mobile comfortable. **Both surfaces** after invite accept (or subsequent login).  
**Purpose:** Calm **post-auth start / hub**: identity, navigation to **Next travel**, **Vehicle handover**, and **Daily usage**, sign out. Login and invite land here — **not** on handover or Daily usage forms. **No** fleet admin create/edit, **no** driver management, **no** create Admin, **no** Owner expiry inbox, **no** TOTP settings, **no** Owner/Admin chrome / notification bell, **no** Owner/Admin Handovers history tab (E55), **no** Owner Daily usage reporting (A65).  
**Chrome:** Driver-only shell — see [_patterns.md](_patterns.md) **Driver shell (web + mobile)**.  
- **Mobile:** `appBarMobile` only — **no** tab bar, **no** sidebar, **no** OA notification menu (US-109/US-111 N/A).  
- **Web:** top driver header strip only — **no** Owner `sidebar`, **no** Global Header bell.  
**Handover shared spec:** [handover.md](handover.md) (fields, damage grid, validation, viewer).  
**Daily usage shared spec:** [daily-usage.md](daily-usage.md) (create + own list, gate, offline).  
Task screens own forms; this page owns **start placement** and hub cues. Open-Out / need-In is **in-app only** (no push/email/SMS).

## Information architecture

| Route (web) | Route (mobile) | Role |
| --- | --- | --- |
| `/driver` | `/(driver)` | **Start / Home** — identity + hub links + Sign out |
| `/driver/travel` | `/(driver)/travel` | **Next travel** — vehicle + odometer form |
| `/driver/handover` | `/(driver)/handover` | **Handover Out/In** — form when next-travel exists; else CTA to travel |
| `/driver/daily-usage` | `/(driver)/daily-usage` | **Daily usage** — create + own list when next-travel exists; else CTA to travel |

Auth redirects (`sign-in`, invite accept, root) always go to **Start**, never directly to `/driver/handover`, `/driver/daily-usage`, or mobile equivalents (A67).

## Layout — Start (Home)

### Mobile

```
Safe area
appBarMobile / pageTitleMobile Home
canvas contentPadComfortable gap-2
  [when open Out for me] bannerWarning need-In (US-60 / US-110)
  panel (identity)
    overline Driver
    label {email}
    caption Choose what you need. Task screens open only when you start them.
  nav aria-label Driver start
    hubLink Next travel
      label Next travel
      caption {summary or empty guidance}
      badge Selected | (chevron)
    hubLink Vehicle handover
      label Vehicle handover
      caption {guidance / need-In cue}
      badge Out open | Ready | (chevron)
    hubLink Daily usage
      label Daily usage
      caption {guidance / ready cue}
      badge Ready | (chevron)
  buttonSecondary Sign out
```

### Web

```
page (bg-canvas min-h-full)
driverAppBar title Home
contentPadCompact max-w-auth-card mx-auto flex flex-col gap-2
  [when open Out for me] bannerWarning need-In
  panel identity (as mobile)
  nav hub links (panel-styled Link cards)
  buttonSecondary Sign out
```

**No** next-travel, handover, or Daily usage **forms** on Start. Status badges only (Selected / Ready / Out open). Daily usage does **not** use Out open.

### Open-Out / need-In cue (US-60 Must + US-110)

Visible on **Start** as soon as session lands (sign-in / invite) when **this** driver holds an open Out (In not done; not voided) on the active next-travel vehicle. **Not** another driver’s Out. **Not** OA header.

| Element | Spec |
| --- | --- |
| Page banner | `bannerWarning` **above** identity: “Out open — complete **Handover In** when you return the vehicle.” Optional trailing text control / whole-banner activate → `/driver/handover` (or mobile equiv.) |
| Hub card | Handover card: `badgeNeutral` **Out open** + caption “Need Handover In to close custody.” (text + badge — not color-only) |
| Cleared | After successful In or voided Out: banner **absent**; hub returns to **Ready** or travel-first guidance |
| No open Out | No banner; eligible hub shows **Ready** / chevron only |
| Reduce-motion | No pulse/shine on banner or badge |

Banner + hub badge **together** strengthen awareness (Must); either alone is insufficient if the other fits the layout — **require both** when open Out.

## Layout — Next travel screen

```
Back to Home (buttonSecondary / link)
panel Next travel
  sectionTitle Next travel
  [active summary or empty copy]
  Field Vehicle
  Field Odometer — unit locked from country
  buttonPrimary Save selection | Update selection
```

Same field inventory as before (US-33/34). Does **not** auto-open handover after save.

## Layout — Handover screen

```
Back to Home
[if no next-travel]
  panel: body Select next travel first…
  buttonPrimary Go to Next travel
[else]
  handover panel per [handover.md](handover.md)
```

## Layout — Daily usage screen

```
Back to Home
[if no next-travel]
  panel: body Select next travel first before logging daily usage.
  buttonPrimary Go to Next travel
  [optional] own list read-only if rows exist
[else]
  create + own list per [daily-usage.md](daily-usage.md)
```

Not auto-opened after login or after saving next-travel. Independent of open Out (rule 100).

## Next travel panel (task screen)

| Element | Token / control | Notes |
| --- | --- | --- |
| Title | `sectionTitle` | “Next travel” |
| Active summary | `label` + `caption` | Make Model; plate; odometer + unit |
| Vehicle | native select or radio list | Options: “{Make Model} · {plate}”; empty → emptyState sentence |
| Odometer | text/number input | Label “Odometer”; **hint** shows unit only (not a second control). Unit **not** editable |
| Unit | `caption` / field hint | “Miles” or “Kilometers” from selected vehicle country (US-34) |
| Floor caption | `caption` (optional Should) | When selected vehicle’s `vehicle.mileage` known: “Must be at least {n} {mi\|km}.” — same calm pattern as [handover.md](handover.md) monotonic floor |
| Primary | `buttonPrimary` | “Save selection” |
| Empty fleet | `body` | “No vehicles available. Ask your company to add a vehicle.” |
| Back | `buttonSecondary` | “Back to Home” |

Changing vehicle in the selector **updates the unit hint immediately** (and floor caption when applicable).

**Mileage write-through:** Successful next-travel **Save selection** / **Update selection** writes the odometer through to `vehicle.mileage` so Owner/Admin list and detail show the new reading. **Does not** create a handover (A43 / US-59). Handover remains its own route and still writes through on submit; Daily usage does **not** write through. Hub may show **Ready** / **Out open** after travel is set.

## Handover panel (task screen; US-51–US-54, US-58–US-60, US-110)

Full field inventory, damage attach, validation copy, and viewer: **[handover.md](handover.md)**. Summary:

### Out vs In (what the driver sees)

| Situation | Cue | Title | Primary |
| --- | --- | --- | --- |
| Active next-travel; **no** open Out; driver/vehicle eligible | None (or calm `caption`) | **Handover Out** | `buttonPrimary` **Submit Handover Out** |
| Open **Out** on **this** driver + **this** active vehicle (US-60 / US-110) | `bannerWarning` need-In copy + `badgeNeutral` **Out open** on title row | **Handover In** | `buttonPrimary` **Submit Handover In** |
| No active next-travel | Form omitted; CTA to Next travel | — | Go to Next travel |
| Blocked (already out elsewhere, wrong holder, no open Out for In, etc.) | `bannerDanger` with failure meaning (E45–E49) | Form disabled or omitted | No successful submit |

- **One** handover panel at a time — never Out and In forms stacked.
- Open-Out awareness is **not** color-only (banner text + badge text); Start hub **and** handover entry both show the cue (US-110).
- Owner/Admin **never** see this panel on driver start (different role shell).

### Field strip (both Out and In)

| Field | Required | Label pattern |
| --- | --- | --- |
| Mileage | Yes | **Miles** or **Kilometers** (country; no picker) |
| Next service (days) | Yes | **Next service (days)** — integer ≥ 1 |
| Next service distance | Yes | **Next service (Miles\|Kilometers)** |
| Damages | No | **Damages** textarea |
| Damage photos | No | Up to **10**, image types, ≤ **5 MB**; `handoverDamageGrid` thumbs; tap → simplified viewer |

### Image attach

- `buttonSecondary` **Add photos**; per-thumb remove **before** submit only.
- At 10: Add `buttonDisabled`; caption “Maximum 10 photos.”
- Errors scoped under grid (`errorText`); fail closed on storage (E58) → `bannerDanger`, no partial handover.
- Enlarge: reuse `vehicleSideViewer*` with title **Damage photo {n} of {m}** — view-only.

### Validation

| Fault | UI |
| --- | --- |
| Missing required | Field `inputError` + `errorText`; no row (E50) |
| Mileage / distance decimal or negative; days not int ≥ 1 | Field errors (E51/E52) |
| Mileage below vehicle or Out floor | Field or banner (E51) |
| Non-image / >5 MB / >10 | Attach rejected (E53); handover not created for that fault set |
| Offline | `bannerWarning`; Submit + Add disabled |

## Daily usage hub (US-61–US-67)

Full field inventory, list, validation, gated/offline states: **[daily-usage.md](daily-usage.md)**.

| Hub card | Caption / badge |
| --- | --- |
| No next-travel | Caption: select next travel first; chevron only (no Ready) |
| Next-travel active | Caption: log places and distances for the selected vehicle; **Should** `badgeNeutral` **Ready** |
| Offline on start | No special hub lock; task screen disables submit |

Daily usage hub never shows **Out open** (that cue is handover-only).

## States

| State | UI |
| --- | --- |
| Loading start | App bar real; skeleton identity + hub cards |
| Start default | Identity + hub links (no forms) + Sign out |
| Start, open Out (me) | `bannerWarning` need-In + handover hub **Out open**; visible after sign-in without OA chrome |
| Start, travel selected | Next travel badge **Selected**; handover **Ready** or **Out open**; Daily usage **Ready** (Should) |
| Start, Out cleared | Banner gone; hub not **Out open** |
| Start, no travel | Handover + Daily usage cards explain select travel first |
| Travel screen empty / form / error | As prior next-travel states |
| Handover screen no travel | CTA to Next travel only |
| Handover eligible Out / open Out / success | Per [handover.md](handover.md) |
| Daily usage screen no travel | CTA to Next travel; optional own list |
| Daily usage eligible / list / offline | Per [daily-usage.md](daily-usage.md) |
| Offline | `bannerWarning`; primary actions disabled on task screens |
| Owner deep link | [denied.md](denied.md) |

## A11y

| Control | Name |
| --- | --- |
| Start screen | Home |
| Hub nav | Driver start |
| Hub Next travel | Next travel. {badge}. {description} |
| Hub Handover | Vehicle handover. {Out open\|Ready}. {description} |
| Open-Out banner | Out open, complete Handover In when you return the vehicle |
| Hub Daily usage | Daily usage. {badge}. {description} |
| Travel screen | Next travel |
| Vehicle | Vehicle for next travel |
| Odometer | Odometer in {miles\|kilometres} |
| Save | Save selection |
| Handover screen | Handover |
| Handover panel | Handover Out \| Handover In |
| Mileage (handover) | Miles \| Kilometers (handover) |
| Next service days | Next service in days |
| Next service distance | Next service distance in {miles\|kilometres} |
| Damages | Damages, optional |
| Damage photos | Damage photos, optional, {n} of 10 |
| Add photos | Add damage photos |
| Submit Out | Submit Handover Out |
| Submit In | Submit Handover In |
| Daily usage screen | Daily usage |
| Daily usage submit | Submit daily usage |
| Back | Back to Home |
| Sign out | Sign out |

Unit must be in the odometer, handover mileage / next-service-distance, **and** Daily usage start/end distance accessible names/hints, not colour alone. Full damage thumb/viewer names: [handover.md](handover.md). Full Daily usage field names: [daily-usage.md](daily-usage.md).

## Token usage

| Role | Class |
| --- | --- |
| Hub card | `panel` (link/pressable) |
| Panel | `panel` |
| Open cue | `bannerWarning` `badgeNeutral` |
| Fields / errors | `input` `inputError` `errorText` `bannerDanger` |
| Actions | `buttonPrimary` `buttonSecondary` `buttonDisabled` `buttonIcon` |
| Damage | `handoverDamageGrid` `handoverDamageThumb` `handoverDamageThumbFocus` `handoverDamageThumbRemove` |
| Viewer | `vehicleSideViewer*` (reuse from vehicles) |
| Daily usage list | `tableWrap` / `listRow` `emptyState` (task screen) |
| Loading | `skeleton` |

No Owner table chrome on start. No Owner “Handovers history” or Daily usage reporting on driver start.
