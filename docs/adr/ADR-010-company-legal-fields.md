# ADR-010 — Company legal fields and address lookup

## Status

Accepted

## Context

US-01 requires registration number, VAT, and address at company sign-up.

## Decision

- Store on `companies`: `registration_number`, `vat_number`, `address` (required text).
- Register API requires these fields; no lat/lon on contract.
- Address **lookup** is **client-only** free Nominatim/OSM assist (User-Agent, debounce). No paid Places; no server geocode proxy this slice.
- Lookup failure must not block manual address (E34).

## Consequences

- Sign-up UI grows three fields + optional lookup.
- Existing DBs need schema migrate (nullable backfill not required for greenfield tests; ALTER ADD columns).
