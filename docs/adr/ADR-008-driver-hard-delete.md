# ADR-008 — Driver hard delete (US-27)

**Status:** Accepted  
**Slice:** hard delete driver profile (Must); distinct from US-16 disable login

## Decision

- **Hard delete** a company driver = **physical remove** of the Identity `principal` with `role=driver` (and its credential material on that row). **Not** soft-delete, **not** `login_enabled=false`.
- **HTTP:** `DELETE /v1/drivers/:id` → **204**. Authz: Owner or Admin, same `company_id`. Cross-company / unknown / non-driver id → **404** `not_found`. Driver caller → **403** `forbidden`.
- **Module:** Identity only. Fleet does not participate; **no** vehicle cascade (no assignment in slice).
- **Email:** Removing the row frees the global unique email for a **new** US-07 create (new id). No restore.
- **Sessions (required):** In the same transaction as principal delete, **revoke all refresh tokens** for that `principal_id`. Authenticated requests must **fail closed** if `sub` no longer exists (**401** `unauthenticated`), so a deleted driver cannot keep using a live access token until TTL.
- **US-16:** `PATCH /v1/drivers/:id` with `login_enabled` remains; disable keeps the row. Disabled drivers may still be hard-deleted.
- **Events / audit:** No outbox and no in-product delete audit (A18). No message bus (ADR-001).

## Alternatives

1. Soft-delete / tombstone — rejected: BA A17 / Won't (no restore).
2. Revoke refresh only; leave access JWT valid until expiry — rejected: BA 28 / E14 require the identity cannot remain signed in.
3. Fold delete into PATCH — rejected: conflates US-16; design separates confirm UX.

## Consequences

- Backend: Identity `deleteDriver`; store delete-principal + revoke-refresh-by-principal; principal check on session use; tests for tenancy, disable-then-delete, email reuse, vehicles unchanged, session kill.
- Frontend: after Backend; edit confirm only ([design/pages/drivers.md](../../design/pages/drivers.md)); no list row delete.
- Contract: [http-v1.md](../contracts/http-v1.md) `DELETE /v1/drivers/:id`.

## Revisit when

BA requires audit trail, soft-delete/restore, bulk delete, driver–vehicle assignment cascade, or admin/owner removal rules beyond A5.
