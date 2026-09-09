# Nav & tab icons (US-31 / US-32)

**Stories:** US-31 (web Owner/Admin side nav), US-32 (mobile Owner/Admin tab bar)  
**Kind:** Pure presentation. No routes, authz, or API change.  
**Chrome base:** [_patterns.md](_patterns.md) authenticated shell.  
**Preserve:** [US-28 Vehicles urgency](_patterns.md#vehicles-nav--tab-urgency-us-28--states--stacking) fills, stacking, and accessible names.

**In scope:** Management web sidebar items + mobile tabs (**Company** Owner/Admin and **Individual** Owner); **plus** chrome glyph **bell** for Global Header notifications (US-70) — not a nav destination.  
**Out of scope:** Driver chrome, public/auth, landing, page-body icons (except notification control), icon-only nav (except **collapsed** web sidebar, already specified).  
**Account kind:** **Individual Owner** never shows **Drivers** or **Admins** destinations (US-82) — omit icons entirely, do not gray-out.

## 1. Inventory & metaphor map

Same **metaphor** on web and mobile wherever both surfaces show the destination. Visible **label always stays**; icon is decorative.

| Destination | Surfaces | Visible label | Metaphor (name) | Reads as | Do not use |
| --- | --- | --- | --- | --- | --- |
| Home | Web + mobile tab | Home | **home** | House outline — post-login entry | Grid/dashboard “apps” glyph; brand plate |
| Drivers | Web + mobile tab — **Company only** | Drivers | **users** | Two-person outline — roster | Single user only; steering wheel; **Individual shell** |
| Vehicles | Web + mobile tab — Company + Individual | Vehicles | **truck** | Simple truck / light commercial side outline — fleet assets | License plate (reserved for product mark); sports car; map pin |
| Security | Web sidebar; mobile via **More** only — Company + Individual | Security | **shield** | Shield outline — MFA / account protection | Fingerprint; QR; plain lock alone (optional lock *inside* shield is OK if one path stays legible at 20px) |
| Admins | Web sidebar (**Company Owner**); mobile via **More** only | Admins | **user-cog** | Single user + small cog — elevated company admins | Crown; star; shield-user that collides with Security; **Individual / Company Admin** |
| More | Mobile tab only | More | **more** | Three dots **horizontal** — overflow to Security / (Company Owner) Admins | Hamburger that implies a drawer; gear (Security owns protection metaphor) |

**Web order — Company Owner:** Home → Drivers → Vehicles → Security → Admins.  
**Web order — Company Admin:** Home → Drivers → Vehicles → Security.  
**Web order — Individual Owner:** Home → Vehicles → Security.  
**Mobile tabs — Company:** Home → Drivers → Vehicles → More.  
**Mobile tabs — Individual:** Home → Vehicles → More (More → Security only).  
Icons **do not** invent destinations; they **follow** which destinations the shell exposes.

### Chrome glyphs (not nav destinations)

| Control | Surfaces | Visible label | Metaphor (name) | Reads as | Do not use |
| --- | --- | --- | --- | --- | --- |
| Notifications (US-70) | OA Global Header web + mobile app bar | none (icon button; a11y name “Notifications…”) | **bell** | Outline bell — in-app compliance alerts menu | Solid filled bell as default; inbox tray; megaphone; red circle alone; brand plate |

- Same stroke system as nav icons (`navIcon` 20px, outline, `currentColor`, `aria-hidden` on glyph).  
- Unread **count** is a separate `notifBadge` on the **control**, not a second glyph — [global-header.md](global-header.md).  
- **Not** placed on sidebar items or tab bar.

## 2. Composition — icon + label (not icon-only)

| Surface | Layout | Gap (existing) | Label type |
| --- | --- | --- | --- |
| Web sidebar expanded | Row: icon then label | `navItem` `gap-1.5` (12px) | `text-label`; selected `font-semibold` |
| Web sidebar collapsed (64px) | Icon centered in hit target; **no** visible label | — | Accessible name + tooltip = destination label (Vehicles urgency phrase when US-28 active) |
| Mobile tab | Column: icon above label | `tabItem` `gap-0.5` (4px) | `text-caption`; selected `font-semibold` |

- Hit target remains **`min-h-hit` (44px)** on the **control** (`navItem` / `tabItem`), not on the glyph alone.
- Do **not** ship icon-only expanded sidebar or icon-only tabs.
- Do **not** put a second badge/dot on the icon for US-28 — urgency stays **item fill + a11y name** only.

## 3. Size, stroke, color

### Size token

| Token | Value | Class | Use |
| --- | --- | --- | --- |
| `nav-icon` | **20px** | `navIcon` → `h-nav-icon w-nav-icon shrink-0` | All nav/tab glyphs (web + mobile) |
| Collapsed rail | still **20px** glyph in 44×44 hit | same `navIcon` | Do not scale to 24 (mark size) — mark stays product identity only |

ViewBox for every glyph: **`0 0 24 24`**. Draw at 20×20 via `navIcon` (scale); do not retune paths per size.

### Stroke

| Property | Spec |
| --- | --- |
| Style | **Outline only** (stroke, no fill) — calm ops console; works on navy rail and raised tab bar |
| `stroke-width` | **1.75** at 24 viewBox (≈1.5px visual at 20px). If a platform rounds better at integer, **2** is acceptable — pick one and use it on **all nav glyphs + bell** |
| `stroke-linecap` / `linejoin` | `round` |
| Fill | `none` (except tiny centers if a metaphor needs a dot — prefer pure stroke) |
| Optical | Keep paths simple; avoid hairline interior detail that dies at 20px |

### Color — inherit only (no hex, no one-off fills)

Icons use **`currentColor`** (web SVG `stroke="currentColor"`) or the parent **tint** (RN `color` / tab bar tint). They inherit the **same text class** as the label on that control.

| Chrome state | Web sidebar icon+label | Mobile tab icon+label |
| --- | --- | --- |
| Default | `text-nav-fg` | `text-text-secondary` (`tabItem`) |
| Hover (web) | `text-nav-fg-selected` with `navItemHover` | platform press; no extra icon color |
| Selected (no urgency) | `text-nav-fg-selected` / `navItemSelected` | `text-brand` / `tabItemSelected` |
| Vehicles **urgency** (US-28) | `text-nav-urgency-fg` with urgency fill classes | same `text-nav-urgency-fg` / tab urgency classes |
| Focus | no separate icon color — `navItemFocus` / `tabItemFocus` on control | same |

**Do not** paint icons with `brand`, `danger`, or badge `*-subtle` outside the table above.  
**Do not** hardcode hex in app chrome (mobile tab layout today still has raw hex for tints — FE should migrate tints to tokens when touching this slice; Design does not introduce new hex).

## 4. Accessibility

| Rule | Spec |
| --- | --- |
| Decorative | Every nav/tab icon: **`aria-hidden="true"`** (web) / accessible **ignored** on RN (`accessible={false}` on the glyph wrapper, or equivalent) |
| Name | Comes from **visible label** + existing control name. Web: link text “Home”, etc. Vehicles keeps `vehiclesNavA11yLabel(urgency)` when urgency ≠ none |
| Selected | `aria-current="page"` (web) / selected tab state (mobile) **unchanged** |
| Color-only | Selected = weight + edge + icon+label color together; urgency = fill + name (US-28) — icons do not carry meaning alone |
| Collapsed | Tooltip / `aria-label` = label text (or Vehicles urgency phrase); icon still `aria-hidden` |
| Reduce-motion | Static glyphs; no pulse, bounce, or animated stroke |

## 5. Library recommendation

| Option | Verdict |
| --- | --- |
| **Custom SVG set (6 nav + 1 bell)** | **Prefer.** Set is tiny and fixed; matches existing **BrandMark** inline-SVG pattern; zero icon-pack dependency; full control of 20px legibility and `currentColor`. |
| `lucide-react` + `lucide-react-native` | Acceptable **only** if FE rejects hand-maintained paths. Pin both to the **same lucide version**. Tree-shake to the six nav names (`Home`, `Users`, `Truck`, `Shield`, `UserCog`, `MoreHorizontal`) **plus** `Bell` for US-70. Still outline + `currentColor`. |
| `@expo/vector-icons` / Font Awesome / etc. | **Avoid** for this slice — font glyphs, inconsistent stroke, harder token tint parity web↔mobile. |

**Mobile drawing:** custom paths need **`react-native-svg`** (Expo-compatible pin) if not already direct; that is a **renderer**, not an icon library. Web: inline `<svg>` like `BrandMark`.

**Shared geometry (custom path):** keep one canonical path list in a small shared module or duplicated identical paths in web `ui` + mobile `ui` — Architect may choose package placement; Design requires **identical metaphors and viewBoxes** (nav six + bell).

## 6. themeClasses / tokens (this slice)

| Kind | Name | Value / class list |
| --- | --- | --- |
| Spacing | `nav-icon` | `20px` — [spacing.json](../tokens/spacing.json), [tailwind.theme.ts](../tailwind.theme.ts) |
| Class | `navIcon` | `h-nav-icon w-nav-icon shrink-0` |
| Class | `navIconGlyph` | optional helper: ensure SVG fills the box (`h-full w-full`); stroke via currentColor in markup, not a color class |

`navItem` / `tabItem` gaps already correct (`gap-1.5` / `gap-0.5`). No new color tokens.

## 7. States (chrome only)

| State | Icon behavior |
| --- | --- |
| Loading shell | If nav skeleton: no icons required; or muted static icons — prefer label skeletons only |
| Default / hover / selected | Color inheritance per §3 |
| Vehicles urgency | Icon uses `nav-urgency-fg`; fill on **item**, not on icon background |
| Denied / driver / public | No these icons |
| Offline | Icons unchanged |

## 8. Engineering follow-ups (no feature code here)

1. **Frontend** — render icon + label on web `app-shell` items and mobile `(owner)` tabs per map; `aria-hidden` on glyphs; keep US-28 class + a11y helpers.  
2. **Frontend** — implement six outline SVGs (or pinned lucide pair if chosen); wire `themeClasses.navIcon`.  
3. **Frontend** — collapsed sidebar: icon-only + tooltip name (if collapse ships); expanded always icon+label.  
4. **Architect** — confirm no contract change (presentation-only); optional note on shared icon module vs per-app duplication; `react-native-svg` pin if custom paths on mobile.  
5. **Backend** — **no-op**.

**Next specialist: Senior Software Architect** (then FE). Design only in this pass.
