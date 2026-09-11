# Pricing plans (catalog v2)

**Status:** Product definition only — **not** implemented in API/billing (checkout still out).  
**Basis:** Built + manager-loop slice (compliance docs, reminder emails, owner usage reports, service-due board, issues). Software-only — **no** GPS/ELD/cameras.  
**Supersedes:** catalog v1 list prices and entitlement matrix.

**Currency:** USD list, tax-exclusive. **Meters:** active vehicles; driver seats (Team); custom expiration rows; compliance document slots (new).

---

## 1. Competitive context

| Peer | Band | Notes |
| --- | --- | --- |
| Fleetio | ~$4–10/veh | Maintenance-heavy; we undercut Essential on ops we ship + docs/reminders/reports |
| Samsara / Motive | $30–50+ all-in | Hardware — different category |
| Whip Around / AUTOsist | ~$5–10/veh | Inspections/docs/reminders — we match manager loop without full CMMS |

**Positioning:** Transparent software ops; win on **compliance urgency + custody (handover) + usage + proof docs + outbound digests** without hardware tax.

---

## 2. Unit economics (infra & scale — planning COGS)

Rough **variable COGS** at scale (order-of-magnitude, multi-tenant shared stack):

| Cost driver | Assumption | ~USD / unit |
| --- | --- | --- |
| Postgres row + indexes (usage, issues, docs meta) | Steady write fleets | **$0.02–0.05** / active vehicle / mo |
| API compute (Fastify) | Lists, reports, signed URLs | **$0.08–0.15** / active vehicle / mo |
| Supabase/S3 storage | Side images + compliance docs | **$0.021** / GB-mo + egress; plan **~$0.15–0.40** / veh / mo at 0.5–1.5 GB/veh |
| Resend email | Invites + **daily compliance digests** | **~$0.001**/email; digests **~$0.05–0.20** / Owner seat / mo |
| Support/ops buffer | Email support | **~$0.20–0.50** / paying workspace / mo amortized |

**Target:** Contribution margin **≥ 70%** at list after payment fees (~3%).  
**Floor (blended COGS + fee + margin):** roughly **≥ $2.00**/active vehicle on company plans with docs+email; Individual Personal stays thin on dates-only.

**Scale risks priced in**

- Document storage grows unbounded → **included slots + hard cap** (not infinite free PDFs).
- Daily digests × large fleets → **one digest / recipient / UTC day**, item cap in email, Plus+ only for outbound email.
- Report/export queries → indexed company scans; Fleet min **5** vehicles reduces tiny-tenant overhead on heavy features.
- Driver seats on Team → overage **$4**/driver (invite + auth + usage rows).

---

## 3. Plan matrix (4 plans)

| | **Personal** | **Personal Plus** | **Team** | **Fleet** |
| --- | --- | --- | --- | --- |
| **Code** | `individual_personal` | `individual_plus` | `company_team` | `company_fleet` |
| **Kind** | individual | individual | company | company |
| **List** | **$2.00**/active vehicle/mo | **$14**/mo workspace | **$7**/active vehicle/mo | **$11**/active vehicle/mo |
| **Annual** | **$20**/veh/yr (~$1.67/mo) | **$140**/yr (~$11.67/mo) | **$70**/veh/yr (~$5.83/mo) | **$110**/veh/yr (~$9.17/mo) |
| **Trial** | None | None | None | None |
| **Vehicles** | Per active; min 1 | **10** included | Per active; min 1 | Per active; **min 5** billed |
| **Extra vehicles** | in meter | **+$2.50**/veh/mo over 10 | in meter | in meter |
| **Admins** | 1 Owner | 1 Owner | Owner + **1** Admin | Owner + **unlimited** Admins |
| **Drivers** | — | — | **5** incl.; **+$4**/driver/mo | Unlimited |
| **Web + mobile** | Yes | Yes | Yes | Yes |

\*Fleet min 5 avoids feature arbitrage on heavy manager-loop COGS.

### 3.1 Feature entitlement

| Capability | Personal | Plus | Team | Fleet |
| --- | --- | --- | --- | --- |
| Own / fleet vehicles CRUD | ✓ | ✓ | ✓ | ✓ |
| Compliance dates + 30-day warnings | ✓ | ✓ | ✓ | ✓ |
| Vehicles nav urgency | ✓ | ✓ | ✓ | ✓ |
| Optional mileage | ✓ | ✓ | ✓ | ✓ |
| Custom expirations | — | ✓ §3.2 | — | ✓ §3.2 |
| In-app compliance notification menu | — | ✓ | ✓ | ✓ |
| **Outbound compliance digest email** | — | ✓ | ✓ | ✓ |
| Vehicle side images (4) | — | ✓ | ✓ | ✓ |
| **Compliance document vault** | — | ✓ §3.3 | ✓ §3.3 | ✓ §3.3 |
| Password reset (Owner/Admin) | ✓ | ✓ | ✓ | ✓ |
| TOTP MFA (Owner/Admin) | — | ✓ | ✓ | ✓ |
| Drivers invite + hard-delete | — | — | ✓ | ✓ |
| Next-travel + odometer | — | — | ✓ | ✓ |
| Handover Out/In + history | — | — | ✓ | ✓ |
| Driver Daily usage | — | — | ✓ | ✓ |
| **Owner/Admin Daily usage report + CSV** | — | — | ✓ | ✓ |
| **Service-due board** | — | ✓ (own) | ✓ | ✓ |
| **Issues / defects lite** | — | ✓ (own) | ✓ | ✓ |
| Create Admins | — | — | 1 | Unlimited |
| Support copy | Community | Email | Email | Email + priority |

### 3.2 Custom expirations

| | Personal | Plus | Team | Fleet |
| --- | --- | --- | --- | --- |
| Available | No | Yes | No | Yes |
| Included | — | **3**/vehicle | — | **3**/vehicle |
| Overage | — | **+$0.80**/mo per extra row | — | **+$0.80**/mo per extra row |
| Hard cap | — | **10**/vehicle | — | **10**/vehicle |

### 3.3 Compliance documents (storage meter)

| | Personal | Plus | Team | Fleet |
| --- | --- | --- | --- | --- |
| Available | No | Yes | Yes | Yes |
| Included slots | — | **10**/vehicle | **5**/vehicle | **20**/vehicle |
| Overage | — | **+$0.50**/mo per extra doc | **+$0.50**/mo per extra doc | **+$0.50**/mo per extra doc |
| Hard cap / vehicle | — | **25** | **15** | **40** |
| Max file size | — | **10 MB** | **10 MB** | **10 MB** |
| Types | — | insurance, inspection, road_tax, registration, other | same | same |

**Billable doc overage:** sum over vehicles of `max(0, doc_count − included)`. Side appearance images remain separate entitlement (not counted as compliance docs).

### 3.4 Explicitly not sold

GPS, ELD, cameras, dispatch/TMS, fuel cards, full work orders/parts, public API, SSO/SAML, SMS, Individual→Company convert, Stripe checkout (until billing slice).

---

## 4. Packaging rationale

- **Personal ($2/veh):** Dates + mileage only — thin COGS; entry vs spreadsheet.
- **Plus ($14 workspace):** Docs + digest email + service-due + issues + images/MFA/custom dates — storage/email loaded into workspace price; 10 vehicles included.
- **Team ($7/veh):** Full company ops + owner reports + docs (5/veh) + digests; driver pack overage **$4** covers invite/auth/usage growth.
- **Fleet ($11/veh):** Scale seats + higher doc caps + custom dates; min 5 billed supports report/index load.

**Examples**

- Team 8 veh, 7 drivers, no doc overage: `8×$7 + 2×$4 = $64`/mo.
- Plus 12 veh: `$14 + 2×$2.50 = $19`/mo.
- Fleet 10 veh, 4 vehicles with 25 docs each (20 included): `10×$11 + 4×5×$0.50 = $120`/mo.

---

## 5. Commercial rules (future billing)

1. Kind lock: `individual_*` ↔ individual; `company_*` ↔ company.
2. Active vehicle: all non-deleted vehicles count (archive later).
3. Driver seat: pending + login-enabled; hard-deleted excluded.
4. Custom row overage: Plus/Fleet only; **$0.80** beyond 3/vehicle.
5. Doc slot overage: Plus/Team/Fleet; **$0.50** beyond included; hard caps still enforced in product.
6. Digest email: at most **one** compliance digest per Owner/Admin email per **UTC day** per tenant.
7. Grandfather: existing tenants → **Company Team** (or comp) at billing launch; **no** trial.
8. Enforcement when billing ships; until then catalog = commercial intent + public `/pricing`.
9. Taxes excluded from list.

---

## 6. Landing copy

| Plan | One-liner |
| --- | --- |
| Personal | Compliance dates from **$2 per car / month**. |
| Personal Plus | Docs, email digests, service due, and custom dates — **$14**/mo. |
| Team | Drivers, handovers, usage reports, and proof docs from **$7**/vehicle. |
| Fleet | Scale seats + higher doc caps from **$11**/vehicle (min 5). |

---

## 7. Implementation note

**Public UI:** `/pricing` + `apps/web/lib/pricing-catalog.ts` must match this file.  
**No Stripe** until billing slice. Product caps (docs hard caps, custom rows) ship with manager-loop features; plan-tier entitlement hard-blocks wait for billing.
