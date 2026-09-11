# Daily usage report (company)

**Stories:** US-96 (amended) · US-113–US-115  
Company Owner/Admin company-wide daily usage list + CSV export.

## Row content
- Date · **status** (open|closed) · driver email
- Vehicle label · plate
- Places · distances · times
- **Refuel** amount (+ unit) and refuel-at-mileage when set

## CSV columns
`usage_date,status,driver_email,vehicle_label,license_plate,start_place,end_place,start_distance,end_distance,distance_unit,start_time,end_time,refuel_amount,refuel_amount_unit,refuel_at_mileage,created_at,closed_at`

## States
- Individual: explanatory empty (feature N/A)
- Filters from/to dates
- Loading / empty / error
- CSV download control in shell action

## A11y
- Form labels on date filters
- Export button disabled offline
