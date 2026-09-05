# ADR-002 — Auth, sessions, TOTP, first login

**Status:** Accepted

## Decision

### Tokens

- **Access token:** short-lived (~15 min), Bearer, opaque or signed JWT. Claims: `sub` (principal id), `company_id`, `role`, `must_change_password`, `token_use=access`.
- **Refresh token:** long-lived relative to access, **rotated on use**, stored hashed. Revoke family on reuse.
- **Absolute session lifetime (US-29):** **14 days** from refresh-token **family start** (first token issued at login / completed TOTP / new family). Each `refresh_tokens` row stores `expires_at` = family absolute end; rotation **copies** the same `expires_at` (does not extend the window). `POST /v1/auth/refresh` rejects when `now >= expires_at` with **401** `unauthenticated` (same code as revoked/missing/principal gone — no new error code).
- Same login API for web and mobile. How the client stores refresh (httpOnly cookie vs secure storage) is a client concern; API accepts `Authorization: Bearer <access>` and `POST /v1/auth/refresh` with refresh.
- **Client silent renewal (US-29):** On startup and on authenticated **401**, clients **must** attempt single-flight refresh, store the new pair, and retry once before clearing the session. Clear local tokens only after refresh failure, explicit logout, or rules that end the session (disable/delete/reuse). Access expiry alone must not force sign-in.
- **Parallel sessions (US-30):** Each successful login / TOTP verify / `change-first` that issues tokens creates a **new** refresh **family** and does **not** revoke other families for the same principal. Web and mobile (or two devices) may hold valid sessions at once. `POST /v1/auth/logout` ends **only** the presented refresh token’s **family** (this device/surface). It must **not** revoke all families for the principal. No “logout everywhere” API in this slice. Hard delete / disable paths that clear principal auth still end **all** sessions for that principal (US-27 / US-16).

### Login

`POST /v1/auth/login` requires `email`, `password`, and `client`: `web` | `mobile`.

| Outcome | HTTP | Body |
| --- | --- | --- |
| Bad password/email | 401 | `invalid_credentials` (no field hint) |
| Driver `login_enabled=false` | 403 | `login_disabled` |
| Owner/Admin TOTP on | 200 | `status: totp_required`, `challenge_token` — **no** access token |
| Driver `must_change_password` (web **or** mobile) | 200 | tokens with `must_change_password: true` |
| Success (any role, `client=web` or `mobile`) | 200 | tokens, `must_change_password: false` |

Drivers **may** authenticate with `client=web` or `client=mobile`. Code `driver_web_not_allowed` is **retired** (must not be returned).

Challenge token: single-use, short TTL, only for `POST /v1/auth/totp/verify`. Wrong/missing code: 401 `totp_invalid`; sign-in not complete.

### Restricted driver session

While `must_change_password=true`, API allows only:

- `POST /v1/auth/password/change-first`
- `POST /v1/auth/logout`
- `GET /v1/me`

All other routes: 403 `password_change_required`.

`change-first` rejects new password equal to current (temp) and length &lt; 8 (`password_reused`, `password_too_short`). On success, temp hash is replaced; subsequent login with temp fails (`invalid_credentials`).

Drivers never enroll TOTP. Owner/Admin TOTP **enabled only after confirm**; pending secret is not active.

### Password reset

Owner/Admin only. `POST /v1/auth/password/forgot` always **202** with the same empty body (no enumeration). `POST /v1/auth/password/reset` with token sets password if principal role is owner or admin; otherwise 400 `reset_invalid` (same as bad token).

### Passwords

Min 8 characters. Hash with a slow KDF (Argon2id or bcrypt). Never return hashes. TOTP secrets encrypted at rest.

### Principal removal

When a driver principal is hard-deleted (US-27 / [ADR-008](ADR-008-driver-hard-delete.md)), all refresh tokens for that `principal_id` are revoked in the same transaction as the principal delete. Access tokens whose `sub` no longer exists must not authorize (**401** `unauthenticated`). Refresh already fails if the principal is missing. Login with the deleted identity’s credentials fails closed (no session).

## Alternatives

1. Cookie-only sessions — awkward for Expo.
2. Access JWT only, no refresh — long-lived JWT theft; or constant re-login.
3. MFA SMS — out of BA scope.

## Consequences

Web must send `client: web`. Mobile sends `client: mobile`. `client` is surface telemetry — **not** a driver ban switch. FE hides Owner chrome for drivers (**E8 / US-14**); API enforces the role matrix (driver tokens never authorize Owner/Admin fleet/admin routes).
