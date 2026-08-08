# QueueAdmin — Figma Design Handoff

Product: **Queue Admin console** — web app for queue-organization admins to run a
physical loading/departure line (drivers check in, orders get dispatched to the
front driver, the board updates live over sockets).

- Platform: **Web (responsive)** — desktop-first, mobile must also work.
- Stack used to build it: React 19 + TypeScript + Tailwind CSS v4.
- Source screens: `src/pages/` and `src/components/` (see the map in §2).
- Design token / visual language in use today: §1.
- Read this top-to-bottom, then build frames per screen (desktop + mobile).

---

## 1. Design tokens & visual language (current system)

Keep these consistent unless this document asks for something else.

### 1.1 Color roles

| Role | Tailwind class | Hex (approx) | Used for |
|---|---|---|---|
| App background | `bg-slate-100` | `#f1f5f9` | page canvas |
| Card / panel bg | `bg-white` | `#ffffff` | tables, cards, modals |
| Header bg | `bg-white` + `shadow-sm` | — | top bar |
| Border | `border-slate-200` / `border-slate-300` | `#e2e8f0` / `#cbd5e1` | cards, inputs |
| Primary text | `text-slate-800` | `#1e293b` | headings, driver names |
| Secondary text | `text-slate-500/600` | `#64748b` | labels, meta |
| Disabled / placeholder | `text-slate-400` | `#94a3b8` | empty hints, placeholders |
| **Primary action** | `bg-blue-600` / `hover:bg-blue-700` | `#2563eb` | Sign in, Save, Check in, Create org, Submit |
| Success / positive | `bg-emerald-600` | `#059669` | New order, Dispatch |
| Destructive | `bg-red-600` / `text-red-600` | `#dc2626` | Cancel driver, Reject, Sign-out (ghost) |
| Warning | `bg-amber-500` | `#f59e0b` | Suspend |
| Info surface | `bg-blue-50` / `border-blue-300` | `#eff6ff` / `#93c5fd` | shipper-phone callout |

### 1.2 Status pills (semantic, used on orgs AND queue rows)

| Status | Style |
|---|---|
| `waiting` (queue) | `bg-yellow-100 text-yellow-800` |
| `offered` (queue) | `bg-blue-100 text-blue-800` |
| `loaded` (queue) | `bg-green-100 text-green-800` |
| `removed` (queue) | `bg-slate-200 text-slate-500` + strikethrough |
| `approved` (org) | `bg-green-100 text-green-700` |
| `pending` (org) | `bg-amber-100 text-amber-700` |
| `rejected` (org) | `bg-red-100 text-red-700` |
| `suspended` (org) | `bg-slate-100 text-slate-600` |
| org **enabled** | `bg-green-100 text-green-700` ("Yes") |
| org **disabled** | `bg-slate-100 text-slate-600` ("No") |
| member **active / inactive** | `bg-green-100 text-green-700` / `bg-slate-200 text-slate-600` |
| **Live** socket indicator | `bg-green-100 text-green-700` ("live") |
| **Connecting** indicator | `bg-amber-100 text-amber-700` ("connecting…") |

All pills are `rounded-full px-2 py-0.5 text-xs font-medium`.

### 1.3 Typography

- App brand title (header): `text-lg font-bold`, slate-800.
- Page/section headings: `text-base`–`text-lg font-semibold`, slate-800.
- Table header labels: `text-xs uppercase tracking-wide`, slate-500.
- Body: `text-sm`, slate-700/800.
- Secondary/helper copy: `text-xs`–`text-sm`, slate-500.
- Form field labels: `text-sm font-medium`, slate-700.
- Errors: `text-xs`, red-600.
- Auth screen heading: `text-2xl font-bold` (desktop), slate-800.

### 1.4 Shape, elevation, spacing

- Inputs / buttons / selects: `rounded-md` (6px), 1px border slate-300, focus ring
  `focus:border-blue-500`.
- Cards / sections: `rounded-xl`, `border border-slate-200`, `bg-white`,
  `p-6` (sections) or `shadow-sm` (header).
- Modals: `rounded-xl bg-white shadow-xl p-6`, overlay `bg-black/40`, centered,
  max-width `max-w-sm` (check-in/dispatch/override/cancel) or `max-w-lg`
  (create order, create org). Modals scroll internally if taller than 90vh.
- Dropdowns (autocomplete): `rounded-md bg-white shadow-lg border-slate-200`.
- Buttons: `px-4 py-2 text-sm font-semibold rounded-md`; small inline buttons
  `px-3 py-1.5 text-sm` or `px-3 py-1 text-xs`.
- Content column: `max-w-5xl` centered; page padding `px-4 py-6`.
- Toasts: sonner (`<Toaster />`) top-center/right, success + error.

### 1.5 Icons

Currently minimal — text labels + one arrow (`← Dashboard`). You may introduce
an icon set (Lucide recommended) for: sign out, search, close (modal ×), live
pulse, truck/vehicle, user, chevron. Keep icons stroke-based, 16–20px, slate.

---

## 2. Screen map (routes → components)

| # | Screen | Route | Source |
|---|---|---|---|
| S1 | Auth — Login (request OTP) | `/login` | `AuthFlow initialMode="login"` |
| S2 | Auth — Register | `/register` | `AuthFlow initialMode="register"` |
| S3 | Auth — Verify OTP | `/login` + `/register` (mode `otp`) | `AuthFlow` |
| S4 | Dashboard — your queue organizations | `/` | `QueueDashboardPage` |
| S5 | Org manage — profile + members + admin actions | `/orgs/:id` | `QueueOrgManagePage` |
| S6 | Live queue board | (on S5, below the sections) | `QueueBoard` + `QueueTable` |
| M1 | Modal — Create queue organization | on S4 | `CreateOrgModal` |
| M2 | Modal — Create order (shipper request) | on S6 | `CreateOrderModal` |
| M3 | Modal — Manual check-in | on S6 | `CheckinModal` |
| M4 | Modal — Dispatch to front driver | on S6 | `DispatchModal` |
| M5 | Modal — Override position | on S6 | `OverrideModal` |
| M6 | Modal — Cancel driver (confirm) | on S6 | `ConfirmCancel` |

---

## 3. Auth screens (S1–S3)

Three-step: **phone → OTP → in** (register inserts a full-name step first).
There are **4 visual themes**; the app ships with **"classic"** as default, so
design at minimum that one, but a Figma variants frame for all four is welcome:

- **classic** — centered card on `slate-100`, white card, blue primary.
- **split** — half-screen gradient panel (`blue-700 → indigo-800 → indigo-950`)
  with brand title + subtitle on the left, form card on the right (**desktop only
  panel; hidden below `lg`**).
- **glass** — dark gradient (`slate-950 → indigo-950 → slate-900`), frosted
  `bg-white/10` card with backdrop blur, indigo primary.
- **minimal** — white page, top-aligned, no card; underline inputs,
  `rounded-full` dark button.

### S1 Login — request OTP

- Brand block: title **"Queue Admin"**, subtitle **"Dispatch queue management
  console"**.
- Heading: **Sign in**.
- Field: **Phone number** (tel), required, placeholder `+251 9 00 00 00 00`.
  - Phone input is **auto-grouped** `+251 9 22 11 24 80` (country code + pairs),
    `tracking-widest`.
- Submit: **Send OTP** (primary, full width). Pending state → **"Please wait…"**.
- Footer: *"Don't have an account?"* **Register** link.
- Errors: inline under field (e.g. "Enter a valid phone number").
- Toast on success: **"OTP sent via SMS"** → transitions to S3.

### S2 Register

- Same shell/branding; heading **Create account**.
- Fields: **Full name** (required), **Phone number** (required, grouped +251),
  **Email** *(optional — label renders "(optional)")*.
- Submit: **Create account**. Pending → "Please wait…".
- Footer: *"Already have an account?"* **Login** link.
- Toast on success: **"Account created — OTP sent via SMS"** → S3.
- Note: registration only creates a **pending** user; a Super Admin must still
  assign the user to a queue org and approve it before they can operate.

### S3 Verify OTP

- Heading: **Verify your number**.
- Helper: *"Enter the 6-digit code sent to **+251 9 22 11 24 80**"* (phone
  highlighted `font-medium`).
- Input: **6 individual boxes**, `h-12 w-12`, numeric-only, auto-advance on
  typing, Backspace moves backward, paste fills all 6, `autoComplete=one-time-code`.
- Submit: **Verify & Continue**. Pending → "Please wait…".
- Secondary: **Change phone number** (returns to login/register, clears form).
- Errors: "Enter the full 6-digit code".
- Success: stores JWT + user, connects socket, toast **"Welcome, {fullName}"**,
  redirects to `/` (or the originally-requested protected route).
- Dev/test note: accepted test OTP is `101010`.

### Auth responsive rules

- Desktop: card `max-w-sm`, vertically centered.
- Mobile: same card full-width `px-4`, fills viewport height; **split** theme
  drops the gradient panel and shows just the centered form.
- OTP boxes must fit 6 across the narrowest phone (use `w-11` at small).

---

## 4. Dashboard — queue organizations (S4)

Header (all pages share this pattern):
- Left: brand **Queue Admin** + subtitle line with the logged-in user
  `fullName · phoneNumber`.
- Right: **Sign out** (ghost button, `border border-slate-300`, slate text).

Main content (single column, `max-w-5xl`):
- Section heading row: **Your Queue Organizations** + **Create organization**
  (primary blue).
- Table of organizations:

| Column | Content |
|---|---|
| Name | `font-medium slate-800` |
| Type | `capitalize` (customs / factory / cement / depot / other) |
| Status | pill (approved / pending / rejected / suspended) |
| Enabled | pill "Yes" / "No" |
| Actions | **Manage** link (blue) → `/orgs/:id` |

- Row click = select org + navigate to manage (whole row `cursor-pointer`,
  `hover:bg-slate-50`).
- States:
  - **Loading:** "Loading organizations…" + button shows "Loading…".
  - **Empty:** centered card — *"You don't have a queue organization yet."* +
    *"Create one below — an admin will approve it."*
  - **No usable orgs:** amber note *"No approved + enabled orgs. Ask an admin to
    approve and enable one."*
  - **Error:** red banner with message at top of main.
- **Mobile:** the table should collapse to a **card list** (name + type on line 1,
  status + enabled pills on line 2, Manage as a full-width or right-aligned
  action) — currently it is a plain table and overflows, so design the card list.

### M1 Create queue organization (modal, `max-w-md`)

- Title: **Create queue organization**.
- Helper: *"Name, type, and address are required. Admin will approve before
  dispatch works."*
- Fields:
  - **Name** (required) — e.g. "National Cement".
  - **Type** (required, select) — Customs / Factory / Cement / Depot / Other.
  - **Phone** (optional, tel) — placeholder `+251912345678`.
  - **Address** (required) — **Photon geocoder autocomplete**:
    - type ≥3 chars, 250ms debounce, dropdown of results
    (`name` bold + street/house/city/postcode/country muted on 2nd line);
    - selecting a result **auto-fills Address + Latitude + Longitude** (lat/lng
      are NOT shown in this modal — hidden and derived from the pick).
- Footer: **Cancel** (ghost) + **Create organization** (primary). Pending →
  "Creating…".
- Success toast: *"Queue organization created — pending admin approval"*, modal
  closes, list refetches.
- Note for design: the address field needs a **search icon** + dropdown caret;
  show a loading state and an empty-results message inside the dropdown.

---

## 5. Org manage page (S5)

Header: `← Dashboard` link (blue) + org **name** + **StatusBadge** (status pill +
enabled/disabled pill) + **Sign out**.

Body: two-column grid on desktop (`lg:grid-cols-2`), stacked on mobile.

### Left column — Profile card (`rounded-xl border p-6`)
- Heading: **Profile**.
- Form fields: **Name** (text), **Type** (select), **Phone** (tel), **Address**
  (text), **Latitude** + **Longitude** (two-col number grid).
- Save button: **Save changes** (primary), disabled until dirty
  (`disabled:opacity-50`), pending → "Saving…".
- Success toast: "Organization updated". Invalid fields: inline red errors
  (lat must be -90..90, lng -180..180).

### Right column — Members card
- Heading: **Members**; table (Name, Phone, Role, Status).
  - Roles: `11` → "Queue Org Admin", `1` → "Shipper".
  - Status: pill active/inactive.
  - Empty: "No members yet." (centered, muted).
  - Loading / error states like the rest of the app.
- Mobile: card list (avatar-initial + name/phone, role + status on line 2).

### Right column (admin only, role 3 or 6) — Admin actions card
- Heading: **Admin actions**.
- Helper text: *"Approve enables the queue…"* with inline `<code>`.
- Buttons: **Approve** (green), **Suspend** (amber), **Reject** (red).
- Reject/suspend use a `window.confirm`; success toast "Organization status
  updated". (Design note: replace the browser confirm with a proper
  confirmation dialog/modal for a production look.)

### States
- `!orgId`: "No organization selected." + "Go back to the dashboard" link.
- loading: "Loading…"; org error: red banner; org 404: "Organization not found."

---

## 6. Live queue board (S6) — the core screen

Rendered below the profile/members grid on the same page.

### Top bar
- Left: **Live queue** heading + live pill (**live** green / **connecting…**
  amber) + meta line `{queueDate} · {totalWaiting} waiting`.
- Right (actions):
  - **New order** (emerald)
  - **Manual check-in** (blue)
  - **View toggle:** segmented control — **By Vehicle Type | All Drivers (N)**.

### By Vehicle Type view
- One section per vehicle type (grouped by the `vehicleTypeUniqueId` key of
  `queues`).
- Section header: type name (`text-sm font-medium`) + **Dispatch →** button
  (emerald, small) that opens M4 for that type.
- **QueueTable** per type:

| Column | Content |
|---|---|
| # | queue number, `font-mono` |
| Driver | name, `font-medium` |
| Phone | muted |
| Joined | `toLocaleTimeString()` |
| Status | pill (waiting/offered/loaded/removed) |
| Actions | **Override** (blue) + **Cancel** (red) — only when `status === "waiting"` |

- Empty type: "No drivers waiting" centered muted.
- Table footer: `vehicle type: {typeId}` (muted, `text-xs`) — currently a raw
  UUID; the design should show a **human-readable vehicle type name** instead
  (vehicle types load from `GET /api/admin/vehicleTypes`).

### All Drivers view
- Flat table with an extra **Vehicle Type** column; same row actions. Sorted by
  queue number. Card list on mobile.

### Live behavior (UX contract for the designer)
- Board subscribes to the org's socket room; any `queue` event triggers a
  debounced refetch. **No manual refresh button needed** — but a subtle
  "syncing" shimmer is acceptable.
- Changes to design: use a **highlight animation** on rows that just changed
  (check-in, offered, loaded, removed) so the operator sees the update.

### Row-level interaction notes
- **offered** rows: consider showing the linked `shipperRequestUniqueId` /
  order summary and remaining offer window; and a **force reassign / clear
  offer** action for operators.
- **loaded** rows: show "Loaded" and driver name; no actions currently — design
  an optional "Done" state.
- **removed**: strikethrough name + muted; no actions.

### Empty / edge states
- Entire queue empty: "The queue is empty."
- Queue error: red banner (via `getApiError`).

---

## 7. Modals on the board (M2–M6)

All share: centered overlay `bg-black/40`, `rounded-xl bg-white p-6 shadow-xl`,
footer right-aligned with **Cancel** (ghost) + primary action. Mobile: full-width
sheet pinned to bottom or centered with `px-4` — designer's choice, but must be
thumb-reachable.

### M2 Create order (`max-w-lg`, tallest modal, scrolls)
Helper: *"A new shipper request is created and offered to the front waiting
driver of the matching vehicle type."*

1. **Request mode** (card `bg-slate-50`) — radio group:
   - **Individual target** (default) — offers the order to the front waiting
     driver of the vehicle type.
   - **Company target** — only creates a batch header; driver rows are deferred
     until a company bid is accepted (does NOT dispatch to the queue).
   - Helper text under the radios explaining the difference.
2. **Shipper phone number** *(required)* — highlighted callout
   (`bg-blue-50`, blue border + blue labels); helper: *"Registers the shipper if
   they do not have an account yet."*
3. Two-column field grid:
   - **Item name** (text)
   - **Quantity (quintal)** (number, step any)
   - **Shipping cost** (number)
   - **Number of vehicles** (number, int ≥1, default 1)
   - **Shipping date** (date picker)
   - **Delivery date** (date picker)
   - **Vehicle type** (select, loaded from `/admin/vehicleTypes`, shows name +
     carrying capacity e.g. "Isuzu (18 quintal)"; disabled + "Loading…" while
     fetching; "Select a vehicle type" placeholder)
4. **Origin** card (`bg-slate-50`): labeled "Set from the organization's current
   location." Fields **Place** (org address), **Latitude**, **Longitude** —
   pre-filled from the org profile (editable as fallback).
5. **Destination** card: **Search place** — Photon autocomplete (min 3 chars,
   350ms debounce, dropdown of 5 results, "Searching…" while loading). Selecting
   a result shows a **read-only summary**: Place (label) + Latitude + Longitude.
6. Footer: **Cancel** + **Create order** (primary). Pending → "Creating…".
- Validation: all required fields; inline red errors; delivery ≥ shipping date.
- Success toast depends on mode:
  - individual → **"Order created and offered to the queue"**
  - company → **"Company target batch created (rows deferred until bid
    acceptance)"**
- Design note: the destination read-only block is best rendered as a small map
  thumbnail + place + coords card.

### M3 Manual check-in (`max-w-sm`)
- Title: **Manual check-in**.
- Fields: **Vehicle-Driver ID** (required, uuid placeholder), **Queue number**
  *(optional — "auto-assigned").*
- Footer: Cancel + **Check in** (blue). Pending → "Checking in…".
- Success toast: `"Driver checked in at #3"` (uses returned queueNumber).

### M4 Dispatch to front driver (`max-w-sm`)
- Title: **Dispatch to front driver**.
- Helper: `Vehicle type: {vehicleTypeId}` (show name, not raw id).
- Field: **Shipper request ID** *(optional — order link, can be attached later).*
- Footer: Cancel + **Dispatch** (blue). Pending → "Dispatching…".
- Success toast: `"Offered to driver #1"`.
- Error 404 (no waiting driver): toast from backend message.

### M5 Override position (`max-w-sm`)
- Title: **Override position**.
- Helper: `{driverName} — currently #{queueNumber}`.
- Fields: **New queue number** (number ≥1), **Reason** (textarea, 3 rows,
  labeled *"(audit logged)"*, placeholder "e.g. physically first, app login
  failed").
- Footer: Cancel + **Override** (blue). Pending → "Saving…".

### M6 Cancel driver (`max-w-sm`)
- Title: **Cancel driver from queue**.
- Body: *"Remove **{driverName}** (#{queueNumber}) from the line? This is
  audit-logged."*
- Footer: **Keep** (ghost) + **Cancel driver** (red). Pending → "Removing…".
- Success toast: `"{driverName} removed from queue"`.

---

## 8. Responsive behavior summary (desktop vs mobile)

| Region | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| App header | brand left, user line + Sign out right | compact row; consider truncating name, icon-only Sign out |
| Auth | centered card `max-w-sm`; split theme shows 50% brand panel | full-width card, panel hidden |
| Dashboard orgs | data table | card list (name/type/pills/action stacked) |
| Org manage grid | 2 columns (profile | members+admin) | stacked single column |
| Members | table | card list |
| Queue board toggle | tabs in top bar | full-width segmented control; actions wrap |
| By-type sections | table per type | table → card list (or horizontally scrollable table) |
| All drivers | table | card list |
| Modals | centered `max-w-sm`/`max-w-lg` | bottom sheet or centered w/ `px-4`, 90vh max, scrollable |
| Create order grid | 2-col fields | single column |
| Toasts | top-right | top-center full-width |

Tables should be avoided on mobile; use stacked cards with the same info density.

---

## 9. Interaction & micro-copy notes for the designer

- Every destructive action is **confirmed** before executing (M6, reject/suspend).
- Every mutation gives a **toast** (success + error from backend `message`).
- Empty states always include a **next action** hint ("Create one below — an
  admin will approve it").
- The board updates live — show **status transitions** visibly (pills + row
  highlight), since operators watch this screen continuously.
- Loading buttons swap label text ("Please wait… / Creating… / Dispatching…").
- Phone inputs are Ethiopia-default `+251`, auto-grouped; OTP is 6 boxes.
- Long UUIDs appear in some places (vehicle type footer, modal helpers) — design
  should replace them with human-readable labels (names from the vehicle-types
  and drivers lists).

---

## 10. Frames to deliver

Auth (desktop × mobile, per theme):
1. S1 Login · empty
2. S1 Login · error (invalid phone)
3. S2 Register · filled
4. S3 OTP · empty + filled
5. S3 OTP · error

App (desktop + mobile):
6. S4 Dashboard · list with mixed statuses
7. S4 Dashboard · empty state
8. S4 M1 Create org · with address dropdown open
9. S5 Org manage · profile + members + admin actions
10. S6 Live queue · by vehicle type, mixed statuses (waiting/offered/loaded)
11. S6 Live queue · all drivers
12. S6 M2 Create order · request mode + origin/destination
13. S6 M3 Check-in · M4 Dispatch · M5 Override · M6 Cancel
14. States set: loading, error banner, offline/connecting pill, row highlight

Component sheet:
15. Buttons (primary/ghost/destructive/small), pills, inputs (+error/focus),
    selects, OTP, toasts, modal scaffold, live pill.
