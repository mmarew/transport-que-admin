# QueueAdmin — Figma Screen Spec (mobile-first, workflow-driven)

Product: **Queue Admin console** — web app for queue-organization admins to run a
physical loading/departure line. Drivers check in, orders get dispatched to the
front driver, and the board updates live over sockets.

**Scope of this doc:** screens and their structure, content, and behavior —
defined from the workflows, **mobile-first**. Typography, colors, button styles,
icons, and visual polish are the **designer's job** and are intentionally not
prescribed here. Where a screen has fixed content/labels, they are listed as
literal copy.

**How to build the screens:** for every screen below, design the **mobile**
layout first (single column, most-important-first), then define how blocks
rearrange at **tablet/desktop** (wider, multi-column). Breakpoints: base mobile
(~360–414px), tablet (~768px), desktop (≥1024px).

---

## 1. Workflows (what the product does)

### Workflow A — First-time onboarding (QueueOrgAdmin)

```
Open app → Login (phone) → Verify OTP → Dashboard (empty orgs)
  → Create organization (name, type, address via map search)
  → [Super Admin approves elsewhere]
  → Org becomes approved+enabled → Live queue available
Register path: Login → "Don't have an account? Register"
  → full name + phone (+optional email) → Verify OTP → Dashboard
```

Screens: **S1 Login → S3 OTP**, **S2 Register → S3 OTP**, **S4 Dashboard**,
**M1 Create organization**.

### Workflow B — Daily queue run (the core loop)

```
Open org → Live queue board (subscribe → snapshot → live updates)
  1. Driver arrives → Manual check-in (vehicle-driver id) → row appears
     at the end of its vehicle-type line with a ticket number
  2. Shipper calls with a load → Create order (item, qty, cost, vehicle type,
     dates, origin=org location, destination=map search)
     → order auto-offered to FRONT waiting driver of that type
  3. Driver accepts → row → "loaded"  (driver rejects/timeout → next driver)
  4. Disputes:
       - driver too far back → Override position (new ticket # + reason)
       - driver no-show/leaves → Cancel driver (confirm)
       - no driver for a waiting order → Dispatch (offer to front driver)
```

Screens: **S6 Live queue board**, **M3 Check-in**, **M2 Create order**,
**M4 Dispatch**, **M5 Override**, **M6 Cancel**.

### Workflow C — Org maintenance (admin & super admin)

```
Open org → Profile (edit name/type/phone/address/coords)
        → Members (view admins/shippers, their status)
Admin only: Approve / Suspend / Reject an org
```

Screens: **S5 Org manage** (profile + members + admin actions).

---

## 2. Screen map (mobile-first order)

| #   | Screen                               | Route                  | Opens from               |
| --- | ------------------------------------ | ---------------------- | ------------------------ |
| S1  | Login — phone number                 | `/login`               | app entry                |
| S2  | Register — name, phone, email        | `/register`            | S1 footer link           |
| S3  | Verify OTP                           | after S1/S2 submit     | —                        |
| S4  | Dashboard — your organizations       | `/`                    | after OTP verify         |
| S5  | Org manage — profile, members, admin | `/orgs/:id`            | S4 "Manage"              |
| S6  | Live queue board                     | on S5 (below sections) | S5                       |
| M1  | Create organization (modal)          | S4                     | S4 "Create organization" |
| M2  | Create order (modal)                 | S6                     | S6 "New order"           |
| M3  | Manual check-in (modal)              | S6                     | S6 "Manual check-in"     |
| M4  | Dispatch (modal)                     | S6                     | per-type "Dispatch"      |
| M5  | Override position (modal)            | S6                     | row "Override"           |
| M6  | Cancel driver (modal)                | S6                     | row "Cancel"             |

---

## 3. Screens

### S1 Login

**Flow position:** app entry point; also the destination after sign-out and on 401.

Content (top → bottom, mobile):

1. Brand block — product name + one-line descriptor.
2. Heading: **Sign in**.
3. Phone number input (numeric keypad; placeholder `+251 9 00 00 00 00`;
   auto-grouped as digits are typed; Ethiopia default `+251`).
4. Primary submit — **Send OTP** (full-width on mobile).
5. Footer link: _"Don't have an account?"_ → **Register** (goes to S2).

Behavior:

- Validate ≥10 digits; inline error under the field ("Enter a valid phone
  number").
- Submit → network; pending state on the button; success toast "OTP sent via
  SMS" → **S3**; error toast shows backend message.

Desktop: centered column, `~400px` max; can add a brand/side panel (designer's
call). Mobile: fills viewport height.

### S2 Register

**Flow position:** from S1 footer.
Content:

1. Same brand block; heading **Create account**.
2. Fields in order: **Full name** → **Phone number** → **Email** _(optional —
   label marks "optional")_.
3. Submit — **Create account**.
4. Footer link: _"Already have an account?"_ → **Login**.

Behavior: validation per field; success toast "Account created — OTP sent via
SMS" → **S3**. Account is pending until a Super Admin assigns the org.

### S3 Verify OTP

**Flow position:** after S1/S2.
Content:

1. Heading **Verify your number**.
2. Helper: "Enter the 6-digit code sent to **+251 9 22 11 24 80**" (phone
   emphasized).
3. **Six single-digit boxes** side by side. Typing advances focus, Backspace
   steps back, pasting a 6-digit code fills all boxes, `autofill=one-time-code`.
4. Submit — **Verify & Continue**.
5. Secondary action: **Change phone number** (clears form, returns to S1/S2).

Behavior: 6 digits required; success stores session, connects live updates,
toast "Welcome, {name}", redirect to Dashboard (or the page they tried to open).

Mobile note: 6 boxes must fit a 360px screen in a single row.

### S4 Dashboard — your organizations

**Flow position:** post-login landing.
Header:

- Brand + current user line (name · phone) + **Sign out**.

Body (mobile order):

1. Section title: **Your Queue Organizations** + **Create organization** action.
2. Organization list — one item per org, most-relevant info first:
   - Primary line: **name** + **type** (capitalized).
   - Secondary: **status** (approved/pending/rejected/suspended) and
     **enabled** (Yes/No) as two compact tags.
   - Action: **Manage** → opens S5.
   - Tapping the item anywhere selects the org and opens S5.

States:

- Loading skeleton/label while fetching.
- Empty: centered message — "You don't have a queue organization yet." + "Create
  one below — an admin will approve it."
- No usable orgs: note — "No approved + enabled orgs. Ask an admin to approve
  and enable one."
- Error: full-width error banner above the list.

Desktop: list becomes a table (Name | Type | Status | Enabled | Actions).

### M1 Create organization (modal)

**Flow position:** from S4 "Create organization".
Content:

1. Title: **Create queue organization**; helper: "Name, type, and address are
   required. Admin will approve before dispatch works."
2. Fields in order:
   - **Name** (required).
   - **Type** (required, select) — Customs / Factory / Cement / Depot / Other.
   - **Phone** _(optional)_.
   - **Address** (required) — **map/geocoder search** (min 3 chars): dropdown
     of place suggestions; selecting one fills **Address + coordinates
     silently** (lat/lng not shown here).
3. Footer: **Cancel** + **Create organization**.

Behavior: success toast "Queue organization created — pending admin approval";
list refetches.

Mobile: bottom sheet or centered modal, scrollable; desktop: centered modal
(~max 32rem).

### S5 Org manage — profile, members, admin

**Flow position:** from S4 "Manage".
Header: **← Dashboard** + org name + status tags + **Sign out**.

Body (mobile order = most important first):

1. **Live queue board** _(the operational screen — placed first on mobile,
   see S6)._
2. **Profile** section:
   - Heading **Profile**.
   - Fields: **Name**, **Type** (select), **Phone**, **Address**,
     **Latitude** / **Longitude** (side-by-side pair).
   - Submit **Save changes** (enabled only when edited).
3. **Members** section: heading **Members**; list items — **name**, **phone**,
   **role** (Queue Org Admin / Shipper), **status** (active/inactive).
   Empty: "No members yet."
4. **Admin actions** (only for roles 3/6): heading **Admin actions**; actions
   **Approve**, **Suspend**, **Reject**. Suspend/Reject require a confirmation.

Desktop: Live queue board below the grid; **Profile** | **Members+Admin** in two
columns.

### S6 Live queue board

**Flow position:** on S5; the operator's main screen.

Top bar:

- **Live queue** title + live indicator (connected / connecting) + meta:
  `{date} · {n} waiting`.
- Actions: **New order** (primary for this screen) + **Manual check-in**.
- View toggle: **By Vehicle Type | All Drivers (n)**.

Content — **By Vehicle Type** (default):

- Grouped by vehicle type; each group:
  - Group header: vehicle type name + **Dispatch** action.
  - Driver list, ordered by ticket number (#). Each row (mobile, most info
    first):
    1. **Ticket #** (prominent).
    2. **Driver name** (+ phone on a second line).
    3. **Joined** time.
    4. **Status** tag: `waiting` / `offered` / `loaded` / `removed`.
    5. Actions (only while `waiting`): **Override**, **Cancel**.
  - Empty group: "No drivers waiting."
- **All Drivers** view: same rows in one flat list, plus vehicle type shown.

Live behavior:

- Board joins the org's live room; any change (check-in, offer, accept,
  removal) updates the list automatically — highlight the row that changed.
- `offered` rows optionally show the order reference and offer window; `loaded`
  shows loaded time; `removed` is struck through and dimmed.

Empty/edge:

- Whole queue empty: "The queue is empty."
- Error: banner at top of the board.

Mobile: rows as cards. Desktop: table (same columns as the card fields).

### M2 Create order (modal, largest)

**Flow position:** from S6 "New order".
Content:

1. Title **New order**; helper: "A new shipper request is created and offered to
   the front waiting driver of the matching vehicle type."
2. **Request mode** radio group:
   - **Individual target** (default) — offered to the front waiting driver.
   - **Company target** — batch header only; driver rows deferred until a
     company bid is accepted.
   - Short explainer under the radios.
3. **Shipper phone number** _(required)_ — visually distinct callout; helper:
   "Registers the shipper if they do not have an account yet."
4. Fields (two-column on wide, stacked on mobile):
   - **Item name** · **Quantity (quintal)**
   - **Shipping cost** · **Number of vehicles** (default 1)
   - **Shipping date** · **Delivery date** (date pickers)
   - **Vehicle type** (select, list from backend; shows type + capacity;
     loading + empty/error states)
5. **Origin** block — labeled "Set from the organization's current location":
   **Place**, **Latitude**, **Longitude** pre-filled from the org profile
   (editable fallback).
6. **Destination** block — **Search place** (map/geocoder, min 3 chars,
   debounced): dropdown of results; selecting fills a read-only summary —
   **Place + Latitude + Longitude** (suggested: small map thumbnail + place +
   coords).
7. Footer: **Cancel** + **Create order**.

Behavior: inline validation (delivery ≥ shipping); success toast differs by
mode — individual: "Order created and offered to the queue"; company: "Company
target batch created (rows deferred until bid acceptance)".

### M3 Manual check-in (modal)

**Flow position:** from S6 "Manual check-in".

- Title **Manual check-in**.
- **Vehicle-Driver ID** (required).
- **Queue number** _(optional — "auto-assigned")._
- Footer: **Cancel** + **Check in**. Success toast: "Driver checked in at #3".

### M4 Dispatch (modal)

**Flow position:** from a type group's **Dispatch**.

- Title **Dispatch to front driver**; helper: the vehicle type (human name).
- **Shipper request ID** _(optional — links an existing order)._
- Footer: **Cancel** + **Dispatch**. Success toast: "Offered to driver #1".
- Error: "no waiting driver" surfaces as a toast.

### M5 Override position (modal)

**Flow position:** row **Override**.

- Title **Override position**; helper: "`{driver} — currently #{n}`".
- **New queue number** (required, ≥1).
- **Reason** (textarea) — marked "(audit logged)".
- Footer: **Cancel** + **Override**.

### M6 Cancel driver (modal)

**Flow position:** row **Cancel**.

- Title **Cancel driver from queue**.
- Body: "Remove **{driver}** (#{n}) from the line? This is audit-logged."
- Footer: **Keep** + **Cancel driver** (destructive).

---

## 4. Mobile-first layout rules (apply everywhere)

1. **Single column on mobile** — order content by operational importance (the
   board beats settings; status beats metadata).
2. **Actions** sit where the thumb can reach (bottom of sheets/cards, or
   right-aligned in headers); primary action last in a footer with a Cancel.
3. **Lists over tables** on mobile: every desktop table has a card-list twin
   with the same fields, stacked.
4. **Modals** = bottom sheets on mobile / centered dialogs on desktop; scroll
   when content exceeds ~90vh.
5. **Forms**: two-field rows collapse to one column; keep field order identical
   across breakpoints.
6. **Headers** collapse to a single compact row on mobile (drop secondary text,
   keep brand + primary action).
7. **Live board** must remain readable while updating — changed rows get a
   transient highlight at all breakpoints.

## 5. Shared states to design once, reuse everywhere

- **Loading** — skeleton lines where a list will render.
- **Empty** — centered icon/illustration + primary message + next-step hint.
- **Error** — full-width banner near the failed section; field errors inline.
- **Pending buttons** — in-progress label on the same control.
- **Live/offline** — connected vs connecting indicator on the board.
- **Confirmation** — a dedicated dialog for destructive actions (currently a
  browser confirm; replace with a designed dialog for M6, and Suspend/Reject).

## 6. Literal copy reference (labels, toasts, helpers)

Keep these strings stable across designs:

- Buttons: Send OTP · Create account · Verify & Continue · Change phone number ·
  Create organization · Save changes · New order · Manual check-in · Dispatch ·
  Check in · Override · Cancel driver · Keep · Cancel · Create order
- Toasts: "OTP sent via SMS" · "Account created — OTP sent via SMS" ·
  "Welcome, {name}" · "Organization updated" · "Organization status updated" ·
  "Queue organization created — pending admin approval" ·
  "Driver checked in at #{n}" · "Offered to driver #{n}" · "Position overridden" ·
  "{driver} removed from queue" · "Order created and offered to the queue" ·
  "Company target batch created (rows deferred until bid acceptance)"
- Status labels: waiting · offered · loaded · removed · approved · pending ·
  rejected · suspended · active · inactive · live · connecting
- Empty states: "You don't have a queue organization yet." /
  "No approved + enabled orgs. Ask an admin to approve and enable one." /
  "No drivers waiting." / "The queue is empty." / "No members yet."

## 7. Frames to deliver (mobile-first)

Auth:

1. S1 Login (empty / error) — mobile + desktop
2. S2 Register — mobile + desktop
3. S3 OTP (empty / filled) — mobile + desktop

App: 4. S4 Dashboard (list / empty) — mobile + desktop 5. M1 Create organization (dropdown open) — mobile + desktop 6. S5 Org manage — mobile (stacked) + desktop (grid) 7. S6 Live queue · By Vehicle Type — mobile + desktop 8. S6 Live queue · All Drivers — mobile + desktop 9. M2 Create order (origin + destination state) — mobile + desktop 10. M3 / M4 / M5 / M6 modals — mobile + desktop 11. Shared states sheet — loading / empty / error / live / confirm

---

_Visual styling (color, type, button treatment, icons, spacing scale) is owned
by the designer. This document fixes the information architecture, workflow
order, content, and mobile→desktop behavior only._
