# ADR-022 — Manager loop (docs, digest, usage report, service-due, issues)

## Status
Accepted

## Context
Market peers ship proof docs, outbound reminders, owner usage visibility, service scheduling signals, and defect tracking. Our product was dates/custody-heavy without those manager loops. Billing remains catalog-only (no Stripe).

## Decision
- **Compliance docs:** multipart upload to existing vehicle image storage under `{company}/{vehicle}/docs/`; metadata in `vehicle_compliance_documents`; product hard cap 40/vehicle; plan slots commercial-only until billing.
- **Digest email:** Resend via extended `Mailer`; `compliance_digest_sends` enforces ≤1 email/principal/UTC day; Owner trigger `POST /v1/compliance-digest/send` (job-shaped).
- **Owner daily usage:** Company-kind Owner/Admin `GET /v1/reports/daily-usage` (+ `.csv`); amends A65/E64 for company managers only.
- **Service-due:** derived from latest non-voided handover next-service fields vs UTC today and vehicle mileage — no separate schedule entity. Board **includes approaching** when `0 < distance_remaining ≤ 2000` (server constant) as well as due/overdue; response includes `service_status` `"approaching" | "due"` (US-97 / US-109).
- **Issues:** `vehicle_issues` lite; auto-open on handover `damages_text`; drivers create only on active next-travel vehicle; close = Owner/Admin.

## Consequences
- Multipart body limit raised to 10 MB for PDFs.
- Storage failure paths mirror side images (503 `storage_unavailable`).
- Pricing catalog v2 documents entitlements; API does not hard-gate by plan code in this slice.
