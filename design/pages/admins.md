# Create Admin

**Stories:** US-06  
**Density:** Web compact table; mobile comfortable rows. Owner only.  
**Purpose:** Owner adds an Admin for the company.  
**Chrome:** Authenticated shell. Sidebar **Admins** selected (Owner). Admin user: [denied.md](denied.md), no form.

## Layout — list (web)

```
pageHeader
  pageTitle Admins
  pageSubtitle People who can manage this company’s fleet
  pageHeaderActions buttonPrimary Add Admin
toolbar
  caption tabular “{n} admins”
tableWrap
  columns: Email | Role | Status
```

| Column | Class | Content |
| --- | --- | --- |
| Email | `tableCellLink` | Admin email — identity cell; row hover `tableRowHover`; cell hover `tableCellLinkHover` |
| Role | `tableCellMuted` | “Admin” |
| Status | `badgeNeutral` + text | “Active” (no extra BA statuses in this slice) |

No search. Sticky header. Row height `min-h-table-row`. Hover `tableRowHover`.

## Layout — list (mobile)

`appBarMobile` “Admins” + trailing Add. Rows `listRow`: email `label`, caption “Admin”.

## Layout — create (web + mobile)

Push page (not a nested card stack).

- Header: `pageTitle` “Add Admin”; secondary back
- Single `panel`: Email, Password (≥8), Confirm; `caption` on password “At least 8 characters”
- Footer: `buttonPrimary` “Create Admin”

Admin user who opens list or create: [denied.md](denied.md) — “Only the Owner can add Admins.” No table, no form.

## States

| State | UI |
| --- | --- |
| Loading | Header real; `skeleton` 5 table rows (web) or 5 `listRow` bars (mobile) |
| Empty | `emptyState` title “No Admins yet.” sentence “Add an Admin so they can manage drivers and vehicles.” CTA “Add Admin” |
| Duplicate email | Email `inputError` “This email cannot be used.” Admin not created |
| Password rule | Field `errorText` |
| Error | `bannerDanger` |
| Offline | `bannerWarning`; submit `buttonDisabled` |
| Success | Return to list; new row visible (no toast-only) |
| Denied (Admin) | Denied pattern; no data |

## Token usage

| Role | Class |
| --- | --- |
| Page | `page` shell + `contentPadCompact` / comfortable |
| Table | `tableWrap` `tableHeader` `tableRow` |
| Mobile row | `listRow` |
| Form | `panel` |
| Primary | `buttonPrimary` |

## A11y

| Control | Name |
| --- | --- |
| Screen | Admins |
| Add | Add Admin |
| Create | Create Admin |
| Row | {email}, Admin |
| Denied | Only the Owner can add Admins |

- Denied announced; focus primary back.
