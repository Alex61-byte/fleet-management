# Daily usage (driver)

**Stories:** US-61–US-67 · US-113–US-115 · **US-116–US-118** (EOD → remaining service on API)  
**Rules:** 87–100; **183–190**; **A:** A57–A69, A135–A140; **E:** E59–E70, E106–E111  
**Surfaces:** Driver **web + mobile** — Day Start / End of Day + **own** list. Entry from driver hub ([driver-home.md](driver-home.md)).  
**OA report:** [daily-usage-report.md](daily-usage-report.md) shows status + refuel.  
**Density:** Web compact; mobile comfortable.  
**Chrome:** Driver shell only.  
**Purpose:** Independently savable **Day Start** (open) and **End of Day** (close) against active next-travel vehicle, with optional **refuel** for Owner/Admin value.  
**Not in scope:** Edit/delete closed rows; GPS; photos; unit picker; mileage write-through; auto-open on login; **driver service counters**; client remaining-service math; OS push from EOD.

Reuse existing theme classes only. **No new hex.** **No new screens** this slice.

## Product rules (design must not contradict)

| Rule | UI implication |
| --- | --- |
| Active next-travel required for Day Start (A58, E59) | Form gated; CTA to Next travel |
| One open row (A64, E68) | Show **End of Day** when open exists; hide Day Start until closed |
| Day Start required fields | Date, start place/distance/time |
| End of Day required fields | End place/distance/time; start fields read-only summary |
| Optional refuel independently (A59–A60, US-115) | Refuel amount + Refuel at mileage on **both** panels; not required |
| Fuel unit from A34 | L when km, gal when mi — label only |
| Floor start ≥ max(mileage, latest **closed** end) (A61) | Hint under start distance |
| end ≥ start distance/time on close (A61, A63) | Inline validation |
| Default date = today local | Prefill Day Start date |
| Own list newest first (A65) | Show status open\|closed + refuel when set |
| No free-form edit/delete (A66) | Read-only list rows |
| No mileage write-through (A62, A189) | No copy implying fleet odometer / `vehicle.mileage` update |
| EOD advances remaining service **API-only** (183–187, A139) | Optional calm caption only; **no** driver remaining km/days readout; **no** FE formula |
| Day Start / open row does not advance distance progress (A135, E106) | No success copy claiming service update on Day Start alone |
| Offline block (A68, E67) | Banner + both submits disabled |

## Routes

| Surface | Path |
| --- | --- |
| Web | `/driver/daily-usage` |
| Mobile | `/(driver)/daily-usage` |

## Layout

### Task screen

```
driver shell Daily usage
  Back · offline banner
  [no travel] gate → Go to Next travel
  [else]
    caption vehicle · units
    [no open]
      panel Day Start
        Date · Start place · Start distance · Start time
        Refuel amount (optional) · Refuel at mileage (optional)
        Save Day Start
    [open]
      panel End of Day
        caption Open since {start_time} · {start_place} · {start_distance}
        End place · End distance · End time
        Refuel amount (optional) · Refuel at mileage (optional)
        [optional] caption muted: Closing the day updates service remaining on the server for this vehicle. (not a driver counter)
        Save End of Day
    panel Your entries
      rows: date · status · vehicle · places · distances · times · refuel
```

**One active panel** at a time (Day Start XOR End of Day). List always below.

### Remaining service (US-116–US-118) — display boundaries

| Do | Don't |
| --- | --- |
| Keep existing Day Start / End of Day field set | Add service remaining / approaching / due widgets on this screen |
| Optional one-line calm caption on **End of Day** only (above) | Imply Day Start or failed EOD changed service |
| Success live region stays “End of Day saved.” | “X km left to service” or any client-computed remaining |
| A62: no copy that fleet mileage was updated | FE remaining-service arithmetic (A139 / E108) |

OA **Service due** and notification **service** rows stay the surfaces that **display** API remaining/due — see [service-due.md](service-due.md), [global-header.md](global-header.md).

## States

| State | Treatment |
| --- | --- |
| Loading | skeletons |
| No travel | gate panel |
| Eligible, no open | Day Start form |
| Open row | End of Day form (+ optional server-service caption) |
| Empty list | caption No daily usage entries yet |
| Success Day Start | Navigate to driver **Home** (`/driver` / `/(driver)`); open-day banner + hub **Day open** is the cue — **no** stay-on-page “Day Start saved.” toast |
| Success End of Day | polite live region “End of Day saved.” (may stay on task screen) — **no** remaining-service numbers |
| Error | bannerDanger form-level; field errors inline; service unchanged by failed attempt (no extra UI) |
| Offline | bannerWarning; submits disabled |

**States matrix:** unchanged for gating/loading/empty/error/offline. Caption is optional copy only — not a new state.

## A11y

- Panel `aria-label` Day Start / End of Day / Your daily usage
- Labels on all inputs; optional noted in label text
- Optional EOD service caption: `caption` muted, not a live region unless success already announced
- Primary buttons: Save Day Start / Save End of Day

## Related

- Hub entry: [driver-home.md](driver-home.md)  
- OA board / menu (API remaining): [service-due.md](service-due.md), [global-header.md](global-header.md)
