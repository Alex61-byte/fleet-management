# ADR-029 — Vehicles list custody filter & expiration sort

**Status:** Accepted  
**Slice:** US-120 · rules 192–194 · A143 · E115–E117  
**Extends:** ADR-028 open_out · ADR-019 custom expirations · ADR-004 dates · ADR-005 clients  
**Supersedes:** n/a

## Context

Owner/Admin need to filter the vehicles list by custody (In vs open Out) and sort by expiration dates including custom rows, without scanning every card. List payloads already include `open_out`, built-in dates, and `custom_expirations`.

## Decision

1. **Client projection** over `GET /v1/vehicles` (full tenant list or current page). No new server query params this slice.
2. **Custody filter (Company only):** `all` | `out` (`open_out != null`) | `in` (`open_out == null`). Individual omits filter.
3. **Expiration sort:** `default` | `expiration_asc` (soonest) | `expiration_desc` (furthest). Per vehicle key = min/max of non-null `insurance_on`, `inspection_on`, `road_tax_on`, each custom `expires_on`. **Never** `registration_on`. Undated after dated; tie-break label then plate.
4. **SDK** owns pure helpers so web and mobile stay consistent.
5. **`?expiring=true`** unchanged (warnings-only server filter for other consumers).

## Consequences

- FE implements toolbar; BE no-op for new params.
- Very large fleets may later need server filter/sort + cursor (revisit A143).

## Alternatives rejected

1. Server `?custody=` / `?sort=` now — premature without pagination pain.  
2. Sort only on `warnings[]` — misses far-future dates and non-warning customs.

## Revisit when

- Cursor pagination + filter must compose on the server  
- Free-text search on the list
