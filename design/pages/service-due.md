# Service due

**Stories:** US-97 (Must); approaching window aligned with US-109; **US-116–US-118** (closed Daily usage progress)  
**Rules:** service board + **183–190** (API remaining; A62 held)  
**Surfaces:** Owner/Admin web + mobile (Company + Individual own vehicles)  
**Chrome:** OA shell + [global-header.md](global-header.md); `pageHeader` under Global Header  
**Purpose:** Board of vehicles with handover next-service baseline that are **due/overdue** or **approaching** by remaining distance/days.  
**Out of scope:** Push/email UI; rows without baseline; driver board; cross-tenant data; **client remaining-service math**; writing `vehicle.mileage` from Daily usage.

Reuse [_patterns.md](_patterns.md). **No hex** — semantic tokens / `themeClasses` only. **No new screens** this slice.

## Data source (Must — US-116–US-118)

| Rule | UI implication |
| --- | --- |
| API-only math (187, A139) | Display `days_elapsed`, `distance_remaining`, `due_by_days`, `due_by_distance`, `service_status` (or equivalent) **from the service-due API** only — format/units allowed; **no** FE formula from handover + mileage + usage rows |
| Progress odometer includes closed Daily usage `end_distance` when best (184) | Board may show distance remaining even if `vehicle.mileage` is null/lower — still **API fields**, not client max() |
| Days `as_of` may include closed `usage_date` (185) | Reason text uses API days/due flags; do not recompute from local calendar + usage list |
| Baseline still latest non-voided handover (188) | Usage alone never invents a row; omit without baseline |
| A62 held | No copy that Daily usage updated fleet mileage; remaining can still move via API progress |
| Individual Owner | Company-driver Daily usage progress N/A this slice; existing own-vehicle baseline behavior unchanged |
| Same semantics as notification `service` items | [global-header.md](global-header.md) — one authority, two surfaces |

## Eligibility

| Bucket | Condition (API semantics) | Treatment |
| --- | --- | --- |
| **Due / overdue** | API `due_by_days` and/or `due_by_distance` / `service_status` due (days elapsed ≥ interval **or** `distance_remaining ≤ 0` when progress usable) | Primary urgency; listed even if also ≤2000 remaining |
| **Approaching** | API: `0 < distance_remaining ≤ 2000` (unit from vehicle country) **and** not yet due by days or distance | Distinct from due/overdue |
| **Omit** | No handover baseline; or `distance_remaining` null / `> 2000` and not due by days | Not listed |

One row per vehicle. **Due wins** over approaching when both would apply. Approaching never hides due/overdue.

**Sort (urgency-first):** due/overdue first (both reasons → distance → days; then most overdue / least remaining), then approaching by smallest `distance_remaining`, stable plate/id. Sort keys come from **API values**, not client recompute.

## Layout

```
pageHeader  Service due
canvas
  list | table rows
```

### Row inventory

| Slot | Content | Token / class |
| --- | --- | --- |
| Primary | `{Make} {Model}` | `label` `text-text-primary` |
| Secondary | Plate | `caption` `text-text-secondary` |
| Status | Badge **plus** text | see Status |
| Reason | Days and/or distance | `caption` `font-tabular` |
| Interval | `{days}d · {n} {mi\|km}` baseline | `caption` muted |
| Hit | Whole row → vehicle detail | `min-h-list-row` / `min-h-table-row`; focus `shadow-ring` |

### Status chrome

| State | Badge | Text | Reason examples |
| --- | --- | --- | --- |
| Due / overdue | `badgeExpired` | **Due** or **Overdue** (prefer **Overdue** past threshold) | “Overdue by days”; “Due by distance (0 mi left)”; both if needed |
| Approaching | `badgeWarning` | **Approaching** | “{n} {mi\|km} remaining” with `n` in (0, 2000] |

Unit from vehicle country (Miles/Kilometers or mi/km in dense cells). **No** unit picker. **No** new badge token — reuse `badgeExpired` / `badgeWarning` + text (not color-only).

## States

| State | UI |
| --- | --- |
| **Loading** | Title real; 4–6 `skeleton` rows |
| **Empty** | `emptyState`: “No vehicles need service.” / “None are due, overdue, or within 2,000 remaining of next service.” |
| **Populated** | Sorted rows → vehicle; reasons from API only |
| **Error** | `bannerDanger` + **Try again** |
| **Offline** | `bannerWarning` “You are offline.” |
| **Denied** | [denied.md](denied.md) |

**States matrix:** unchanged (loading/empty/populated/error/offline/denied). US-116–118 changes **data authority** only — same chrome and buckets.

## A11y

| Control | Name |
| --- | --- |
| Page | Service due |
| Row | `{Make} {Model}, {plate}, {Due\|Overdue\|Approaching}, {reason with unit}` |
| Status | Badge text + reason — never color alone |
| Hits | ≥ 44pt; reduce-motion: no badge pulse |

## Tokens

`pageHeader`, `badgeExpired`, `badgeWarning`, `label`, `caption`, `font-tabular`, `bannerDanger`, `bannerWarning`, `emptyState`, `skeleton`. **No new semantic colors.**

## Related

- Menu **service** items: [global-header.md](global-header.md)  
- Baseline: [handover.md](handover.md)  
- EOD trigger (no driver counters): [daily-usage.md](daily-usage.md)  
