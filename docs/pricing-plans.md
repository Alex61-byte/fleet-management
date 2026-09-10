# Pricing plans (catalog v1)

**Status:** Product definition only — **not** implemented in API/billing.  
**Basis:** Current product ([requirements.md](requirements.md), [ADR-018](adr/ADR-018-account-kinds.md)): software fleet ops (compliance, drivers, handovers, daily usage). **No** telematics hardware, GPS, ELD, or dash cams.

**Currency:** USD list prices. **Meter:** seats where noted; otherwise **per active vehicle / month** (Personal, Team, Fleet). Plus is workspace-priced. Annual ≈ 2 months free vs monthly where stated.

---

## 1. Competitive context (software-only peers)

| Competitor | Model (public) | Rough band | Notes vs us |
| --- | --- | --- | --- |
| **Fleetio** | Per vehicle / mo | ~**$4–10**/vehicle (Essential→Premium; annual cheaper) | Maintenance/work orders/parts heavy; closer peer than hardware FMS |
| **Samsara / Motive** | Quote + hardware | Often **$30–50+**/vehicle equiv. all-in | Telematics/cameras — **not** same category; we stay software-only |
| **Spreadsheet / free apps** | $0 | DIY compliance dates | Personal stays cheap per car vs DIY chaos; still software-only |

**Positioning:** Price **at or under Fleetio Essential** for company fleets on ops we already ship; win on **compliance urgency + driver invite/handover/daily usage** without forcing hardware. Individual **Personal** is **per vehicle** at a low entry rate; **Plus** remains workspace-priced.

---

## 2. Plan matrix (4 plans)

| | **Individual — Personal** | **Individual — Personal Plus** | **Company — Team** | **Company — Fleet** |
| --- | --- | --- | --- | --- |
| **Code** | `individual_personal` | `individual_plus` | `company_team` | `company_fleet` |
| **Account kind** | `individual` only | `individual` only | `company` only | `company` only |
| **Who** | Owner of own cars/vans | Power individual / small multi-vehicle personal | Micro fleet starting ops | Growing multi-driver fleet |
| **List price** | **$1.50**/active vehicle/mo | **$9**/mo workspace | **$5**/active vehicle/mo | **$8**/active vehicle/mo |
| **Annual (opt.)** | **$15**/vehicle/yr (~$1.25/mo) | **$90**/yr (~$7.50/mo) | **$50**/vehicle/yr (~$4.17/mo) | **$80**/vehicle/yr (~$6.67/mo) |
| **Trial** | **None** | **None** | **None** | **None** |
| **Vehicles included** | Billed per active vehicle; **min 1** | **10** | Billed per active vehicle; **min 1** | Per active vehicle; **min 5** billed* |
| **Extra vehicles** | Included in per-vehicle | **$2**/vehicle/mo over 10 | Included in per-vehicle | Included in per-vehicle |
| **Admins (Owner+)** | 1 Owner only | 1 Owner only | **1 Owner + 1 Admin** | Owner + **unlimited Admins** |
| **Drivers** | — | — | **5** included; then **$3**/driver/mo | **Unlimited** drivers |
| **Web + mobile** | Yes | Yes | Yes | Yes |

\*Min 5 on Fleet avoids “one truck on Fleet features” arbitrage; smaller orgs use Team.

### 2.1 Feature entitlement (maps to **built product only**)

| Capability | Personal | Plus | Team | Fleet |
| --- | --- | --- | --- | --- |
| Own vehicles CRUD | ✓ | ✓ | ✓ | ✓ |
| Compliance dates (ins/insp/tax/reg) + 30-day warnings | ✓ | ✓ | ✓ | ✓ |
| Custom expirations | — | ✓ (see §2.2) | — | ✓ (see §2.2) |
| Optional vehicle mileage | ✓ | ✓ | ✓ | ✓ |
| Vehicles nav urgency (red/orange) | ✓ | ✓ | ✓ | ✓ |
| Compliance notification menu | — | ✓ | ✓ | ✓ |
| Vehicle side images (4 sides) | — | ✓ | ✓ | ✓ |
| Password reset | ✓ | ✓ | ✓ | ✓ |
| TOTP MFA (Owner/Admin) | — | ✓ | ✓ | ✓ |
| Drivers invite (Resend) + hard-delete | — | — | ✓ | ✓ |
| Driver next-travel + odometer | — | — | ✓ | ✓ |
| Driver Handover Out/In | — | — | ✓ | ✓ |
| Owner/Admin Handovers history | — | — | ✓ | ✓ |
| Driver Daily usage | — | — | ✓ | ✓ |
| Create Admins | — | — | 1 Admin | Unlimited |
| Priority support / SLA copy | Community | Email | Email | Email + priority |

### 2.2 Custom expirations (upper plans only)

| | **Personal** | **Plus** | **Team** | **Fleet** |
| --- | --- | --- | --- | --- |
| Available | No | Yes | No | Yes |
| Included | — | **3** labeled rows **per vehicle** | — | **3** labeled rows **per vehicle** |
| Overage | — | **+$0.70**/mo **per extra row** (4th+) | — | **+$0.70**/mo **per extra row** (4th+) |
| Hard cap | — | Product max **10**/vehicle | — | Product max **10**/vehicle |

**Billable quantity:** sum over vehicles of `max(0, custom_expiration_count − 3)` on Plus/Fleet. Entry plans (Personal, Team) cannot create/use custom expirations when entitlements ship.

**Example (Plus or Fleet):** one vehicle with 5 custom rows → `2 × $0.70 = $1.40`/mo add-on (plus base plan).

**Explicitly not sold on any plan:** GPS, ELD, cameras, dispatch board, fuel cards, work orders, parts inventory, public API, SSO/SAML, Individual→Company convert.

---

## 3. Packaging rationale

### Individual

- **Personal ($1.50/vehicle/mo):** Low per-car entry for compliance dates + mileage; **no** custom expirations. Scales with active vehicles (min 1).
- **Plus ($9):** Unlocks **images + MFA + notifications + custom expirations (3/vehicle included)** + up to 10 vehicles — still no drivers (product rule). Extra custom rows **+$0.70**/mo each.

### Company

- **Team ($5/veh):** Entry company ops — drivers + handovers + daily usage; **no** custom expirations. **Driver pack (5 + overage)** keeps micro fleets predictable.
- **Fleet ($8/veh):** Unlimited drivers/admins + **custom expirations (3/vehicle included, +$0.70/row over)** — still far below hardware FMS.

**Overage examples**

- **Team:** 8 vehicles, 7 drivers → `8×$5 + 2×$3 = $46`/mo.
- **Fleet custom rows:** 10 vehicles × 3 included free; 4 vehicles with 5 rows each → `4×2×$0.70 = $5.60`/mo custom overage.

---

## 4. Commercial rules (for a future billing slice)

1. **Kind lock:** `individual_*` only if `account_kind = individual`; `company_*` only if `company`. No cross-sell without explicit convert product (out of scope today).
2. **Active vehicle:** Counts toward limit/bill if not archived/deleted (define archive later; today all stored vehicles count).
3. **Driver seat:** Pending invite + active login-enabled drivers count; hard-deleted do not.
4. **Custom expiration overage:** On Plus/Fleet only; per vehicle, rows beyond **3** bill **$0.70**/mo each; product still caps at **10**/vehicle. Personal/Team: feature off (API deny when entitlements ship).
5. **Grandfather:** Existing tenants → **Company Team** (or comp) until billing ships (product decision at launch). **No** free trial period on any plan.
6. **Enforcement:** Limits **API-enforced** when billing ships; until then catalog is commercial intent only.
7. **Taxes:** List prices exclude VAT/sales tax; company legal fields already collect VAT id for future invoicing.

---

## 5. Landing / sales copy (short)

| Plan | One-liner |
| --- | --- |
| Personal | Compliance dates from **$1.50 per car / month**. |
| Personal Plus | Photos, MFA, alerts, and up to 3 custom dates/vehicle (then +$0.70) — still just you. |
| Team | Small company fleet: drivers, handovers, and usage from $5/vehicle. |
| Fleet | Scale drivers/admins + custom dates (3/vehicle, then +$0.70) from $8/vehicle. |

---

## 6. Open decisions (not blocking catalog)

- EU/UK local currency & VAT-inclusive display  
- Archive vehicle = stop billing  
- Whether Team should ever gain custom expirations as a paid add-on pack  
- Stripe (or other) + customer portal when implementing  

---

## 7. Implementation note

**Public UI:** Web `/pricing` shows this catalog (static; [ADR-021](adr/ADR-021-public-pricing-page.md)).  
**Do not** implement Stripe/entitlements until a dedicated billing feature-slice (BA → Arch → BE → FE). This file remains the **source of truth for plan names, prices, and feature gates**.
