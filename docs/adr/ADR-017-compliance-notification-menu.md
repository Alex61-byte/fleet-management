# ADR-017 — Owner/Admin compliance notification menu (client-derived)

**Status:** Accepted  
**Slice:** US-68–US-76 · rules 101–116 · OA Global Header  
**Extends:** ADR-001 · ADR-004 (compliance warnings) · ADR-005 (role shells)  
**Supersedes:** n/a

## Context

Owner/Admin need a **Global Header** notification control listing company compliance issues (insurance / inspection / road tax within 30 days or past), badge when any exist, navigate to vehicle, cap **50** items. Drivers must not see it.

Server already computes per-vehicle `warnings[]` on Fleet reads (ADR-004). US-28 Vehicles nav urgency is already **client-derived** from `GET /v1/vehicles` + SDK helpers — not a separate HTTP resource.

## Decision

### 1. No notifications HTTP resource

- **Do not** add `GET /v1/notifications` (or equivalent) in this slice.
- **HTTP `/v1` surface unchanged** for this feature.
- Inclusion authority remains **`Vehicle.warnings`** from existing list/detail/home reads.

### 2. Client projection contract (`@fleet/sdk`)

Pure function over `Vehicle[]` (or minimal section + warnings shape):

1. For each vehicle, for each `warnings[]` entry with `field ∈ {insurance_on, inspection_on, road_tax_on}`:
   - Build one **item** with vehicle identity, `field`, `state`, `date_on = vehicle[field]`, `days_until = daysUntilUtc(date_on)`.
2. **Ignore** `registration_on` (never in API warnings; do not add).
3. Sort by `days_until` **ascending** (most overdue / soonest first); stable tie-break: `field` order insurance → inspection → road tax, then `license_plate`.
4. **Cap** at **50** items after sort.
5. **Badge:** show when projected `items.length > 0` (count digits + a11y name).

Do **not** re-apply the 30-day window for inclusion — that would fork ADR-004. Trust API `warnings`.

### 3. Data load

- Owner/Admin sessions: `GET /v1/vehicles` (same as US-28 chrome). Prefer one shared fetch/cache + existing vehicles-changed refresh.
- Drivers: no fetch for this chrome; no menu.

### 4. Shell ownership

| Surface | Owner |
| --- | --- |
| Web OA | `AppShell` **global header** — not driver shell |
| Mobile OA | `(owner)` layout / stack headers |
| Driver web/mobile | **No-op** |

Navigation target: existing vehicle detail/edit routes only.

### 5. Module ownership

| Layer | Responsibility |
| --- | --- |
| Fleet API | **No-op** this slice (warnings already on read) |
| `@fleet/sdk` | Pure project/sort/cap + a11y label |
| Web + mobile FE | Header UI, menu states, badge, navigation, OA-only gating |

## Alternatives

1. **`GET /v1/notifications`** — rejected for MVP: duplicate read model.
2. **`GET /v1/home` `expiring_vehicles` only** — rejected: couples menu to home, reduced DTO.
3. **Persist notification rows** — rejected: stale vs derived dates (ADR-004).

## Consequences

- FE ships shared SDK tests so web/mobile cannot drift.
- Backend Specialist: **no-op**. Frontend: SDK + both OA shells.
