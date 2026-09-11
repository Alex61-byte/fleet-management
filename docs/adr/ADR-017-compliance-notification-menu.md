# ADR-017 — Owner/Admin notification menu (hybrid projection)

**Status:** Accepted (amended US-109–US-111)  
**Slice:** US-68–US-76 · US-109–US-111 · rules 101–116 · 174–182 · OA Global Header  
**Extends:** ADR-001 · ADR-004 (compliance warnings) · ADR-005 (role shells) · ADR-015 · ADR-022  
**Supersedes:** n/a

## Context

Owner/Admin need a **Global Header** notification control: compliance (insurance / inspection / road tax within 30 days or past), **service** approaching/due, and **Company open Out** incomplete custody. Badge when any exist; navigate; cap **50**. Drivers must not see OA menu (US-60/110 driver cue only).

Server computes per-vehicle `warnings[]` (ADR-004), `GET /v1/service-due` (approaching ≤2000 + due), and `GET /v1/handovers/open` (Company open Outs).

## Decision

### 1. No notifications HTTP resource

- **Do not** add `GET /v1/notifications`.
- Menu is **client-projected** in `@fleet/sdk` from existing Fleet reads.

### 2. Hybrid projection contract (`@fleet/sdk`)

Merge then sort/cap:

1. **Compliance** — from `Vehicle[]` `warnings[]` (`insurance_on` | `inspection_on` | `road_tax_on`); ignore `registration_on`. Trust API window (do not re-apply 30 days).
2. **Service** — from `GET /v1/service-due` items; `section: "service"`; `service_status` `"due" | "approaching"`. **Do not** re-gate ≤2000 client-side (server authority).
3. **Open Out** — from `GET /v1/handovers/open` (Company only); `section: "open_out"`; vehicle + driver when known. Individual: do not call / ignore.
4. **Sort urgency-first:** due/overdue service and open_out and expired compliance before approaching/soon; stable field/plate ties.
5. **Cap 50** after sort. Badge when `items.length > 0`.

Optional doc-only constant: `SERVICE_APPROACHING_DISTANCE_REMAINING = 2000` (tests/docs; not client inclusion gate).

### 3. Data load

- OA: `GET /v1/vehicles` + `GET /v1/service-due` + (Company) `GET /v1/handovers/open`. Shared cache/refresh OK.
- Drivers: no OA menu fetch.

### 4. Shell ownership

| Surface | Owner |
| --- | --- |
| Web OA | `AppShell` global header |
| Mobile OA | `(owner)` layout / stack headers |
| Driver web/mobile | **No-op** OA menu; open-Out cue on driver home/handover |

Nav: compliance/service → vehicle (else `/service-due`); `open_out` → vehicle Handovers tab when present.

### 5. Module ownership

| Layer | Responsibility |
| --- | --- |
| Fleet API | `service_status` + approaching inclusion on service-due; `GET /v1/handovers/open` |
| `@fleet/sdk` | Merge/sort/cap + a11y label for mixed kinds |
| Web + mobile FE | Header UI, load three sources, OA-only gating |

## Alternatives

1. **`GET /v1/notifications`** — rejected: duplicate read model.
2. **Embed open_out on vehicles / service-due** — rejected: wrong aggregate; extra list payload.
3. **Client-only ≤2000 filter** — rejected: forks server board inclusion.
4. **Persist notification rows** — rejected: stale vs derived state.

## Consequences

- FE/SDK tests cover merge order and cap.
- Backend owns approaching threshold and open-Out company list; FE must not invent inclusion.
