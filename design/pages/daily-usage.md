# Daily usage (driver)

**Stories:** US-61–US-67 · US-113–US-115  
**Rules:** 87–100; **A:** A57–A69; **E:** E59–E70  
**Surfaces:** Driver **web + mobile** — Day Start / End of Day + **own** list. Entry from driver hub ([driver-home.md](driver-home.md)).  
**OA report:** [daily-usage-report.md](daily-usage-report.md) shows status + refuel.  
**Density:** Web compact; mobile comfortable.  
**Chrome:** Driver shell only.  
**Purpose:** Independently savable **Day Start** (open) and **End of Day** (close) against active next-travel vehicle, with optional **refuel** for Owner/Admin value.  
**Not in scope:** Edit/delete closed rows; GPS; photos; unit picker; mileage write-through; auto-open on login.

Reuse existing theme classes only. **No new hex.**

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
| No mileage write-through (A62) | No copy implying fleet odometer update |
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
        Save End of Day
    panel Your entries
      rows: date · status · vehicle · places · distances · times · refuel
```

**One active panel** at a time (Day Start XOR End of Day). List always below.

## States

| State | Treatment |
| --- | --- |
| Loading | skeletons |
| No travel | gate panel |
| Eligible, no open | Day Start form |
| Open row | End of Day form |
| Empty list | caption No daily usage entries yet |
| Success | polite live region “Day Start saved.” / “End of Day saved.” |
| Error | bannerDanger form-level; field errors inline |
| Offline | bannerWarning; submits disabled |

## A11y

- Panel `aria-label` Day Start / End of Day / Your daily usage
- Labels on all inputs; optional noted in label text
- Primary buttons: Save Day Start / Save End of Day
