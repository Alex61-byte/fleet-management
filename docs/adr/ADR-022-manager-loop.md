# ADR-022 — Manager loop (docs, digest, usage report, service-due, issues)

## Status
Accepted (amended US-116–US-118)

## Context
Market peers ship proof docs, outbound reminders, owner usage visibility, service scheduling signals, and defect tracking. Our product was dates/custody-heavy without those manager loops. Billing remains catalog-only (no Stripe).

## Decision
- **Compliance docs:** multipart upload to existing vehicle image storage under `{company}/{vehicle}/docs/`; metadata in `vehicle_compliance_documents`; product hard cap 40/vehicle; plan slots commercial-only until billing.
- **Digest email:** Resend via extended `Mailer`; `compliance_digest_sends` enforces ≤1 email/principal/UTC day; Owner trigger `POST /v1/compliance-digest/send` (job-shaped).
- **Owner daily usage:** Company-kind Owner/Admin `GET /v1/reports/daily-usage` (+ `.csv`); amends A65/E64 for company managers only.
- **Service-due:** derived read model — **no** separate schedule entity. **Baseline** = latest **non-voided** handover with next-service fields (unchanged). Usage never creates baseline.
  - **`service_progress_odometer`** = max( (a) `vehicle.mileage` when set, (b) max **closed** Daily usage `end_distance` on that vehicle **after** the baseline ). Same distance unit as vehicle/A34.
  - **`distance_remaining`** = `(handover.mileage + next_service_distance) − service_progress_odometer` when progress usable; if result < 0 treat as **0** for `due_by_distance`; if neither (a) nor (b) usable → **`distance_remaining` null** (days path may still due).
  - **`as_of_date`** = max(**UTC today**, max **closed** Daily usage `usage_date` on that vehicle after baseline). **`days_elapsed`** = whole calendar days from baseline handover calendar date to `as_of_date` (US-97 convention). `due_by_days` when `days_elapsed ≥ next_service_days`.
  - Board **includes** approaching when `distance_remaining != null` and `0 < distance_remaining ≤ 2000` (server constant) **or** due/overdue by days/distance; `service_status`: `"due"` if `due_by_days || due_by_distance`, else `"approaching"`.
  - **Same function** for `GET /v1/service-due` and OA **service** notification inputs (ADR-017). **Recompute-on-read** OK after EOD; no FE remaining-service arithmetic (**A138–A139**).
  - **A62:** Daily usage must not write `vehicle.mileage`; progress may exceed stored mileage via closed ends only.
- **Issues:** `vehicle_issues` lite; auto-open on handover `damages_text`; drivers create only on active next-travel vehicle; close = Owner/Admin.

## Consequences
- Multipart body limit raised to 10 MB for PDFs.
- Storage failure paths mirror side images (503 `storage_unavailable`).
- Pricing catalog v2 documents entitlements; API does not hard-gate by plan code in this slice.

- Remaining-service pure derivation must join handover baseline + vehicle.mileage + closed daily-usage aggregates; prefer one shared server helper for board and notification feed.
- Store hint: max closed `end_distance` / `usage_date` per vehicle after baseline (see ADR-016). No client-side formula.
