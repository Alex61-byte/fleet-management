# User stories — first slice

INVEST stories with Given/When/Then. One outcome each. Rules: [business-rules.md](business-rules.md). Scope: [requirements.md](requirements.md).

## US-01 — Register company and first Owner


**Account kind:** **Company** only (after US-77 chooses Company).

**As** a person starting a fleet company  
**I need** to create an account with email, password, company registration number, VAT number, and address  
**So that** my company exists with required legal/address details and I am the Owner.

**Acceptance**

- **Given** I chose **Company** (or equivalent Company sign-up entry) and I am not signed in and that email is not already a login identity  
  **When** I submit email, password (≥ 8), company registration number, VAT number, and address  
  **Then** a company is created with those company fields (`account_kind = company`), I am the Owner of that company, and I can sign in.

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

- **Given** I completed sign-in (Owner/Admin or Driver) on **web or mobile** and my refresh-token family is younger than **14 days**  
  **When** my access token expires and the app needs an authenticated API call (including startup session probe)  
  **Then** a new access token is obtained via refresh **without** email/password and **without** TOTP (if Owner/Admin), and I remain signed in.

- **Given** my refresh-token family started **14 or more days** ago  
  **When** refresh is attempted (or access fails and refresh is required)  
  **Then** I am not signed in and I must complete **full** sign-in again (existing sign-in; TOTP if enabled for Owner/Admin).

- **Given** I am signed in  
  **When** I explicitly sign out **on this client**  
  **Then** I am not signed in **on this client** until I sign in again (other clients unchanged — **US-30**).

- **Given** my principal is disabled, hard-deleted, or my refresh family is revoked/reused  
  **When** I try to continue or refresh  
  **Then** I am not signed in (existing rules 15, 28, 39; E10, E14).

- **Given** I restart the web app or mobile app within the 14-day window with a valid stored refresh token  
  **When** the app starts  
  **Then** I am still treated as signed in after silent renewal if needed (tokens persist per client storage rules).

Silent renewal is **not** a new screen. After forced session end (14-day cap or revoke), clients **must show the existing sign-in screen** (not a bare “sign in required” placeholder); optional session-ended copy is Design-owned.

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
| Driver home / start (minimal) | US-10, US-66 | Identity + hub to Next travel / Handover / Daily usage + sign-out; **no** auto-open task forms; **no** Owner side nav / fleet / driver admin |
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
| Sign-in | All | US-02, US-04, US-10, US-29, US-30 — then branch by role; optional session-ended banner; multi-device no extra chrome; silent refresh has no chrome |
| Invite accept / set password | Driver invitee | US-09 (deep link / token path); unknown email cannot continue |
| Owner/Admin TOTP step | Owner/Admin | US-04 |
| Owner/Admin password reset | Owner/Admin | US-03 |
| Owner/Admin TOTP settings | Owner/Admin | US-04, US-05 |
| Create Admin | Owner | US-06 |
| Driver list / create / edit | Owner/Admin | US-07, US-08, US-09a, US-16, US-27 |
| Vehicle list / create / edit + expiry warning | Owner/Admin | US-11–13 |
| Driver home / start | Driver, after invite accept | US-10, US-66 — calm start hub; travel, handover & daily usage are opt-in screens; **no** Owner/Admin navigation (web + mobile) |
| Daily usage | Driver | US-61–US-67 — create + own list; gated on next-travel; offline block |
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
  **Then** the unit shown and stored is **kilometers**.

- **Given** I enter a negative odometer or leave it blank  
  **When** I submit  
  **Then** selection is not saved and I see validation feedback.

- **Given** I successfully selected with odometer  
  **When** I view driver home  
  **Then** I see the active vehicle identity, plate, odometer value, and unit.


## US-35 — Optional vehicle side images on create/edit **(Must)**

**As** an Owner or Admin  
**I need** to attach optional photos of a vehicle from FRONT, LEFT, RIGHT, and BACK  
**So that** the fleet record shows what the vehicle looks like from all sides.

**Acceptance**

- **Given** I am signed in as Owner or Admin  
  **When** I create or edit a company vehicle and attach a valid image to one or more of FRONT, LEFT, RIGHT, BACK  
  **Then** each attached side stores a reference to the image in Supabase Storage for my company’s vehicle.

- **Given** I create or edit a vehicle  
  **When** I save without any side images  
  **Then** the vehicle is still saved; all four sides may be empty.

- **Given** I am on create or edit  
  **When** I only fill some sides  
  **Then** filled sides have images and unfilled sides remain empty.


## US-36 — One image per side; replace **(Must)**

**As** an Owner or Admin  
**I need** at most one current photo per side and to replace it when I upload again  
**So that** the record stays unambiguous.

**Acceptance**

- **Given** a vehicle already has a FRONT image  
  **When** I upload a new valid FRONT image  
  **Then** FRONT shows the new image and the previous FRONT is no longer the current image.

- **Given** a side already has an image  
  **When** I upload without clearing first  
  **Then** the upload is treated as replace (not a second concurrent image for that side).


## US-37 — Clear a side image **(Must)**

**As** an Owner or Admin  
**I need** to remove a side photo using a clear **icon** and a **confirmation** step  
**So that** outdated or wrong photos are not shown and I do not clear a photo by mistake.

**Acceptance**

- **Given** a vehicle has an image on LEFT and I am on web or mobile as Owner/Admin  
  **When** I activate the clear **icon** for LEFT  
  **Then** a **confirmation modal** (or sheet) appears and LEFT is **not** cleared yet.

- **Given** the clear confirmation is open for LEFT  
  **When** I cancel or dismiss  
  **Then** LEFT still shows its image; storage for that side is unchanged by this attempt **(E41)**.

- **Given** the clear confirmation is open for LEFT  
  **When** I confirm clear  
  **Then** LEFT is empty on subsequent reads, the storage object for that side is deleted (or equivalent cleanup), and the product does not present that file as current. Other sides’ images remain.

- **Given** a side is already empty  
  **When** I view that side slot  
  **Then** there is no clear-delete action required; if clear is invoked, the side stays empty (**idempotent**); no storage error is required.

## US-40 — Confirm before delete (pattern) **(Must)**

**As** the product  
**I need** every delete of a user-visible asset or record to require confirmation  
**So that** operators do not destroy data with one accidental activation.

**Acceptance**

- **Given** a product action deletes a user-visible asset or record (including future features)  
  **When** the user would perform that delete  
  **Then** a confirmation modal/sheet is required before the delete runs; first activation of the trigger only opens confirm.

- **Given** US-27 hard-delete driver  
  **When** I use delete on driver edit  
  **Then** confirm remains required; pattern is consistent with side-image clear **(A41)**.


## US-38 — Side image validation and authz **(Must)**

**As** the product  
**I need** type/size limits and role/company isolation on side images  
**So that** storage and tenancy stay safe.

**Acceptance**

- **Given** I upload a valid image of any image type that is ≤ 5 MB
  **When** the upload is submitted for a side
  **Then** that side is updated with the new image reference.
- **Given** I upload a non-image file or a file larger than 5 MB  
  **When** the upload is submitted for a side  
  **Then** that side is not updated; I see a validation/error state for that side.

- **Given** I am a driver, unsigned-in, or acting on another company’s vehicle  
  **When** I try to upload, replace, or clear a side image  
  **Then** the operation fails and images are unchanged.

- **Given** storage fails after client validation  
  **When** upload cannot complete  
  **Then** that side keeps its prior reference (or empty); no broken reference is stored.


## US-39 — Edit prepopulate side images + list cue **(Must / Should)**

**As** an Owner or Admin  
**I need** edit to show existing side images and a light list cue when any exist  
**So that** I can manage photos without guessing.

**Acceptance**

- **Given** a vehicle has some side images  
  **When** I open edit  
  **Then** filled sides show their current images and empty sides show empty slots, with other vehicle fields prepopulated.

- **Given** a vehicle has at least one side image (**Should**)  
  **When** I view the vehicles list  
  **Then** I see a compact presence cue (not a four-up gallery on the list row).

- **Given** a vehicle has no side images  
  **When** I view the list  
  **Then** there is no photo-presence cue for that row.


## US-45 — Optional vehicle mileage on create **(Must)**

**As** an Owner or Admin  
**I need** to optionally record the vehicle’s current odometer reading when I create a vehicle  
**So that** fleet inventory holds known mileage without requiring it for every asset.

**Acceptance**

- **Given** I am signed in as Owner or Admin  
  **When** I create a vehicle with a valid mileage (number ≥ 0, at most 1 decimal)  
  **Then** the vehicle is stored with that mileage and a server-derived mileage unit from country of registration.

- **Given** I create a vehicle  
  **When** I leave mileage empty  
  **Then** the vehicle is saved with unknown/null mileage.

- **Given** I enter negative mileage, non-numeric mileage, or more than 1 decimal place  
  **When** I submit create  
  **Then** the vehicle is not saved with that mileage (validation; E42).


## US-46 — Edit or clear vehicle mileage **(Must)**

**As** an Owner or Admin  
**I need** to change or clear a vehicle’s stored mileage on edit  
**So that** the fleet record stays current when the reading is known or becomes unknown.

**Acceptance**

- **Given** I am signed in as Owner or Admin and the vehicle is in my company  
  **When** I open edit vehicle  
  **Then** stored mileage is prepopulated (empty if null), with unit label Miles or Kilometers from country.

- **Given** the vehicle is in my company  
  **When** I set a valid new mileage and save  
  **Then** stored mileage shows the new value.

- **Given** the vehicle has mileage set  
  **When** I clear mileage (empty/null) and save  
  **Then** mileage is unknown/null on subsequent reads.

- **Given** the vehicle is in another company  
  **When** I try to edit mileage  
  **Then** it is not changed.


## US-47 — Mileage unit from country **(Must)**

**As** an Owner or Admin  
**I need** the mileage control to use Miles or Kilometers from registration country  
**So that** unit matches driver odometer rules and is not a free choice.

**Acceptance**

- **Given** country of registration is a miles jurisdiction (US/USA/United States, GB/UK/United Kingdom, LR/Liberia, MM/Myanmar and common aliases)  
  **When** I view or edit mileage  
  **Then** the unit shown is **Miles** and mileage_unit is **mi**.

- **Given** country is any other non-empty value or empty/unknown  
  **When** I view or edit mileage  
  **Then** the unit shown is **Kilometers** and mileage_unit is **km**.

- **Given** I am on create or edit  
  **When** I try to pick a unit myself  
  **Then** there is no unit selector; unit follows country only.

- **Given** a vehicle has a stored mileage number and I change country so the derived unit flips  
  **When** I save  
  **Then** the number is **not** auto-converted; only the unit label/mileage_unit changes (E43).


## US-48 — Vehicle mileage authz **(Must)**

**As** the product  
**I need** only Owner/Admin of the vehicle’s company to write vehicle mileage  
**So that** drivers and other companies cannot alter fleet master data.

**Acceptance**

- **Given** I am a driver, unsigned-in, or acting on another company’s vehicle  
  **When** I try to set vehicle mileage  
  **Then** the write fails and mileage is unchanged (E44).

- **Given** a driver saves next-travel odometer  
  **When** the travel selection is stored  
  **Then** vehicle.mileage is **not** updated (A43).


## US-49 — Owner/Admin list shows mileage when present **(Must)**

**As** an Owner or Admin  
**I need** to see stored mileage on the vehicles list when it is known  
**So that** I can scan fleet readings without opening every edit screen.

**Acceptance**

- **Given** a company vehicle has mileage set  
  **When** I view the Owner/Admin vehicles list  
  **Then** I see the mileage value with the correct unit (Miles or Kilometers / mi or km).

- **Given** a company vehicle has null mileage  
  **When** I view the list  
  **Then** I do not see a fabricated mileage value for that row.


## US-50 — Driver list may show vehicle mileage read-only **(Should)**

**As** a signed-in driver  
**I need** optional read-only current vehicle mileage on the company vehicle list  
**So that** I can see fleet-recorded readings without editing vehicles.

**Acceptance**

- **Given** I am a driver listing company vehicles for next travel and a vehicle has mileage  
  **When** the list is shown  
  **Then** I **may** see mileage + unit read-only.

- **Given** I am a driver  
  **When** I use driver home  
  **Then** I still cannot create or edit vehicle mileage (fleet admin remains denied).

## US-51 — Driver Handover Out **(Must)**

**As** a signed-in driver  
**I need** to complete a Handover Out when taking my selected vehicle  
**So that** custody start, mileage, and next-service data are recorded.

**Acceptance**

- **Given** I am a driver with an active next-travel vehicle and that vehicle has no open Out and I have no open Out  
  **When** I submit Handover Out with valid mileage, next_service_days, and next_service_distance  
  **Then** an Out handover is stored open, linked to me and the vehicle, and `vehicle.mileage` equals the submitted mileage.

- **Given** damages text and/or images are omitted  
  **When** I submit valid required fields  
  **Then** Out still succeeds.

- **Given** I have no active next-travel selection  
  **When** I try Handover Out  
  **Then** it fails and no handover is created (E45).

- **Given** the vehicle already has an open Out  
  **When** I try Handover Out  
  **Then** it fails (E46).

## US-52 — Driver Handover In **(Must)**

**As** a signed-in driver  
**I need** to complete a Handover In when returning the vehicle  
**So that** the open Out is closed and return condition is recorded.

**Acceptance**

- **Given** I have an open Out on my active next-travel vehicle  
  **When** I submit Handover In with valid required fields and mileage ≥ Out mileage and ≥ current vehicle.mileage  
  **Then** In is stored, the pair is closed, and `vehicle.mileage` updates to In mileage.

- **Given** I have no open Out on that vehicle  
  **When** I try In  
  **Then** it fails (E48).

- **Given** another driver holds the open Out  
  **When** I try In  
  **Then** it fails (E49).

## US-53 — Handover field validation **(Must)**

**As** the product  
**I need** required fields and numeric rules enforced on Out and In  
**So that** incomplete or invalid handovers are not stored.

**Acceptance**

- **Given** mileage, next_service_days, or next_service_distance is missing  
  **When** I submit Out or In  
  **Then** rejected (E50).

- **Given** mileage negative, non-numeric, >1 decimal, or below monotonic floor  
  **When** I submit  
  **Then** rejected (E51).

- **Given** next_service_days is not an integer ≥ 1, or next_service_distance invalid  
  **When** I submit  
  **Then** rejected (E52).

- **Given** country implies miles vs km  
  **When** I enter mileage / next_service_distance  
  **Then** unit label and stored unit follow A34 (no unit picker).

## US-54 — Damage images on handover **(Must)**

**As** a signed-in driver  
**I need** to attach optional damage photos on Out or In  
**So that** condition evidence is stored with the handover and vehicle.

**Acceptance**

- **Given** I attach 1–10 valid images (≤5 MB, image type) on Out or In  
  **When** handover succeeds  
  **Then** each image is stored in object storage with references linked to that handover and vehicle.

- **Given** I attach a non-image or file >5 MB or would exceed 10 images  
  **When** I submit  
  **Then** upload/handover rejected for that fault (E53); no broken references.

- **Given** images are present and damages text is empty  
  **When** I submit otherwise valid handover  
  **Then** handover is accepted (A49).

## US-55 — Owner/Admin Handovers tab (history) **(Must)**

**As** an Owner or Admin  
**I need** a third tab on the vehicle page for handover history  
**So that** I can review Out/In activity for that asset.

**Acceptance**

- **Given** I open a company vehicle as Owner/Admin (web or mobile)  
  **When** the vehicle UI is shown  
  **Then** I see tabs including **Details**, **Images**, and **Handovers** (third).

- **Given** the vehicle has handovers  
  **When** I open the Handovers tab  
  **Then** I see a history list (type Out/In, time, driver, mileage summary) newest-first.

- **Given** the vehicle has no handovers  
  **When** I open Handovers  
  **Then** I see empty state.

- **Given** I am a driver  
  **When** I use vehicle/fleet UI  
  **Then** I do **not** get the Handovers history tab (E55).

## US-56 — Owner/Admin handover detail **(Must)**

**As** an Owner or Admin  
**I need** to open a handover from history and see full details  
**So that** I can inspect mileage, next service, damages text, and photos.

**Acceptance**

- **Given** I am Owner/Admin on Handovers history  
  **When** I open one handover  
  **Then** I see type, timestamps, driver identity (if available), mileage + unit, next_service_days, next_service_distance + unit, damages text, and damage images (or empty).

- **Given** history/detail  
  **When** I look for edit or delete  
  **Then** none are offered this slice (E57).

## US-57 — Handover authz and tenancy **(Must)**

**As** the product  
**I need** role and company checks on handover create and history  
**So that** custody data stays isolated.

**Acceptance**

- **Given** unsigned-in or Owner/Admin  
  **When** they attempt driver handover create  
  **Then** denied; no handover (E54).

- **Given** driver or Owner/Admin of another company  
  **When** they access this company’s handovers  
  **Then** not found / denied (E56).

- **Given** driver  
  **When** they call Owner/Admin handover history for a vehicle  
  **Then** denied (E55).

## US-58 — Edge: already out / wrong vehicle / incomplete **(Must)**

**As** a driver  
**I need** clear failure when Out/In is not allowed  
**So that** I do not create duplicate or orphan custody.

**Acceptance**

- **Given** I already have an open Out on vehicle A  
  **When** I try Out on vehicle B (even if selected)  
  **Then** rejected (E47) until I complete In on A (or open Out is otherwise cleared per delete rules).

- **Given** my active selection is vehicle A but open Out is on A  
  **When** I complete In for A with valid fields  
  **Then** success (US-52).

- **Given** required fields incomplete  
  **When** I submit  
  **Then** no handover row created (E50).

## US-59 — Mileage write-through and monotonicity **(Must)**

**As** the product  
**I need** handover mileage to update fleet mileage safely  
**So that** vehicle.mileage reflects latest custody reading without regressions.

**Acceptance**

- **Given** successful Out or In with mileage M  
  **When** handover is stored  
  **Then** vehicle.mileage = M.

- **Given** vehicle.mileage is 1000  
  **When** I submit handover mileage 999  
  **Then** rejected (E51).

- **Given** Out mileage was 1000  
  **When** I submit In with 999  
  **Then** rejected (E51).

- **Given** I only PUT next-travel selection (no handover)  
  **When** selection saves  
  **Then** vehicle.mileage is still not updated by that path (A43 unchanged).

## US-60 — Driver open-Out awareness **(Should)**

**As** a signed-in driver  
**I need** to see that I have an open Out on my vehicle  
**So that** I know I must Handover In.

**Acceptance**

- **Given** I have an open Out on my active vehicle  
  **When** I open driver home / start  
  **Then** I can see that Out is open (hub cue) and I can open Handover to start In.

- **Given** I have no open Out  
  **When** I open driver home / start with a selection  
  **Then** I can open Handover and start Out (if eligible).

- **Given** I sign in as a driver  
  **When** the session lands on driver home / start  

## US-61 — Create Daily usage **(Must)**

**As** a signed-in driver  
**I need** to log Daily usage for my active next-travel vehicle  
**So that** start/end places, distances, and times for that use are recorded.

**Acceptance**

- **Given** I have an active next-travel vehicle  
  **When** I submit Date, Start place, Start distance, Start time, End place, End distance, End time — all valid  
  **Then** a Daily usage row is stored for **me** and that **vehicle**, and I can see it in my list.

- **Given** the form is opened fresh  
  **When** I view Date  
  **Then** it defaults to **today (local)** and I may change it to another calendar date.

- **Given** save succeeds  
  **When** I inspect fleet vehicle mileage  
  **Then** `vehicle.mileage` is **unchanged** by this save (A62).

- **Given** I already saved one entry for today  
  **When** I submit another valid entry the same date  
  **Then** both exist (A64).

## US-62 — Daily usage field validation **(Must)**

**As** a signed-in driver  
**I need** invalid Daily usage rejected  
**So that** incomplete or inconsistent logs are not stored.

**Acceptance**

- **Given** any required field is missing  
  **When** I submit  
  **Then** no row is created (E61).

- **Given** start/end distance negative, non-numeric, or &gt;1 decimal  
  **When** I submit  
  **Then** rejected (E62).

- **Given** end_distance &lt; start_distance  
  **When** I submit  
  **Then** rejected (E62).

- **Given** vehicle.mileage is set and start_distance &lt; vehicle.mileage  
  **When** I submit  
  **Then** rejected (E62).

- **Given** end_time &lt; start_time on the usage date  
  **When** I submit  
  **Then** rejected (E63).

- **Given** active vehicle country is miles vs kilometres jurisdiction  
  **When** I enter distances  
  **Then** labels/stored unit follow A34 (no unit picker).

## US-63 — List own Daily usage **(Must)**

**As** a signed-in driver  
**I need** to see my own Daily usage entries  
**So that** I can confirm what I logged.

**Acceptance**

- **Given** I have one or more Daily usage rows  
  **When** I open Daily usage list  
  **Then** I see **my** entries (vehicle identity/plate, date, places, distances+unit, times), newest first.

- **Given** I have no entries  
  **When** I open the list  
  **Then** I see empty state (and can still open create if next-travel active).

- **Given** another driver in my company has entries  
  **When** I list  
  **Then** I do **not** see theirs (E64).

## US-64 — Daily usage gated on next-travel **(Must)**

**As** a signed-in driver  
**I need** Daily usage create blocked without next-travel  
**So that** logs always bind to a selected company vehicle.

**Acceptance**

- **Given** I have **no** active next-travel  
  **When** I open Daily usage create  
  **Then** the form is not available; I get guidance/CTA to **Next travel**; no row can be created (E59).

- **Given** I set next-travel then open Daily usage  
  **When** the screen loads  
  **Then** bound vehicle (make/model/plate) is shown read-only and create is available.

## US-65 — Daily usage authz and tenancy **(Must)**

**As** the product  
**I need** role and company checks on Daily usage  
**So that** only the driver of record in-tenancy can create/list own rows.

**Acceptance**

- **Given** Owner/Admin or unsigned-in  
  **When** they attempt driver Daily usage create/list  
  **Then** denied; no row (E60/E64).

- **Given** a cross-company vehicle id  
  **When** create is attempted  
  **Then** not found / no change (E66).

- **Given** I am a driver  
  **When** I try edit/delete a saved Daily usage  
  **Then** not offered / rejected (E65).

## US-66 — Daily usage on driver hub (web + mobile) **(Must)**

**As** a signed-in driver  
**I need** Daily usage from the driver home hub on web and mobile  
**So that** usage logging matches other driver tasks and does not open on login.

**Acceptance**

- **Given** I land on driver home after sign-in  
  **When** the start hub loads  
  **Then** I am **not** auto-opened into Daily usage form; I can open it from the hub.

- **Given** I use **mobile** or **web** driver shell  
  **When** I complete create/list  
  **Then** both surfaces support the same outcomes (US-61–US-65).

- **Given** next-travel is active  
  **When** I view the hub  
  **Then** Daily usage is reachable (**Should:** calm ready cue).

## US-67 — Daily usage offline **(Must)**

**As** a signed-in driver  
**I need** offline behavior consistent with other driver forms  
**So that** I do not think a usage row saved when it did not.

**Acceptance**

- **Given** the client is offline  
  **When** I am on Daily usage create  
  **Then** I see an offline warning and **Submit** is disabled (E67).
  **Then** I am **not** taken straight into the Handover Out/In form.



## US-68 — Global Header on Owner/Admin pages **(Must)**

**As** an Owner or Admin  
**I need** a shared Global Header on every Owner/Admin page  
**So that** product identity and notifications stay in one consistent place.

**Acceptance**

- **Given** I am signed in as Owner or Admin on **web**  
  **When** I open any Owner/Admin page (Home, Drivers, Vehicles, Admins if Owner, Security, vehicle create/edit/detail/handovers)  
  **Then** I see the same Global Header region on each page.

- **Given** I am signed in as Owner or Admin on **mobile**  
  **When** I use Owner/Admin screens  
  **Then** the Global Header affordances (Fleet icon + notification control) are present on those screens’ chrome.

- **Given** side nav (web) or tabs (mobile) already exist  
  **When** Global Header is added  
  **Then** primary navigation destinations and role gating are **unchanged** (Admin still no Admins create; Driver still E8).

## US-69 — Fleet icon in Global Header **(Must)**

**As** an Owner or Admin  
**I need** the Fleet icon in the Global Header  
**So that** I always see product identity in the shared chrome.

**Acceptance**

- **Given** I am on an Owner/Admin authenticated page  
  **When** the Global Header renders  
  **Then** the **Fleet** mark/icon is visible in the header.

- **Given** the mark is shown  
  **When** assistive tech reads the header identity  
  **Then** the product is presented as **Fleet** (mark decorative or named per Design; no invented product name).

## US-70 — Notification icon button **(Must)**

**As** an Owner or Admin  
**I need** a notification icon button in the Global Header  
**So that** I can open operational alerts without leaving the page context.

**Acceptance**

- **Given** I am signed in as Owner or Admin  
  **When** I view the Global Header  
  **Then** a notification **icon button** is available (hit target meets existing min hit guidance via Design).

- **Given** the button is shown  
  **When** it is exposed to assistive tech  
  **Then** it has an accessible name indicating notifications (and unread state if US-74 applies).

## US-71 — Open and close notification menu **(Must)**

**As** an Owner or Admin  
**I need** the notification button to open a notification menu  
**So that** I can review alerts in place.

**Acceptance**

- **Given** the menu is closed  
  **When** I activate the notification icon button  
  **Then** the notification menu opens.

- **Given** the menu is open  
  **When** I activate the button again, dismiss, or choose close (per Design)  
  **Then** the menu closes.

- **Given** the menu is open  
  **When** I navigate to another Owner/Admin page  
  **Then** menu does not stay open in a broken state (closes or rebinds cleanly).

## US-72 — MVP menu content: compliance alerts **(Must)**

**As** an Owner or Admin  
**I need** the menu to list company vehicles with insurance, inspection, or road tax due soon or expired  
**So that** I can see compliance risk without opening every vehicle first.

**Acceptance**

- **Given** my company has a vehicle with insurance, inspection, or road tax **within 30 days** or **past**  
  **When** I open the notification menu  
  **Then** I see an item for that **vehicle + section** (identity + which date + soon vs expired/overdue).

- **Given** only `registration_on` is near/past and compliance sections are fine  
  **When** I open the menu  
  **Then** registration alone does **not** create an item (A13).

- **Given** multiple qualifying sections on one vehicle  
  **When** I open the menu  
  **Then** each qualifying section can appear as its own item (rule 107).

- **Given** more than 50 qualifying items  
  **When** I open the menu  
  **Then** at most 50 are listed (rule 114).

## US-73 — Empty, loading, error **(Must)**

**As** an Owner or Admin  
**I need** clear menu states  
**So that** I do not confuse “no alerts” with failure.

**Acceptance**

- **Given** no company vehicle section meets rule 106  
  **When** I open the menu  
  **Then** I see an **empty** state (not an error) (E70).

- **Given** notification data is loading  
  **When** I open the menu  
  **Then** I see a loading state.

- **Given** loading fails  
  **When** the menu would show items  
  **Then** I see an **error** state and no fabricated rows (E69).

## US-74 — Unread cue on icon **(Should)**

**As** an Owner or Admin  
**I need** a cue on the notification icon when MVP items exist  
**So that** I know to open the menu.

**Acceptance**

- **Given** ≥1 MVP item exists  
  **When** I view the header  
  **Then** the icon shows a count or dot **and** the accessible name reflects that notifications exist (not color-only).

- **Given** zero MVP items  
  **When** I view the header  
  **Then** there is no unread urgency cue on the icon.

## US-75 — Navigate from notification item **(Should)**

**As** an Owner or Admin  
**I need** to open the related vehicle from a notification item  
**So that** I can act on the compliance date.

**Acceptance**

- **Given** the menu shows a compliance item for vehicle V  
  **When** I activate that item  
  **Then** I go to V’s Owner/Admin vehicle experience (detail or edit—Design picks one consistent target).

- **Given** V is missing or not in my company  
  **When** I activate the item  
  **Then** I get the normal not-found/denied path (E72); no cross-company leak.

## US-76 — Header and menu authz **(Must)**

**As** the product  
**I need** Global Header notifications only for Owner/Admin of their company  
**So that** drivers and other tenants never see this chrome or data.

**Acceptance**

- **Given** I am a **driver** (web or mobile)  
  **When** I use the app  
  **Then** I do **not** see Owner/Admin Global Header notification chrome (E68); driver shell unchanged.

- **Given** I am not signed in  
  **When** I use public or auth pages  
  **Then** Global Header notification chrome is not shown.

- **Given** I am Owner/Admin of company A  
  **When** notification items load  
  **Then** only company A vehicles appear (E56-style isolation).

## Design Specialist handoff — Global Header (US-68–US-76)

Spec Global Header for Owner/Admin **web + mobile**: Fleet icon, notification icon button, menu (open/close), empty/loading/error, optional unread cue, optional item → vehicle navigation.
Reuse `design/` tokens + `_patterns.md` chrome. **No** driver/public/auth chrome.
Do not invent push, preferences, or extra event types beyond compliance MVP.

## US-77 — Choose account kind at sign-up **(Must)**

**As** a person creating an account  
**I need** to choose **Company** or **Individual**  
**So that** I take the correct registration path.

**Acceptance**

- **Given** I am not signed in and open create-account  
  **When** I view account creation  
  **Then** I can choose **Company** or **Individual** before completing registration.

- **Given** I choose **Company**  
  **When** I continue  
  **Then** I am on Company sign-up (US-01) with legal/address fields required.

- **Given** I choose **Individual**  
  **When** I continue  
  **Then** I am on Individual sign-up (US-78) without company legal fields.

## US-78 — Register Individual and first Owner **(Must)**

**As** a person wanting a personal account  
**I need** to register with email and password only  
**So that** I get a personal workspace as Owner without forming a company.

**Acceptance**

- **Given** I chose Individual, am not signed in, email is free  
  **When** I submit email and password (≥ 8)  
  **Then** an `account_kind = individual` tenant is created, I am its Owner, and I can sign in (A83, A90).

- **Given** email is already a login identity  
  **When** I submit Individual sign-up  
  **Then** no tenant is created (E74).

- **Given** password < 8 or email missing  
  **When** I submit  
  **Then** no tenant is created (E73).

- **Given** I complete Individual sign-up  
  **When** I land signed in  
  **Then** I do **not** get Drivers or Admins management (US-82).

## US-79 — Individual Owner sign-in (web and mobile) **(Must)**

**As** an Individual Owner  
**I need** to sign in with email and password on web and mobile  
**So that** I can manage my personal vehicles.

**Acceptance**

- **Given** I am Individual Owner, valid password, TOTP off  
  **When** I sign in on web or mobile  
  **Then** I am signed in as Individual Owner (management shell per A86)—not invited-driver home, not Company Drivers admin.

- **Given** wrong email/password  
  **When** I attempt sign-in  
  **Then** I am not signed in (E2).

## US-80 — Individual password reset and optional TOTP **(Must)**

**As** an Individual Owner  
**I need** password reset and optional authenticator MFA  
**So that** my personal account matches Owner auth expectations.

**Acceptance**

- **Given** I am Individual Owner and not signed in  
  **When** I complete password reset with valid new password  
  **Then** I can sign in with the new password only.

- **Given** I am signed in as Individual Owner  
  **When** I enable or disable TOTP  
  **Then** MFA rules match Owner/Admin TOTP (rules 7–8); drivers still have no MFA.

## US-81 — Individual manages own vehicles (compliance-lite) **(Must)**

**As** an Individual Owner  
**I need** to create and edit my vehicles and compliance dates  
**So that** I can track my personal vehicles without a company org.

**Acceptance**

- **Given** I am signed in as Individual Owner  
  **When** I create a vehicle with required vehicle fields for this product  
  **Then** the vehicle belongs to **my individual tenant** only.

- **Given** I have vehicles with insurance/inspection/road tax in warning window or past  
  **When** I view list/detail  
  **Then** I see the same class of expiry warnings as company fleet (rule 19), for **my** vehicles only.

- **Given** I am Individual Owner  
  **When** I set optional mileage per existing vehicle rules  
  **Then** mileage works on **my** vehicles; units still follow country (A34).

- **Given** I am Individual Owner on create/edit vehicle  
  **When** I view the vehicle form  
  **Then** I see **Details** only—**no** Images or Handovers tabs (A86, E80).

- **Given** I am Individual Owner  
  **When** I call vehicle side-image or handover-history APIs  
  **Then** the API denies with **403** `forbidden` (E80).

- **Given** another tenant’s vehicle id  
  **When** I try to read or change it  
  **Then** not found/forbidden (E78).

## US-82 — Individual cannot manage drivers or Admins **(Must)**

**As** the product  
**I need** to block driver and Admin management for Individual accounts  
**So that** only Companies run multi-driver orgs.

**Acceptance**

- **Given** I am Individual Owner  
  **When** I try to create/invite/list-admin drivers or create an Admin  
  **Then** the action is denied; no driver/Admin created (E75, E76, E77).

- **Given** I am Individual Owner  
  **When** I use app navigation  
  **Then** Drivers and Admins management entry points are not available (Design may hide; API still denies).

- **Given** I am Individual Owner  
  **When** I open a vehicle  
  **Then** Images and Handovers are not available (E80).

## US-83 — Company driver invite remains Company-only **(Must)**

**As** a Company Owner or Admin  
**I need** driver invite/management to keep working only for my company  
**So that** fleet driver onboarding is unchanged.

**Acceptance**

- **Given** I am Company Owner or Admin  
  **When** I invite a driver by email (US-07)  
  **Then** behavior matches existing Company rules (invite, Resend, accept).

- **Given** I am Individual Owner  
  **When** I attempt the same  
  **Then** no driver is created (E75).

## US-84 — Existing accounts map to Company **(Must)**

**As** an existing customer  
**I need** my organization to remain a Company account  
**So that** I am not forced through Individual signup or lose drivers.

**Acceptance**

- **Given** a tenant/principal existed before this slice  
  **When** account kind is read  
  **Then** it is **company** (A88).

- **Given** I am an existing Company Owner/Admin/Driver  
  **When** I sign in  
  **Then** my prior capabilities remain available subject to existing rules.

## US-85 — Landing entry for Company and Individual **(Should)**

**As** an unsigned-in visitor on web landing  
**I need** a clear path to create a **Company** or **Individual** account  
**So that** I pick the right signup without confusion.

**Acceptance**

- **Given** I am on public landing unsigned-in  
  **When** I view header/create actions  
  **Then** I can start **Company** create and **Individual** create (combined chooser or two actions—Design).

- **Given** I am on landing  
  **When** I use Sign in  
  **Then** sign-in remains available for all existing identities (unchanged).

## Design Specialist handoff — Account kinds (US-77–US-85, US-01 clarify)

Spec: account-kind choice; Individual sign-up; Company sign-up via choice; landing CTAs; Individual Owner shell **without** Drivers/Admins; deny states. Reuse auth canvas + tokens. No new product name. Architect owns tenancy field shape after design.

## US-86 — Add custom expiration on vehicle **(Must)**

**As** an Owner or Admin (Company or Individual)  
**I need** to add labeled custom expiration dates on a vehicle  
**So that** I track non-built-in compliance items on the fleet record.

**Acceptance**

- **Given** I am signed in as Owner/Admin on vehicle create or edit Details  
  **When** I add a custom expiration with label (1–80) and `expires_on` and save  
  **Then** the vehicle stores that row with a stable id and returns it on reads.

- **Given** I already have 10 custom expirations  
  **When** I try to add another  
  **Then** the write is rejected (cap 10).

- **Given** I am a driver or unsigned-in  
  **When** I try to write custom expirations  
  **Then** no change (403/401).

## US-87 — Edit custom expiration **(Must)**

**As** an Owner or Admin  
**I need** to change a custom expiration label or date  
**So that** the record stays current.

**Acceptance**

- **Given** a vehicle in my tenant has custom rows  
  **When** I PATCH with a full `custom_expirations` list keeping ids and updated fields  
  **Then** stored rows match the new list.

- **Given** duplicate labels (case-insensitive after trim) or invalid label/date  
  **When** I save  
  **Then** 400 `validation_error` and no partial bad list stored.

## US-88 — Remove / clear custom expirations **(Must)**

**As** an Owner or Admin  
**I need** to remove custom expiration rows  
**So that** outdated items leave the vehicle record.

**Acceptance**

- **Given** a vehicle has custom rows  
  **When** I PATCH `custom_expirations: []`  
  **Then** subsequent reads show an empty list.

- **Given** a vehicle has custom rows  
  **When** I PATCH omitting `custom_expirations`  
  **Then** existing rows are unchanged.

- **Given** UI remove of one row  
  **When** I save the remaining full list  
  **Then** only remaining rows are stored (full replace).

## US-89 — Custom expiration warnings, list, nav **(Must / Should)**

**As** an Owner or Admin  
**I need** custom dates to warn like insurance/inspection/road tax  
**So that** I act before those items lapse.

**Acceptance**

- **Given** a custom `expires_on` is within 30 days or past (UTC)  
  **When** I read the vehicle  
  **Then** `warnings` includes `{ field: "custom:<id>", state: "due_soon"|"expired" }`.

- **Given** only `registration_on` is near/past and customs are fine  
  **When** I read the vehicle  
  **Then** registration still does not warn.

- **Given** custom dates only are urgent (Should)  
  **When** clients compute Vehicles nav urgency  
  **Then** custom `expires_on` may participate in red/orange worst-wins with built-in sections.

## US-90 — Custom expirations authz and tenancy **(Must)**

**As** the product  
**I need** custom expirations scoped like other vehicle fields  
**So that** tenancy stays safe.

**Acceptance**

- **Given** another company’s vehicle id  
  **When** I try to read or write custom expirations  
  **Then** not_found / no leak.

- **Given** Individual Owner  
  **When** I manage custom expirations on Details  
  **Then** allowed (same as other Details fields); Images/Handovers still denied.


## US-91 — Public pricing page **(Must)**

**As** an unsigned-in person  
**I need** to see Individual and Company plan prices and feature differences  
**So that** I can choose a path before creating an account.

**Acceptance**

- **Given** I am not signed in  
  **When** I open `/pricing`  
  **Then** I see four plans from [pricing-plans.md](pricing-plans.md): Personal, Personal Plus, Team, Fleet with list prices, meters, and key entitlements (including custom expirations on Plus/Fleet only: 3/vehicle included, +$0.70 overage).

- **Given** I am on `/pricing`  
  **When** I use a plan primary action  
  **Then** Individual plans go to Individual sign-up (or account-kind with individual intent) and Company plans go to Company sign-up (or account-kind with company intent); no payment checkout this slice.

- **Given** I am signed in as Owner/Admin  
  **When** I open `/pricing`  
  **Then** I am redirected to `/home` (same as public landing).

- **Given** I am signed in as driver  
  **When** I open `/pricing`  
  **Then** I am redirected to driver home (not marketing, not Owner shell).

- **Given** `/pricing`  
  **When** the page loads  
  **Then** no fleet records, no `GET /v1` billing/plans API, no Stripe; copy matches catalog; public chrome (header with Sign in + Create account + link from landing).

## US-92 — Landing link to pricing **(Should)**

**As** an unsigned-in person on the public landing  
**I need** a clear path to pricing  
**So that** I do not hunt for plan details.

**Acceptance**

- **Given** I am on `/` unsigned-in  
  **When** the page is ready  
  **Then** I can open **Pricing** (header secondary text link or description link to `/pricing`).

## Design Specialist handoff — Pricing (US-91–US-92)

Public web only. Catalog: [pricing-plans.md](pricing-plans.md). Spec: [design/pages/pricing.md](../design/pages/pricing.md).
