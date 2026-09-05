# Vehicles (list, create, edit)

**Stories:** US-11, US-12, US-13, US-15, **US-28** (nav/tab urgency — chrome only; see [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking))  
**Density:** Web compact **table**; mobile comfortable **rows**. Owner/Admin.  
**Purpose:** Fleet records: **Make** + **Model** (two free-text fields), plate, insurance, inspection, country of registration, road tax **dates**. Warn on list **and** detail (BA Q8 — design: **both**). Country is a text field, not a catalog. Make/Model are free text — **no** make/model catalog dropdowns. Dates only (no file upload).  
**Chrome:** Authenticated shell. Sidebar / tab **Vehicles** selected when on this area. No search. **US-28:** Vehicles nav/tab may show red/orange urgency fill from fleet-wide worst section dates — pattern chrome, not list badges.

## List — web

```
pageHeader
  pageTitle Vehicles
  pageSubtitle Insurance, inspection, road tax, and registration dates
  pageHeaderActions buttonPrimary Add vehicle
toolbar
  caption font-tabular “{n} vehicles”
tableWrap sticky header
  Vehicle | Plate | Country | Insurance | Inspection | Road tax | Registration
```

| Column | Class | Content |
| --- | --- | --- |
| Vehicle | `tableCellLink` | Primary identity: **`{Make} {Model}`** (single space between make and model). No underline at rest; hover `tableCellLinkHover`. Plate stays `tableCellMuted` (not underlined). Empty make or model: still join with one space; trim ends (e.g. make-only shows make). |
| Plate | `tableCellMuted` | License plate — secondary |
| Country | `tableCellMuted` | Free text |
| Date columns | `tableCellNum` | Tabular date; if due/expired, `badgeWarning` / `badgeExpired` **and** the date |

Row hover `tableRowHover`; tap → edit. Do **not** use a card per vehicle on web. Do **not** split Make/Model into two list columns.

## List — mobile

`appBarMobile` “Vehicles” + Add. `listRow`: primary identity **`{Make} {Model}`** as `label`, plate as `caption` (muted secondary), badges wrap (`badgeWarning` / `badgeExpired` with date name). Hairline divider, not raised cards.

## Empty / loading

| State | UI |
| --- | --- |
| Empty | `emptyState` title “No vehicles yet.” sentence “Add a vehicle to track compliance dates.” CTA “Add vehicle” |
| Loading | Header + toolbar; skeleton rows matching table/list |
| Error / offline | `bannerDanger` / `bannerWarning` |
| Unauthenticated | No records → [denied.md](denied.md) |

## Create / edit form

Push page (or same route with mode). **One** `panel`. Fields stacked `gap-2`. Labels above controls. Same field inventory and layout for create and edit — **not** two visual systems.

### Create vs edit (prepopulate)

| Mode | Entry | Page title | Fields | Primary |
| --- | --- | --- | --- | --- |
| **Create** | Header “Add vehicle” / empty CTA | “Add vehicle” | **Blank** — empty text inputs; date controls empty / unset (no placeholder fake dates) | `buttonPrimary` “Save vehicle” |
| **Edit** | List row tap / identity link | “Edit vehicle” (subtitle optional: plate or `{Make} {Model}` once known) | **Prepopulated** from stored vehicle: make, model, plate, country, and each section date as returned by API | Same `buttonPrimary` “Save vehicle” |

- Edit must show stored values on first paint after load (no flash of empty then fill if avoidable; loading uses form skeleton in the same `panel`).
- Create must **not** inherit the last-edited vehicle.
- Under each date on **both** modes: if the current field value warrants it, badge + `caption` (“Insurance · Expired” / “Inspection · Due soon”) — same A1 rules as list. Empty date → no badge.
- No separate “detail read-only” screen in this slice: row opens **edit** with prepopulated fields.
- Denied paths (driver create, other-company edit) → [denied.md](denied.md); form not shown with foreign data.

| Field | Type | Copy |
| --- | --- | --- |
| Make | Text | “Make” — free text; **not** a catalog dropdown |
| Model | Text | “Model” — free text; **not** a catalog dropdown |
| License plate | Text | “License plate” |
| Country of registration | Text | “Country of registration” — free text, not a law catalog |
| Insurance date | Date | “Insurance” |
| Inspection date | Date | “Inspection” — Admin-entered; not computed from country |
| Road tax date | Date | “Road tax” |
| Registration date | Date | “Registration” — optional stored date; **no** expiry badge or nav urgency |

**Make and Model** are two separate controls, stacked with the same form `gap-2` as other fields (Make above Model). Do not combine into one “Car” field. No make/model pickers or typeahead catalogs in this slice.

One date each (BA Q7 — **single date per item**).

Primary `buttonPrimary` “Save vehicle”. Saving with expired/soon dates **allowed**; badges show immediately on insurance/inspection/road tax (A11).

## Warning rules (A1) — list & form only

Applies to **Insurance, Inspection, Road tax** only. **Registration never shows** `badgeExpired` / `badgeWarning`.

| Condition | Treatment |
| --- | --- |
| Date in past | `badgeExpired` “Expired” + date name |
| Date within 30 days including today | `badgeWarning` “Due soon” + date name |
| Date > 30 days | Date only, no badge |
| Empty date | No badge |
| Registration any value | Date only, **no** badge |

Show on **list** (web cells / mobile wrap) **and** **edit/create form** (inline under insurance/inspection/road tax). **Unchanged by US-28.**

## Nav / tab urgency (US-28) — chrome only

Worst-wins fleet urgency on the **Vehicles** sidebar item (web) and **Vehicles** tab (mobile Owner/Admin). **Not** painted on list rows, date cells, or form badges.

| Band | When | Chrome |
| --- | --- | --- |
| Red | Any company section `daysUntil < 7` (incl. overdue) | `navItemUrgencyCritical` / `tabItemUrgencyCritical` |
| Orange | No red; any section `daysUntil = 7` | `navItemUrgencySoon` / `tabItemUrgencySoon` |
| None | Else | Base nav/tab only |

Full state matrix, selected+urgency stacking, contrast, and accessible names: [\_patterns.md](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking). List/detail stay on the **30-day** badge window (A1); nav uses the **7-day / exact-7** bands (A20).

## States

| State | UI |
| --- | --- |
| Driver create | Denied; no vehicle created |
| Other company edit | Denied; vehicle unchanged |
| Validation | BA Q6 open — all listed fields shown; empty dates mean no warning |

## Token usage

| Role | Class |
| --- | --- |
| Table | `tableWrap` `tableHeader` `tableCell` `tableCellNum` |
| Mobile row | `listRow` |
| Form | `panel` |
| Badges (A1) | `badgeWarning` `badgeExpired` |
| Nav/tab urgency (US-28) | `navItemUrgencyCritical` `navItemUrgencySoon` (+ hover/selected variants); mobile `tabItemUrgency*` — see patterns |

## A11y

| Control | Name |
| --- | --- |
| Screen (list) | Vehicles |
| Screen (create) | Add vehicle |
| Screen (edit) | Edit vehicle |
| Add | Add vehicle |
| Row | {Make} {Model}, {plate}, {date name} expired \| due soon |
| Make | Make |
| Model | Model |
| Save | Save vehicle |
| Vehicles nav/tab (none) | Vehicles |
| Vehicles nav/tab (orange) | Vehicles, expiry in 7 days |
| Vehicles nav/tab (red) | Vehicles, critical expiry within 7 days |

- Badges not color-only; nav urgency not color-only (name + fill + selected edge).
- Date picker 44pt; web keyboard reachable.
- Do not clip labels; wrap badges on mobile.
- Edit: fields keep visible labels; prepopulated values are the accessible value, not a second unlabeled string.
- List primary identity is one string (`Make Model`); form exposes Make and Model as separate labeled controls.
