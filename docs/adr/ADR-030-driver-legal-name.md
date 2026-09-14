# ADR-030 — Driver legal name gate (US-121)

## Status

Accepted

## Context

Drivers may lack legal names after email-only invite. Need a self-serve, non-dismissable gate parallel to company name (ADR-010 / `company_name_required`).

## Decision

- Store on `principals`: `first_name`, `last_name`, `second_last_name` — each `TEXT NOT NULL DEFAULT ''`.
- Required for drivers: trimmed `first_name` and `last_name` non-empty, max **80** each. `second_last_name` optional (empty allowed), max 80 when set.
- `GET /v1/me` exposes the three name fields + `driver_name_required` (`true` only when `role = driver` and required name(s) missing after trim). Non-drivers: names may be `null` or `""`; flag always `false`.
- Driver self-only `PATCH /v1/me/name` with `{ first_name, last_name, second_last_name? }` → **200** Me. Owner/Admin → **403** `forbidden`.
- Invite create remains **email-only**. OA roster name edit **out of scope**.
- FE: non-dismissable gate when `driver_name_required` (mirror company name prompt).

## Consequences

- Schema migrate ADD columns with default `''`.
- Authz on API only; no OA/driver-list contract change this slice.
