# QueueAdmin Frontend

Dispatch-queue management console for queue staff: **Queue Org Admin (role 11)**
and **Queue Dispatcher (role 12)**, plus Admin (3) / SuperAdmin (6).

## Stack

- Vite + React + TypeScript
- **Hand-written CSS** — 23 co-located `.css` files plus design tokens in
  `src/index.css`. **There is no Tailwind** and no utility-class framework.
- **Redux Toolkit / RTK Query** for server state; React Context for auth and
  theme. Zustand (`src/store/queueAdminStore.ts`) is barely used.
- React Hook Form + Zod (forms/validation)
- axios (a few legacy calls in `src/services/`), socket.io-client (realtime),
  sonner (toasts), date-fns

> `@tanstack/react-query` is listed in `package.json` but **nothing imports it**.
> The project uses RTK Query. Treat the dependency as dead weight.

## Authentication

Session auth is a **httpOnly cookie**, not a JS-held token. The client never
stores or sends a JWT, and never sets an `Authorization` header — requests use
`credentials: "include"` (`src/lib/redux/api/base.ts`).

The cookie is set by the backend at **`POST /user/verifyUserByOTP`**, i.e. after
the OTP is confirmed, not at the password/OTP-request step. There is no
refresh-token flow, so "reauth" means logout.

**Session length depends on the account's role** (backend
`Utils/SessionPolicy.js`, driven by `SESSION_TTL_ADMINS` / `SESSION_TTL_OTHERS`):

| Role | ID | Session |
|------|----|---------|
| Admin | 3 | **24h** |
| SuperAdmin | 6 | **24h** |
| Queue Org Admin | 11 | 365d |
| Queue Dispatcher | 12 | 365d |
| Shipper, Driver, Vehicle Owner, Company, Company Admin, Dispatcher, Vehicle | 1, 2, 4, 7, 8, 9, 10 | 365d |

**If you are signed out after exactly one day, you are logged in as role 3 or 6.**
That is the policy working, not a session bug. Test with a role 11 or role 12
account to see the long-session behaviour this console actually ships with.

Role 12 is resolved server-side: the console does **not** send a `roleId` on
login or OTP verification (`src/services/auth.service.ts`), so a dispatcher and
an org admin can both sign in.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173 — proxies /api + /socket.io to localhost:3000
```

```env
# .env — VITE_API_BASE_URL / VITE_WEBSOCKET_URL are canonical.
# The *_API_URL / _SOCKET_URL names are still honoured as fallbacks.
VITE_API_BASE_URL=https://api.example.com      # default "/api" (dev proxy)
VITE_WEBSOCKET_URL=https://api.example.com     # default "/" → falls back to API base
VITE_PHOTON_URL=https://photon.komoot.io/api/   # optional geocoder (place search)
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — oxlint
- `npm run preview` — preview production build

## Docs

- `docs/queadmin-frontend.md` — full API reference (payloads/responses), auth
  workflow, socket contract, TS types, component breakdown, module standards.
- `docs/queadmin-operations.md` — operator guide for the QueueOrgAdmin role.
- `docs/queue-admin-gap-analysis.md` — console vs backend gap register.

Backend repo: `transportBackEndNative` (sibling). Queue API scaffold lives on
branch `feature/queue-dispatch`.
