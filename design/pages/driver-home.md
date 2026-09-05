# Driver home

**Stories:** US-10, US-14, **US-33**, **US-34**  
**Density:** Web compact content; mobile comfortable. **Both surfaces** after invite accept (or subsequent login).  
**Purpose:** Minimal post-auth driver experience: identity, **next-travel vehicle selection + odometer**, sign out. **No** fleet admin create/edit, **no** driver management, **no** create Admin, **no** Owner expiry inbox, **no** TOTP settings, **no** Owner/Admin chrome.  
**Chrome:** Driver-only shell — see [_patterns.md](_patterns.md) **Driver shell (web + mobile)**.  
- **Mobile:** `appBarMobile` only — **no** tab bar, **no** sidebar.  
- **Web:** top driver header strip only — **no** Owner `sidebar`.

## Layout

### Mobile

```
Safe area
appBarMobile
  brandMark 24px + appBarProduct Fleet
  pageTitleMobile Home
canvas contentPadComfortable gap-2
  panel (identity)
    overline Driver
    label {email}
  panel (next travel) aria-label Next travel
    sectionTitle Next travel
    [if active selection]
      label {Make Model}
      caption {plate} · Odometer {n} {mi|km}
      caption Selected {relative or datetime optional}
    [else]
      body No vehicle selected for your next travel.
    Field Vehicle (select / list)
    Field Odometer — hint unit locked “Miles” or “Kilometres” from country
    buttonPrimary Save selection (or “Update selection”)
  buttonSecondary Sign out
```

### Web

```
page (bg-canvas min-h-full)
driverAppBar …
contentPadCompact max-w-auth-card mx-auto flex flex-col gap-2
  panel identity (as today)
  panel next travel (same field inventory as mobile)
  buttonSecondary Sign out
```

## Next travel panel

| Element | Token / control | Notes |
| --- | --- | --- |
| Title | `sectionTitle` | “Next travel” |
| Active summary | `label` + `caption` | Make Model; plate; odometer + unit |
| Vehicle | native select or radio list | Options: “{Make Model} · {plate}”; empty → emptyState sentence |
| Odometer | text/number input | Label “Odometer”; **hint** shows unit only (not a second control). Unit **not** editable |
| Unit | `caption` / field hint | “Miles” or “Kilometres” from selected vehicle country (US-34) |
| Primary | `buttonPrimary` | “Save selection” |
| Empty fleet | `body` | “No vehicles available. Ask your company to add a vehicle.” |

Changing vehicle in the selector **updates the unit hint immediately** (client uses `odometer_unit` from list payload).

## States

| State | UI |
| --- | --- |
| Loading | App bar real; skeleton identity + next-travel panels |
| Default (no selection) | Identity + empty next-travel copy + form |
| Active selection | Summary shows current vehicle + odometer + unit; form preselects vehicle |
| Empty company fleet | Form disabled / no options; empty copy |
| Validation | `bannerDanger` or field error: odometer required / invalid |
| Offline | `bannerWarning`; Save `buttonDisabled` |
| Error load vehicles | `bannerDanger` + Retry |
| Owner deep link | [denied.md](denied.md) |

## A11y

| Control | Name |
| --- | --- |
| Screen | Home |
| Next travel panel | Next travel |
| Vehicle | Vehicle for next travel |
| Odometer | Odometer in {miles\|kilometres} |
| Save | Save selection |
| Sign out | Sign out |

Unit must be in the odometer accessible name/hint, not colour alone.
