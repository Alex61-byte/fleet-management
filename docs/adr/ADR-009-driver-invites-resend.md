# ADR-009 — Driver invites via Resend

## Status

Accepted

## Context

US-07/US-09 retire Admin temporary passwords. Drivers are invited by email and set their own password.

## Decision

- Identity owns invite tokens (opaque, **hashed at rest**, TTL **7 days**, single-use, rotate on resend).
- Delivery via **Resend** HTTP API (`RESEND_API_KEY`, `RESEND_FROM`).
- Invite link base: `PUBLIC_WEB_URL` + `/invite?token=…` (mobile may use scheme or open web).
- Create driver commits principal first; email failure → `invite_email_sent: false`, profile kept (E30).
- Accept: `POST /v1/auth/invite/preview` + `accept`; issues session; retires `change-first`.
- Pending drivers cannot password-login (`invalid_credentials`).

## Consequences

- No temp passwords in API/UI.
- Clients need invite accept screens (web + mobile).
- Operational dependency on Resend + verified from-domain.
