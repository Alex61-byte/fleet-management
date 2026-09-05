# ADR-011 — Vehicle make and model

## Status
Accepted

## Context
Vehicle identity was a single free-text `car` field. Product now requires separate **Make** and **Model** (Admin free text, not a catalog).

## Decision
- API JSON uses `make` and `model` (snake_case); **`car` is removed**.
- POST `/v1/vehicles` requires non-empty trimmed `make`, `model`, and `license_plate` → else `400 validation_error`.
- PATCH may update any subset; omitted fields unchanged.
- Persistence: columns `make`, `model`; drop `car`.
- List/home display composition is client-side: `trim(make) + " " + trim(model)` (single space).
- No server-side manufacturer catalog.

## Consequences
- Clients and SDK must stop sending/reading `car`.
- Existing DBs need a one-shot migration (drop `car`, add `make`/`model`).
