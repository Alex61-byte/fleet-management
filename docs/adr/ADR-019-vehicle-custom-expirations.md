# ADR-019 — Vehicle custom expirations

**Status:** Accepted  
**Slice:** US-86–US-90 · rules 129–145 · design/pages/vehicles.md Custom expirations

## Context

Owner/Admin (Company and Individual) need optional **labeled** expiration dates on the vehicle **Details** record beyond insurance / inspection / road tax / registration. Same 30-day A1 warnings as built-in warnable dates. Cap 10 rows per vehicle. List badges, nav urgency, and notification menu inclusion are client-derived from Vehicle JSON.

## Decision

| | |
| --- | --- |
| **Storage** | `vehicles.custom_expirations` JSONB `NOT NULL DEFAULT '[]'`. In-memory `Vehicle.customExpirations: { id, label, expiresOn }[]`. |
| **API shape** | Always on Vehicle reads: `custom_expirations: { id, label, expires_on }[]` (min `[]`). |
| **Write** | POST/PATCH optional `custom_expirations`. **Present = full replace** of the array. **Omit on PATCH = unchanged.** **`[]` = clear all.** Item write: `{ id?: string\|null, label: string, expires_on: string }`. Server **mints UUID** when `id` omitted or null. |
| **Warnings** | Derived on read. Field `custom:<uuid>` with `state` `expired` \| `due_soon` using **same** UTC calendar window as ADR-004 (A1, 30 days). **`registration_on` still never warns.** |
| **Validation** | 400 `validation_error`: not an array; >10 items; empty/whitespace label or label after trim not 1–80; duplicate labels case-insensitive after trim; missing/non-`YYYY-MM-DD` `expires_on`; bad or duplicate ids in payload. |
| **Authz** | Same as vehicle write: Owner/Admin company + Individual Owner. Driver **403**. No new routes. |
| **Images / Handovers / Drivers** | **No-op** this slice. |

## Consequences

- Clients must send the **full** desired list on each save that touches customs (including retained rows with their `id`s).
- `GET /v1/vehicles?expiring=true` and home expiring include vehicles whose **only** warnings are custom.
- SDK: widen warning field; resolve custom labels for a11y/notifications; `vehiclesNavUrgency` includes each custom `expires_on` (US-89 Should).

## Alternatives rejected

- Sub-resource ` /vehicles/:id/custom-expirations` — extra routes for a 10-row embed; rejected for this slice.
- Partial PATCH merge by id — harder client model; BA/design treat section as one form save.
- Separate warning table — stale flags; keep derived-on-read.

## Amendment note

Extends [ADR-004](ADR-004-compliance-dates.md) warning set with `custom:<id>` only. Does not change registration behavior.
