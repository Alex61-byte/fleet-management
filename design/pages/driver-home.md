# Driver home (start)

**Stories:** US-10, US-14, **US-33**, **US-34**, **US-51–US-54**, **US-58–US-60**  
**Density:** Web compact content; mobile comfortable. **Both surfaces** after invite accept (or subsequent login).  
**Purpose:** Calm **post-auth start / hub**: identity, navigation to **Next travel** and **Vehicle handover**, sign out. Login and invite land here — **not** on the handover form. **No** fleet admin create/edit, **no** driver management, **no** create Admin, **no** Owner expiry inbox, **no** TOTP settings, **no** Owner/Admin chrome, **no** Owner/Admin Handovers history tab (E55).  
**Chrome:** Driver-only shell — see [_patterns.md](_patterns.md) **Driver shell (web + mobile)**.  
- **Mobile:** `appBarMobile` only — **no** tab bar, **no** sidebar.  
- **Web:** top driver header strip only — **no** Owner `sidebar`.  
**Handover shared spec:** [handover.md](handover.md) (fields, damage grid, validation, viewer). Task screens own forms; this page owns **start placement** and hub cues.

## Information architecture

| Route (web) | Route (mobile) | Role |
| --- | --- | --- |
| `/driver` | `/(driver)` | **Start / Home** — identity + hub links + Sign out |
| `/driver/travel` | `/(driver)/travel` | **Next travel** — vehicle + odometer form |
| `/driver/handover` | `/(driver)/handover` | **Handover Out/In** — form when next-travel exists; else CTA to travel |

Auth redirects (`sign-in`, invite accept, root) always go to **Start**, never directly to `/driver/handover` or `/(driver)/handover`.

## Layout — Start (Home)

### Mobile

```
Safe area
appBarMobile / pageTitleMobile Home
canvas contentPadComfortable gap-2
  panel (identity)
    overline Driver
    label {email}
    caption Choose what you need. Handover is not opened until you start it.
  nav aria-label Driver start
    hubLink Next travel
      label Next travel
      caption {summary or empty guidance}
      badge Selected | (chevron)
    hubLink Vehicle handover
      label Vehicle handover
      caption {guidance / Out open cue}
      badge Out open | Ready | (chevron)
  buttonSecondary Sign out
```

### Web

```
page (bg-canvas min-h-full)
driverAppBar title Home
contentPadCompact max-w-auth-card mx-auto flex flex-col gap-2
  panel identity (as mobile)
  nav hub links (panel-styled Link cards)
  buttonSecondary Sign out
```

**No** next-travel form and **no** handover form on Start. Status badges only (Selected / Ready / Out open).

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

## Next travel panel (task screen)

| Element | Token / control | Notes |
| --- | --- | --- |
| Title | `sectionTitle` | “Next travel” |
| Active summary | `label` + `caption` | Make Model; plate; odometer + unit |
| Vehicle | native select or radio list | Options: “{Make Model} · {plate}”; empty → emptyState sentence |
| Odometer | text/number input | Label “Odometer”; **hint** shows unit only (not a second control). Unit **not** editable |
| Unit | `caption` / field hint | “Miles” or “Kilometers” from selected vehicle country (US-34) |
| Primary | `buttonPrimary` | “Save selection” |
| Empty fleet | `body` | “No vehicles available. Ask your company to add a vehicle.” |
| Back | `buttonSecondary` | “Back to Home” |

Changing vehicle in the selector **updates the unit hint immediately**.

**Handover coupling:** Next-travel **Save selection** does **not** create a handover and does **not** write `vehicle.mileage` (A43 / US-59). Handover lives on its own route; hub may show **Ready** / **Out open** after travel is set.

## Handover panel (task screen; US-51–US-54, US-58–US-60)

Full field inventory, damage attach, validation copy, and viewer: **[handover.md](handover.md)**. Summary:

### Out vs In (what the driver sees)

| Situation | Cue | Title | Primary |
| --- | --- | --- | --- |
| Active next-travel; **no** open Out; driver/vehicle eligible | None (or calm `caption`) | **Handover Out** | `buttonPrimary` **Submit Handover Out** |
| Open **Out** on **this** driver + **this** active vehicle (US-60) | `bannerWarning`: “Out open — complete **Handover In** when you return the vehicle.” + optional `badgeNeutral` **Out open** | **Handover In** | `buttonPrimary` **Submit Handover In** |
| No active next-travel | Form omitted; CTA to Next travel | — | Go to Next travel |
| Blocked (already out elsewhere, wrong holder, no open Out for In, etc.) | `bannerDanger` with failure meaning (E45–E49) | Form disabled or omitted | No successful submit |

- **One** handover panel at a time — never Out and In forms stacked.
- Open-Out awareness is **not** color-only (banner text + optional badge text); hub card may also show **Out open**.
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

## States

| State | UI |
| --- | --- |
| Loading start | App bar real; skeleton identity + hub cards |
| Start default | Identity + hub links (no forms) + Sign out |
| Start, travel selected | Next travel badge **Selected**; handover **Ready** or **Out open** |
| Start, no travel | Handover card explains select travel first |
| Travel screen empty / form / error | As prior next-travel states |
| Handover screen no travel | CTA to Next travel only |
| Handover eligible Out / open Out / success | Per [handover.md](handover.md) |
| Offline | `bannerWarning`; primary actions disabled on task screens |
| Owner deep link | [denied.md](denied.md) |

## A11y

| Control | Name |
| --- | --- |
| Start screen | Home |
| Hub nav | Driver start |
| Hub Next travel | Next travel. {badge}. {description} |
| Hub Handover | Vehicle handover. {badge}. {description} |
| Travel screen | Next travel |
| Vehicle | Vehicle for next travel |
| Odometer | Odometer in {miles\|kilometres} |
| Save | Save selection |
| Handover screen | Handover |
| Handover panel | Handover Out \| Handover In |
| Open Out banner | Out open, complete Handover In when you return the vehicle |
| Mileage (handover) | Miles \| Kilometers (handover) |
| Next service days | Next service in days |
| Next service distance | Next service distance in {miles\|kilometres} |
| Damages | Damages, optional |
| Damage photos | Damage photos, optional, {n} of 10 |
| Add photos | Add damage photos |
| Submit Out | Submit Handover Out |
| Submit In | Submit Handover In |
| Back | Back to Home |
| Sign out | Sign out |

Unit must be in the odometer **and** handover mileage / next-service-distance accessible names/hints, not colour alone. Full damage thumb/viewer names: [handover.md](handover.md).

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
| Loading | `skeleton` |

No Owner table chrome. No third “Handovers history” surface on driver start.
