# ADR-015 — Vehicle handovers (Out / In), damage images, mileage write-through

**Status:** Accepted  
**Slice:** US-51–US-60 · rules 72–86 · A45–A56 · E45–E58  
**Extends:** ADR-001 Fleet · ADR-012 next-travel eligibility · ADR-013 object storage · ADR-014 vehicle mileage · ADR-008 driver hard-delete (void open Out)  
**Supersedes:** n/a

## Context

Drivers record **Handover Out** (take custody) and **Handover In** (return) against their **active next-travel** vehicle, with required service/mileage fields and optional damage text/images. Owner/Admin need **read-only history** on the vehicle. Successful handovers **write through** to `vehicles.mileage`. Travel PUT also write-throughs odometer → mileage (ADR-014 / A43). Open Out must not strand a vehicle when the driver is hard-deleted (rule 85).

## Decision

### 1. Ownership

| | |
| --- | --- |
| **Module** | **Fleet** (tables, routes, storage, mileage write-through) |
| **Identity** | On driver hard-delete: revoke sessions (ADR-008) **and** call Fleet to **void** that driver’s open Out handovers in the same request path (in-process; no bus) |
| **Clients** | Never hold storage credentials; never invent open-Out rules |

### 2. Domain model

- **Out** — starts custody; `status=open` until In or void.
- **In** — closes custody; always created `status=closed`; links to the open Out via `handover_out_id`.
- **Voided** — open Out cancelled (driver hard-delete); vehicle may accept a new Out; no In on voided Out.
- **Pairing:** `in.handover_out_id → out.id`. On successful In: set Out `status=closed`, `closed_at=now()`.
- **No edit/delete** HTTP for handovers this slice (E57). Close only via In; void only via hard-delete.

### 3. Eligibility & invariants (server-enforced)

| Rule | Enforcement |
| --- | --- |
| Creator | Driver role, usable password / full session (not Owner/Admin) |
| Vehicle | Driver’s **active** `driver_travel_selections` vehicle, same `company_id` |
| Out | No open Out on vehicle; no open Out for driver (any vehicle) |
| In | Open Out exists on that vehicle **and** `driver_id` = caller |
| Required | `mileage`, `next_service_days`, `next_service_distance` |
| Optional | `damages_text`; ≤10 damage images |
| Units | `mileage_unit` and `next_service_distance_unit` derived from vehicle country (A34); store **value + unit** at write; reject client unit fields |
| Mileage parse | ≥ 0, max 1 decimal (same family as odometer/mileage parsers) |
| Monotonic | If `vehicles.mileage` set → handover mileage ≥ it; In → mileage ≥ paired Out mileage |
| next_service_days | integer ≥ 1 |
| next_service_distance | ≥ 0, max 1 decimal |
| Images | Magic `image/*` only; ≤5 MB each; ≤10; not side slots / not compliance docs |

### 4. Mileage write-through (ADR-014 interaction)

| Path | Updates `vehicles.mileage`? |
| --- | --- |
| Successful handover Out or In | **Yes** — set to handover mileage (A52) |
| `PUT /v1/driver/travel` | **Yes** — set to travel odometer (ADR-014 / A43) |
| Owner/Admin `POST/PATCH /v1/vehicles` | **Yes** — existing optional master edit (unchanged) |
| Daily usage create | **No** (A62 / ADR-016) |

### 5. HTTP shape

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/driver/handovers/active` | Driver | Open Out for caller or `null` (+ vehicle summary) |
| `POST` | `/v1/driver/handovers` | Driver | Create Out or In — **multipart** (fields + optional `damages` files) |
| `GET` | `/v1/handovers/open` | Company Owner/Admin | Company-wide **open** Outs only (US-111); Individual → 403 |
| `GET` | `/v1/vehicles/:id/handovers` | Owner/Admin | List newest first |
| `GET` | `/v1/vehicles/:id/handovers/:handoverId` | Owner/Admin | Detail + signed damage image URLs |

- **No** vehicle id on create body: always active next-travel vehicle (E45 if none).
- **No** PATCH/DELETE handover or post-create image routes.
- Prefer **single multipart create** so E58 fail-closed is one atomic API outcome.

### 6. Object storage (ADR-013 pattern)

| | |
| --- | --- |
| Port | Same `VehicleImageStorage` / `OBJECT_STORAGE_*` S3 gateway |
| Bucket | Same private bucket (e.g. `vehicle-images`) |
| Object key | `{company_id}/{vehicle_id}/handovers/{handover_id}/{image_id}.{ext}` |
| DB | Paths only on `vehicle_handover_images`; signed GET on Owner/Admin **detail** (TTL ~1h) |
| Failure | If any submitted image cannot be stored → **no** handover commit; best-effort delete any keys already put; **503** `storage_unavailable` (E58) |
| Side images | Unrelated namespace (`…/{side}.{ext}`); handover images never fill FRONT/LEFT/RIGHT/BACK |

### 7. Persistence

Tables `vehicle_handovers` and `vehicle_handover_images` with partial unique indexes:
- one open Out per vehicle
- one open Out per driver (where driver_id IS NOT NULL)

**Hard-delete:** void open Outs for that driver (`status=voided`, `voided_at=now()`). Retain closed/voided history; `driver_id` may become NULL via `ON DELETE SET NULL`.

### 8. Authz summary

| Actor | Create | Active own Out | Vehicle history list/detail |
| --- | --- | --- | --- |
| Driver | Yes | Yes | **403** (E55) |
| Owner/Admin | **403** (E54) | **403** | Yes, same company |
| Other company | — | — | **404** (E56) |

## Consequences

- Backend implements schema, multipart parse, storage, codes E45–E58, hard-delete void hook, tests.
- Frontend: driver Out/In + active cue (web/mobile); Owner/Admin third tab list/detail after API exists.
- ADR-014 remains authoritative that **travel does not** set mileage; this ADR adds the **handover** write path.
- Contract: [http-v1.md](../contracts/http-v1.md) handovers section.

## Revisit when

BA allows post-submit damage add/remove, multi-open custody, GPS trip binding, or denormalized driver snapshot on history after delete.
