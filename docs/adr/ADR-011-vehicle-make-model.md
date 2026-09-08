# ADR-011 — Vehicle make and model

## Status
Accepted

## Context
Vehicle identity was a single free-text `car` field. Product now requires separate **Make** and **Model**. Owners/Admins should pick common values from a list without blocking uncommon fleets.

## Decision
- API JSON uses `make` and `model` (snake_case); **`car` is removed**.
- POST `/v1/vehicles` requires non-empty trimmed `make`, `model`, and `license_plate` → else `400 validation_error`.
- PATCH may update any subset; omitted fields unchanged.
- Persistence: columns `make`, `model`; drop `car`.
- List/home display composition is client-side: `trim(make) + " " + trim(model)` (single space).
- **No server-side manufacturer catalog** and **no API enum** — storage stays free text.
- Clients may ship a **static JSON catalog** in `@fleet/sdk` (`vehicle-makes-models.json`) for Make → Model selects. **Other** unlocks free-text fields so values outside the list remain valid.

## Consequences
- Clients and SDK must stop sending/reading `car`.
- Existing DBs need a one-shot migration (drop `car`, add `make`/`model`).
- Catalog updates are client-only; Backend does not validate against the list.
