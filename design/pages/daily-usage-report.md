# Daily usage report (company)

**Stories:** US-96 (amended) · US-113–US-115  
Company Owner/Admin **vehicle-first** daily usage + CSV export.

## Flow
1. **Vehicle list** — company vehicles (label · plate); select one.
2. **Selected vehicle** — back control; optional **From** / **To** + Apply; usage rows for that vehicle; Export CSV in shell action (same scope).

## Row content (after vehicle selected)
- Date · **status** (open|closed) · driver email
- Places · distances · times (vehicle already chosen — plate optional in row)
- **Refuel** amount (+ unit) and refuel-at-mileage when set

## CSV columns
`usage_date,status,driver_email,vehicle_label,license_plate,start_place,end_place,start_distance,end_distance,distance_unit,start_time,end_time,refuel_amount,refuel_amount_unit,refuel_at_mileage,created_at,closed_at`

## States
- Individual: explanatory empty (feature N/A)
- Vehicle list: loading / empty / error
- After select: date filters; usage loading / empty / error
- CSV disabled until vehicle selected; disabled offline

## A11y
- Vehicle rows are buttons/links with accessible names (label + plate)
- Form labels on date filters
- Export button disabled offline / no vehicle
