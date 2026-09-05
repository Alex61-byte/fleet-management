# User stories — first slice

INVEST stories with Given/When/Then. One outcome each. Rules: [business-rules.md](business-rules.md). Scope: [requirements.md](requirements.md).

## US-01 — Register company and first Owner

**As** a person starting a fleet company  
**I need** to create an account with email, password, company registration number, VAT number, and address  
**So that** my company exists with required legal/address details and I am the Owner.

**Acceptance**

- **Given** I am not signed in and that email is not already a login identity  
  **When** I submit email, password (≥ 8), company registration number, VAT number, and address  
  **Then** a company is created with those company fields, I am the Owner of that company, and I can sign in.

- **Given** address lookup (free OSM/Nominatim-style) is available  
  **When** I use lookup and select a result (or type address manually)  
  **Then** the address field is filled with formatted address text I confirm; sign-up does not require paid maps or lat/lon.

- **Given** that email is already a login identity  
  **When** I submit sign-up  
  **Then** no new company is created and I am not signed in as a new Owner.

- **Given** registration number, VAT, or address is missing, or password is shorter than 8  
  **When** I submit sign-up  
  **Then** no company is created (E33).

- **Given** address lookup fails or is offline  
  **When** I still provide a non-empty address manually  
  **Then** I can complete sign-up if other fields are valid (E34).


## US-02 — Owner/Admin sign-in (web and mobile)

**As** an Owner or Admin  
**I need** to sign in with email and password on web and on mobile  
**So that** I can manage drivers and fleet.

**Acceptance**

- **Given** I am an Owner or Admin with a valid password and TOTP is **not** enabled  
  **When** I sign in on **web** with email and password  
  **Then** I am signed in as Owner/Admin.

- **Given** I am an Owner or Admin with a valid password and TOTP is **not** enabled  
  **When** I sign in on **mobile** with email and password  
  **Then** I am signed in as Owner/Admin (Owner/Admin mobile experience, not driver).

- **Given** my email or password is wrong  
  **When** I attempt sign-in  
  **Then** I am not signed in.

## US-03 — Reset password (Owner/Admin)

**As** an Owner or Admin  
**I need** to reset my password  
**So that** I can sign in again if I cannot use the current password.

**Acceptance**

- **Given** I am an Owner or Admin and I am not signed in  
  **When** I complete password reset with a new password that meets the password rule  
  **Then** I can sign in with the new password and I cannot sign in with the old password.

- **Given** I am not an Owner or Admin login  
  **When** I try to use Owner/Admin password reset  
  **Then** I do not gain Owner/Admin access.

## US-04 — Enable TOTP

**As** an Owner or Admin  
**I need** to turn on authenticator-app MFA  
**So that** sign-in requires a TOTP code as well as my password.

**Acceptance**

- **Given** I am signed in as Owner or Admin and TOTP is off  
  **When** I enable TOTP using an authenticator app  
  **Then** TOTP is enabled for **my** user only (not for drivers, not SMS).

- **Given** TOTP is enabled for me  
  **When** I sign in with correct email and password but no valid authenticator code  
  **Then** I am not fully signed in.

- **Given** TOTP is enabled for me  
  **When** I sign in with correct email, password, and valid authenticator code  
  **Then** I am signed in.

## US-05 — Disable TOTP

**As** an Owner or Admin  
**I need** to turn off authenticator-app MFA  
**So that** I can sign in with email and password only.

**Acceptance**

- **Given** I am signed in as Owner or Admin and TOTP is on  
  **When** I disable TOTP  
  **Then** TOTP is off for my user.

- **Given** TOTP is off for me  
  **When** I sign in with correct email and password and no authenticator code  
  **Then** I am signed in.

## US-06 — Create Admin

**As** an Owner  
**I need** to create an Admin for my company  
**So that** another company user can manage drivers and fleet.

**Acceptance**

- **Given** I am signed in as Owner  
  **When** I create an Admin with an email that is not already a login identity and a password that meets the password rule  
  **Then** that person is an Admin of **my** company and can sign in on web and mobile as Admin.

- **Given** I am signed in as Admin (not Owner)  
  **When** I try to create an Admin  
  **Then** no Admin is created.

- **Given** I am signed in as Owner and the email is already a login identity  
  **When** I try to create an Admin  
  **Then** no Admin is created.

## US-07 — Invite driver by email (Resend, no temporary password)

**As** an Owner or Admin  
**I need** to create a driver profile with email only and send an invitation  
**So that** the driver can set their own password and sign in on **mobile or web**.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the email is not already a login identity  
  **When** I create a driver with **email only** (no temporary password field)  
  **Then** the driver belongs to my company, `must_change_password` is true, no usable password exists, an invite token is issued (TTL 7 days), and the product **attempts** to send the invitation via **Resend**.

- **Given** create succeeded and Resend send succeeded  
  **When** I view the driver list  
  **Then** the driver appears as pending invite / must change password (invite pending).

- **Given** create succeeded but Resend send failed  
  **When** the create flow finishes  
  **Then** the driver profile **still exists** pending invite, and I am told the invitation email failed so I can retry (E30).

- **Given** I am signed in as Owner or Admin and the email is already a login identity  
  **When** I try to create a driver  
  **Then** no driver is created (E28).

- **Given** I am not signed in or I am a driver  
  **When** I try to create a driver  
  **Then** no driver is created.

There is **no** temporary password. Admin set-password / temp-password path is **out of scope**.

## US-08 — Edit driver

**As** an Owner or Admin  
**I need** to change a driver profile  
**So that** driver details stay current.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the driver is in my company  
  **When** I edit the driver profile  
  **Then** the stored driver profile shows the new details.

- **Given** the driver belongs to another company  
  **When** I try to edit that driver  
  **Then** the profile is not changed.

## US-09 — Accept driver invite and set password (web and mobile)

**As** an invited driver  
**I need** to open my invitation on **mobile or web**, confirm the invite email, and create my own password  
**So that** only I know the password and I can use minimal driver home.

**Acceptance**

- **Given** I have a valid, unexpired, unused invite token for my driver email  
  **When** I open the invite on **web** (link) and set a password ≥ 8 characters  
  **Then** the token is consumed, `must_change_password` is false, and I can use **minimal driver home on web** (no MFA, no Owner chrome).

- **Given** I have a valid, unexpired, unused invite token for my driver email  
  **When** I open the invite on **mobile** (deep link or equivalent token path) and set a password ≥ 8 characters  
  **Then** the token is consumed, `must_change_password` is false, and I can use **minimal driver home on mobile**.

- **Given** I am on invite accept (web or mobile)  
  **When** the email is not a pending invited driver / does not match the invite (unknown in system)  
  **Then** I **cannot continue**; no password is set (E26).

- **Given** the invite token is missing, expired, already used, or invalid  
  **When** I try to accept  
  **Then** accept is rejected; no password is set (E27).

- **Given** I am on invite accept  
  **When** I submit a password shorter than 8 characters  
  **Then** the password is not set and I still cannot use driver home (E29).

- **Given** login is disabled for that driver  
  **When** I try to accept the invite  
  **Then** accept is rejected; profile still exists (E10).

- **Given** I complete invite accept on web or mobile  
  **When** the flow succeeds  
  **Then** I am not asked for MFA.

- **Given** `must_change_password` is true (pending invite)  
  **When** I try driver home or Owner/Admin areas before accept  
  **Then** home is blocked and Owner/Admin areas are denied (E8).

## US-09a — Resend driver invitation **(Should)**

**As** an Owner or Admin  
**I need** to resend the invitation email for a driver who has not accepted yet  
**So that** they can still set a password if the first email failed or expired.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the driver is in my company with pending invite (`must_change_password` true, no password set)  
  **When** I resend the invitation  
  **Then** a new invite token is issued (previous rotated), TTL restarts at 7 days, and the product attempts to send via Resend.

- **Given** resend send fails  
  **When** the action finishes  
  **Then** the driver remains pending and I am told the email failed (E30).

- **Given** the driver already accepted (password set, `must_change_password` false)  
  **When** I try to resend invite  
  **Then** no onboarding invite is sent as a substitute for password reset (E32).

## US-10 — Subsequent driver login

**As** a driver who already accepted the invite and set a password  
**I need** to sign in on **mobile or web** with my current password  
**So that** I can use the driver experience again.

**Acceptance**

- **Given** I already completed invite accept  
  **When** I sign in on **mobile** with email and current password  
  **Then** I enter the driver experience and I am not forced through invite accept again.

- **Given** I already completed invite accept  
  **When** I sign in on **web** with email and current password  
  **Then** I enter **minimal driver home on web**, I am not forced through invite accept again, and I do **not** get Owner/Admin chrome.

- **Given** I have not accepted the invite yet (no password set)  
  **When** I attempt normal email/password sign-in  
  **Then** I am not signed in and must use invite accept (E31).

- **Given** my current password is wrong  
  **When** I attempt sign-in  
  **Then** I am not signed in.


## US-11 — Create vehicle with compliance fields

**As** an Owner or Admin  
**I need** to add a vehicle with plate, insurance, inspection, country of registration, and road tax  
**So that** the company’s fleet record exists.

**Acceptance**

- **Given** I am signed in as Owner or Admin  
  **When** I create a vehicle with make, model, license plate, insurance date, inspection date, country of registration, and road tax date  
  **Then** the vehicle is stored for my company with those fields.

- **Given** I am a driver or I am not signed in  
  **When** I try to create a vehicle  
  **Then** no vehicle is created.

Country is a field the Admin fills; the product does **not** apply a legal catalog.

## US-12 — Edit vehicle and compliance fields

**As** an Owner or Admin  
**I need** to change a vehicle’s details and compliance dates  
**So that** plate, insurance, inspection, registration country, and road tax stay current.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the vehicle is in my company  
  **When** I change make, model, plate, insurance, inspection, country of registration, or road tax dates  
  **Then** the stored vehicle shows the new values.

- **Given** the vehicle is in another company  
  **When** I try to edit it  
  **Then** it is not changed.

- **Given** I am signed in as Owner or Admin and the vehicle is in my company  
  **When** I open edit vehicle  
  **Then** make, model, license plate, country of registration, and each stored section date are shown as they are stored (null dates stay empty).

- **Given** I open **create** vehicle  
  **When** the form appears  
  **Then** fields are not filled from another vehicle’s data.

## US-13 — Expiry warning

**As** an Owner or Admin  
**I need** to be warned when insurance, inspection, or road tax dates are near or past expiry  
**So that** I can act before the vehicle is non-compliant.

**Acceptance**

- **Given** I am signed in as Owner or Admin and a vehicle in my company has insurance, inspection, or road tax date **within 30 days** from today  
  **When** I view fleet / that vehicle  
  **Then** I see a warning for each such date.

- **Given** such a date is **already past**  
  **When** I view fleet / that vehicle  
  **Then** I see a warning for that date.

- **Given** all insurance, inspection, and road tax dates are **more than 30 days** in the future (or null)  
  **When** I view fleet / that vehicle  
  **Then** I do not see an expiry warning for those dates.

- **Given** only `registration_on` is near or past  
  **When** I view fleet / that vehicle  
  **Then** I do **not** see an expiry warning or nav urgency from registration alone.

- **Given** I am a driver  
  **When** I use the driver app  
  **Then** I am not required to manage these warnings.

## US-28 — Vehicles nav urgency highlight

**As** an Owner or Admin  
**I need** the Vehicles navigation control to show orange or red when any fleet section date is at one week or under one week  
**So that** I notice compliance risk without opening the vehicle list first.

**Acceptance**

- **Given** I am signed in as Owner or Admin on **web** and any company vehicle has a non-null section with **`daysUntil &lt; 7`** (including overdue)  
  **When** I see the side navigation  
  **Then** the **Vehicles** item has a **red** urgency background (red over orange if both would apply).

- **Given** no red condition, and any company vehicle has a section with **`daysUntil = 7`**  
  **When** I see the side navigation  
  **Then** the **Vehicles** item has an **orange** urgency background.

- **Given** every non-null section has **`daysUntil &gt; 7`**, or there are no section dates / no vehicles  
  **When** I see the side navigation  
  **Then** Vehicles has **no** orange/red urgency background.

- **Given** I am signed in as Owner or Admin on **mobile**  
  **When** the Owner/Admin tab bar is shown  
  **Then** the **Vehicles** tab follows the **same** red / orange / none rules as web.

- **Given** I am a **driver** or not signed in  
  **When** I use the product  
  **Then** I do not get Owner/Admin Vehicles urgency chrome.

- **Given** only another company’s vehicles would be urgent  
  **When** I use my company session  
  **Then** my Vehicles nav urgency reflects **only my company**.

## US-14 — Driver cannot open Owner screens

**As** the company  
**I need** drivers to stay in the driver experience  
**So that** drivers cannot run Owner/Admin work.

**Acceptance**

- **Given** I am signed in as a driver on mobile  
  **When** I try to open Owner/Admin screens (create Admin, manage drivers, create/edit fleet)  
  **Then** I am denied and I remain in the driver experience.

- **Given** I am signed in as Owner or Admin on mobile  
  **When** I complete login  
  **Then** I see the Owner/Admin experience, not the driver experience.

## US-15 — Unauthenticated cannot open fleet

**As** the company  
**I need** fleet records to be unavailable without sign-in  
**So that** vehicle details are not open to anyone.

**Acceptance**

- **Given** I am not signed in  
  **When** I try to open fleet (web or mobile)  
  **Then** I do not see vehicle records and I am not able to create or edit vehicles.

- **Given** I am not signed in  
  **When** I try to open driver administration  
  **Then** I do not see or change driver profiles.

## US-16 — Disable driver login without deleting profile **(Should)**

**As** an Owner or Admin  
**I need** to stop a driver signing in without removing their profile  
**So that** the driver record remains but they cannot use the app.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the driver is in my company and currently allowed to sign in  
  **When** I disable that driver’s login  
  **Then** the driver profile still exists and the driver cannot sign in.

- **Given** that driver’s login is disabled  
  **When** I enable it again  
  **Then** the driver can sign in with their current password (or still must complete invite accept if they never did).

## US-27 — Hard delete driver profile **(Must)**

**As** an Owner or Admin  
**I need** to permanently delete a driver profile in my company  
**So that** the person is removed from the roster and cannot use driver sign-in under that profile.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the driver is in my company  
  **When** I hard-delete that driver profile (after confirming the destructive action)  
  **Then** the profile is no longer in my company’s drivers, the delete cannot be undone as the same profile, and that identity cannot sign in.

- **Given** that driver was signed in or could sign in  
  **When** the profile has been hard-deleted  
  **Then** they cannot continue or obtain a driver session for that deleted identity.

- **Given** a driver was hard-deleted and that email is not used by another login identity  
  **When** I create a driver with that email (US-07 invite)  
  **Then** a **new** driver profile is created with a **new** invite; it is not a restore of the deleted profile.

- **Given** the driver’s login was already disabled (US-16)  
  **When** I hard-delete that driver  
  **Then** the profile is removed the same as for an enabled driver.

- **Given** the driver belongs to another company, or I am a driver, or I am not signed in  
  **When** I try to hard-delete that driver  
  **Then** the profile is not deleted.

- **Given** I hard-delete a driver  
  **When** I view fleet vehicles  
  **Then** vehicle records are unchanged by the delete.

Hard delete is **distinct** from disable login (**US-16**). Do not fold delete into US-08 or US-16.

## US-29 — Stay signed in with silent refresh and 14-day max session **(Must)**

**As** a signed-in Owner, Admin, or Driver  
**I need** my login to persist and renew without re-entering credentials when the short access token expires  
**So that** I only sign in again about every two weeks (or when I sign out / my session is ended for security).

**Acceptance**

- **Given** I completed sign-in successfully and my refresh-token family is younger than **14 days**  
  **When** my access token expires and the app needs an authenticated API call (including startup session probe)  
  **Then** a new access token is obtained via refresh without asking for email/password and I remain signed in.

- **Given** my refresh-token family started **14 or more days** ago  
  **When** refresh is attempted (or access fails and refresh is required)  
  **Then** I am not signed in and I must complete sign-in again.

- **Given** I am signed in  
  **When** I explicitly sign out **on this client**  
  **Then** I am not signed in **on this client** until I sign in again (other clients unchanged — **US-30**).

- **Given** my principal is disabled, hard-deleted, or my refresh family is revoked/reused  
  **When** I try to continue or refresh  
  **Then** I am not signed in (existing rules 15, 28, 39; E10, E14).

- **Given** I restart the web app or mobile app within the 14-day window with a valid stored refresh token  
  **When** the app starts  
  **Then** I am still treated as signed in after silent renewal if needed (tokens persist per client storage rules).

Silent renewal is **not** a new screen. After forced session end (14-day cap or revoke), use existing sign-in; optional session-ended copy is Design-owned.

## US-30 — Parallel sessions on multiple devices / web + mobile **(Must)**

**As** an Owner, Admin, or Driver  
**I need** to stay signed in on more than one device or on web and mobile at the same time  
**So that** using a second phone or the other surface does not kick me out elsewhere.

**Acceptance**

- **Given** I am signed in as Owner/Admin on **web**  
  **When** I sign in as the same identity on **mobile** (or a second browser/device)  
  **Then** both sessions remain valid; the first is **not** revoked by the second sign-in.

- **Given** I have two valid sessions (two refresh families)  
  **When** I refresh or use APIs on either session  
  **Then** the other session continues to work until its own expiry, sign-out, or security end-rule.

- **Given** I sign out on **one** client  
  **When** I continue on the **other** client  
  **Then** I remain signed in on the other client.

- **Given** I am a **driver**  
  **When** I sign in on **web and mobile** (or two devices)  
  **Then** both sessions may be valid in parallel (own families); I still do **not** get Owner/Admin chrome (**E8**).

No new screens. No “devices” management UI in this slice. No global sign-out-everywhere.

## US-31 — Owner/Admin web side nav content icons **(Must)**

**As** an Owner or Admin on **web**  
**I need** each main side-nav destination to show a small content-reflecting outline icon beside its label  
**So that** I can scan Home, Drivers, Vehicles, Security, and Admins faster without changing navigation behavior.

**Acceptance**

- **Given** I am signed in as Owner or Admin on web  
  **When** I see the expanded main side navigation  
  **Then** each item shows **icon + visible label** (not icon-only): Home = house outline; Drivers = two people; Vehicles = truck; Security = shield; Admins (Owner only) = user + cog.

- **Given** those icons are shown  
  **When** assistive tech reads a nav item  
  **Then** icons are **decorative** (`aria-hidden`); the accessible name still comes from the label (Vehicles keeps **US-28** `vehiclesNavA11yLabel` when urgency ≠ none).

- **Given** US-28 Vehicles urgency is critical or warning  
  **When** I see the Vehicles item  
  **Then** urgency **fill and a11y name** are unchanged; the truck icon inherits urgency foreground with the label — **no** extra badge on the glyph.

- **Given** nav order, labels, and role gating today  
  **When** icons are added  
  **Then** order and destinations are **unchanged**; Admin still does not see Admins; Driver remains denied Owner chrome (E8) even when signed in on web.

No new routes or API. Icons are presentation-only (design: `design/pages/nav-icons.md`).

## US-32 — Owner/Admin mobile tab bar content icons **(Must)**

**As** an Owner or Admin on **mobile**  
**I need** each primary tab to show a small content-reflecting outline icon above its label  
**So that** I can recognize Home, Drivers, Vehicles, and More at a glance without changing tab behavior.

**Acceptance**

- **Given** I am signed in as Owner or Admin on mobile  
  **When** I see the Owner/Admin tab bar  
  **Then** each tab shows **icon above label**: Home = house outline; Drivers = two people; Vehicles = truck; More = horizontal three dots.

- **Given** those icons are shown  
  **When** assistive tech reads a tab  
  **Then** icons are decorative / not exposed as separate controls; the tab name remains the label (Vehicles keeps **US-28** accessibility label when urgency ≠ none).

- **Given** US-28 Vehicles urgency is critical or warning  
  **When** I see the Vehicles tab  
  **Then** urgency **fill, tint, and a11y name** are unchanged; the truck icon uses the same tint as the label — **no** second urgency badge on the glyph.

- **Given** Security and Admins are reached from **More** (not primary tabs)  
  **When** I use the tab bar  
  **Then** primary tabs stay Home → Drivers → Vehicles → More; no new tab destinations; Driver layout stays without this Owner tab set.

No new routes or API. Icons are presentation-only (design: `design/pages/nav-icons.md`).

## Design Specialist handoff

Spec **states** (empty, loading, error, success, warning, denied), **density**, and **accessibility**. Stay inside these stories. Do not add dispatch/tracking.

### Web

| Screen | Stories | Must show |
| --- | --- | --- |
| Company sign-up | US-01 | Email, password, confirm; **registration number**, **VAT**, **address** + free lookup assist; errors for duplicate email / password rule / missing company fields |
| Sign-in | US-02, US-04, US-10 | Email, password; TOTP for Owner/Admin when enabled; driver subsequent → minimal home; pending drivers directed to invite (not temp password) |
| Password reset | US-03 | Request reset; set new password (Owner/Admin only) |
| Owner/Admin home (post-login) | US-02 | Entry to drivers and fleet; not driver UI |
| Invite accept / set password | US-09 | Token from link; email match; create password; gate before minimal home; unknown email cannot continue |
| Driver home (minimal) | US-10 | Identity + sign-out; **no** Owner side nav / fleet / driver admin |
| Enable/disable TOTP | US-04, US-05 | Off → on (authenticator); on → off |
| Create Admin | US-06 | Owner only; deny Admin |
| Driver list | US-07, US-08, US-09a, US-16, US-27 | Company drivers; empty state; pending invite status |
| Create driver | US-07 | **Email only**; no temporary password; invite send result / failure |
| Edit driver | US-08, US-09a, US-16, US-27 | Profile edit; **Should:** resend invite if pending; **Should:** disable/enable login; **Must:** hard delete (confirm; distinct from disable) |
| Vehicle list | US-11–13, US-15 | Warnings for dates in 30 days or past |
| Create vehicle | US-11 | Make, model, plate, insurance, inspection, country registration, road tax (dates) |
| Edit vehicle | US-12, US-13 | Same fields; warnings |
| Unauthenticated block | US-15 | No fleet/driver admin without sign-in |

### Mobile (one app, two experiences after login)

| Screen | Role | Stories |
| --- | --- | --- |
| Sign-in | All | US-02, US-10, US-29, US-30 — then branch by role; optional session-ended banner; multi-device no extra chrome |
| Invite accept / set password | Driver invitee | US-09 (deep link / token path); unknown email cannot continue |
| Owner/Admin TOTP step | Owner/Admin | US-04 |
| Owner/Admin password reset | Owner/Admin | US-03 |
| Owner/Admin TOTP settings | Owner/Admin | US-04, US-05 |
| Create Admin | Owner | US-06 |
| Driver list / create / edit | Owner/Admin | US-07, US-08, US-09a, US-16, US-27 |
| Vehicle list / create / edit + expiry warning | Owner/Admin | US-11–13 |
| Driver home | Driver, after invite accept | US-10 — **no** Owner/Admin navigation (web + mobile) |
| Denied Owner/Admin areas | Driver | US-14 / E8 (not blanket web denial) |
| Unauthenticated | None | US-15 — no fleet |

**Driver mobile this slice:** invite accept / set password, subsequent sign-in, driver home (minimal—**no** fleet admin). Do not invent trip/dispatch screens.

**Won’t for Design this slice:** two store listings, SMS MFA, document upload, legal catalog, dispatcher/mechanic UI, temporary password create, paid maps.

When page specs exist, next specialist is **Senior Software Architect**.


## US-33 — Driver selects vehicle for next travel

**As** a signed-in driver  
**I need** to choose a company vehicle for my next travel  
**So that** the trip is tied to the right asset.

**Acceptance**

- **Given** I am signed in as a driver and my company has at least one vehicle  
  **When** I open driver home / next travel  
  **Then** I see company vehicles I can select (make, model, plate).

- **Given** I select a vehicle  
  **When** I confirm selection with a valid odometer reading  
  **Then** that vehicle is my **active** next-travel vehicle and previous active selection (if any) is replaced.

- **Given** my company has no vehicles  
  **When** I open next travel  
  **Then** I see empty state and cannot select.

- **Given** I am Owner/Admin or not signed in  
  **When** I call driver travel select APIs  
  **Then** I cannot create a driver travel selection as a driver identity (Owner uses different surfaces; unauthenticated is 401).

- **Given** a vehicle id from another company  
  **When** I try to select it  
  **Then** selection fails (not found / forbidden).

## US-34 — Odometer on vehicle selection (miles/km by country)

**As** a signed-in driver  
**I need** to enter odometer in the correct unit for the vehicle’s registration country  
**So that** mileage is recorded consistently.

**Acceptance**

- **Given** I am selecting a vehicle whose country of registration is a **miles** jurisdiction (e.g. US, UK)  
  **When** I enter odometer  
  **Then** the unit shown and stored is **miles**.

- **Given** I am selecting a vehicle whose country is any other value (e.g. RO, DE) or empty  
  **When** I enter odometer  
  **Then** the unit shown and stored is **kilometres**.

- **Given** I enter a negative odometer or leave it blank  
  **When** I submit  
  **Then** selection is not saved and I see validation feedback.

- **Given** I successfully selected with odometer  
  **When** I view driver home  
  **Then** I see the active vehicle identity, plate, odometer value, and unit.

