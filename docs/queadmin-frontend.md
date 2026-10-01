# QueueAdmin Frontend — API Reference & Build Guide

Frontend specification for the **queue staff dashboard** — Queue Org Admin
(role 11) and Queue Dispatcher (role 12), plus Admin (3) / SuperAdmin (6).
Stack: **React + TypeScript + Vite + RTK Query + hand-written CSS +
socket.io-client + react-router-dom**.

> There is **no Tailwind** in this project. Styling is 23 co-located `.css`
> files plus design tokens in `src/index.css`.

This document is the single source of truth for the frontend team. It contains:

1. [Environment & wiring](#1-environment--wiring)
2. [Module standards (use these)](#2-module-standards--conventions)
3. [Auth workflow (REST + session cookie)](#3-auth-workflow)
4. [REST API reference — payloads & responses](#4-rest-api-reference)
5. [Socket.io real-time contract](#5-socketio-realtime-contract)
6. [TypeScript types](#6-typescript-types)
7. [End-to-end workflows](#7-end-to-end-workflows)
8. [Component breakdown](#8-component-breakdown)
9. [Error handling contract](#9-error-handling-contract)

All paths are relative to the backend base URL. Example:
`https://api.example.com` → `POST /api/user/loginUser`.

---

## 1. Environment & wiring

```env
# .env  (frontend) — VITE_API_BASE_URL / VITE_WEBSOCKET_URL are canonical.
# The older VITE_API_URL / VITE_SOCKET_URL names are still read as fallbacks.
VITE_API_BASE_URL=https://api.example.com
VITE_WEBSOCKET_URL=https://api.example.com   # same origin; io() connects to /socket.io
```

- **REST** → RTK Query `fetchBaseQuery` (`src/lib/redux/api/base.ts`), base URL
  from `VITE_API_BASE_URL` via `src/utils/baseUrl.ts`. A legacy axios instance
  survives in `src/lib/api.ts` and is used by `src/services/auth.service.ts`.
- **Socket** → `io(VITE_WEBSOCKET_URL, { auth: {...} })`.
- **Auth is an httpOnly cookie.** The client never stores or sends a JWT and
  never sets an `Authorization` header. Every request is sent with
  `credentials: "include"`, and the backend sets the cookie at
  `POST /user/verifyUserByOTP`.
- Dev proxy: Vite forwards `/api` and `/socket.io` to `http://localhost:3000`
  (backend). So in dev the base URL defaults to `/api`.

## 2. Module standards & conventions

Fixed module set — use these for all new work so the codebase stays consistent:

| Concern | Module | Where to put code |
|---|---|---|
| Server state / caching | **RTK Query** (`@reduxjs/toolkit/query/react`) | `src/lib/redux/api/*_endpoints.ts`; tags for invalidation, `useXQuery`/`useXMutation` hooks |
| Client state | **React Context** (`src/context/AuthContext.tsx`, `src/contexts/ThemeContext.tsx`) | Zustand survives in `src/store/queueAdminStore.ts` but is barely used |
| Forms + validation | **React Hook Form** + **Zod** (`@hookform/resolvers/zod`) | `useForm({ resolver: zodResolver(schema) })`; schemas in `src/schemas/` |
| Toasts | **sonner** (`sonner`) | `toast.success/error(...)`; `<Toaster />` mounted in `main.tsx` |
| Dates | **date-fns** | format `joinedAt`, `performedAt`, etc. |
| Auth persistence | **localStorage** (non-secret user profile only) | `src/lib/auth.ts` (key `queueadmin:auth`) + `src/context/AuthContext.tsx` |
| Realtime | **socket.io-client** | `src/lib/socket.ts` (singleton + queue room helpers) |

Conventions:
- All API calls go through RTK Query endpoints in `src/lib/redux/api/` (never call
  `fetch`/axios directly from components).
- Tags drive cache invalidation; mutations declare `invalidatesTags`.
- No polling: socket `queue` events → `invalidateQueries(["queue-status"])`.
- Route guards: `ProtectedRoute` (auth present) wraps `RoleGuard` (roles 11 / 12 / 3 / 6).

---

## 2. Auth workflow

Two-step: **request OTP** → **verify OTP → session cookie**. The backend sets an
httpOnly cookie on verification; the client keeps no token. That cookie
authorizes both REST requests and the socket handshake.

**The console sends no `roleId` on login or verification** — the backend
resolves the account's own role from `UserRole`. That is what lets a role 12
dispatcher sign in here. (Registration is the exception: it *creates* a role 11
account, so it does send `roleId`.)

### 2.1 Request OTP (login)

`POST /api/user/loginUser`

Request:
```json
{ "phoneNumber": "+251912345678" }
```
(`email` is an alternative to `phoneNumber`. `roleId` is **optional** — the
service resolves the account's own role from `UserRole`. When it is supplied it
is still validated against the known role list, so a client cannot assert a role
it was never granted.)

Response `200` — OTP is sent by SMS, **never returned**:
```json
{
  "message": "OTP sent successfully",
  "data": {
    "userId": 1,
    "userUniqueId": "0b1c…",
    "fullName": "Queue Admin",
    "phoneNumber": "+251912345678",
    "email": "qa@mojo.com",
    "isPhoneVerified": 1,
    "isEmailVerified": 1,
    "userCreatedAt": "2026-01-01T00:00:00.000Z"
  },
  "messageDetail": "Verification data generated (Deferred)"
}
```

> If the phone is **not yet verified**, the login response is the same shape but
> the OTP is a channel-specific verification OTP. Dev/test environments accept
> the configured test OTP (`Config.TEST.OTP`, default `101010`).

### 2.2 Verify OTP → token

`POST /api/user/verifyUserByOTP`

Request:
```json
{ "phoneNumber": "+251912345678", "OTP": "101010" }
```

Response `200`:
```json
{
  "message": "OTP verified successfully",
  "token": "eyJhbGciOi…",
  "userData": {
    "userId": 1,
    "userUniqueId": "0b1c…",
    "fullName": "Queue Admin",
    "phoneNumber": "+251912345678",
    "email": "qa@mojo.com",
    "isPhoneVerified": 1,
    "isEmailVerified": 1,
    "userCreatedAt": "2026-01-01T00:00:00.000Z",
    "roleId": 11
  }
}
```

The session cookie carries a JWT with `{ userUniqueId, fullName, phoneNumber,
email, roleId, isPhoneVerified, isEmailVerified }`. The console stores only the
non-secret `userData` in localStorage — never the token.

**Frontend behavior:**
1. Store **`userData` only** in localStorage (`queueadmin:auth`). No token.
2. Send every request with `credentials: "include"` so the cookie travels.
3. On **`401` only** → clear auth and redirect to `/login`. A **`403` is an
   inline "not permitted" error and must NOT log the user out.**
4. Establish the socket connection (below).

### 2.3 Register a QueueOrgAdmin account

Queues do not create users. A Super Admin / Admin creates the account
(`POST /api/admin/createUserByAdminOrSuperAdmin`) and assigns the user to the
queue org (`POST /api/queueOrganization/:id/members` with `userUniqueId` and `roleId` —
11 or 12 — in the **body**). See [§3.2](#32-queue-organization-endpoints).

---

## 3. REST API reference

All endpoints require the httpOnly session cookie (sent via `credentials: "include"`).
Roles: **QA** = QueueOrgAdmin (11), **QD** = QueueDispatcher (12), **A** =
Admin/SuperAdmin, **CA** = CompanyAdmin.

### 3.1 Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/user/loginUser` | Public | Request login OTP |
| POST | `/api/user/verifyUserByOTP` | Public | Verify OTP → JWT |

Payloads/responses in [§2](#2-auth-workflow).

### 3.2 Queue Organization endpoints

#### Create queue org — `POST /api/queueOrganization` (A / CA)

Request:
```json
{
  "queueOrganizationName": "Mojo Kaliy",
  "queueOrganizationType": "customs",
  "queueOrganizationPhone": "+251…",
  "queueOrganizationAddress": "…",
  "latitude": 8.9775,
  "longitude": 38.7578
}
```
`queueOrganizationType`: `customs | factory | cement | depot | other`.

Response `201`:
```json
{ "message": "success", "data": { "queueOrganizationUniqueId": "uuid", "approvalStatus": "pending" } }
```
The creator is auto-added as **QueueOrgAdmin (role 11)**.

#### List queue orgs — `GET /api/queueOrganization` (any authenticated)

Query params: `queueOrganizationUniqueId`, `queueOrganizationType`,
`approvalStatus` (`pending|approved|rejected|suspended`), `queueEnabled`,
`page`, `limit`.

Response `200` (paginated):
```json
{
  "message": "success",
  "data": [
    {
      "queueOrganizationId": 1,
      "queueOrganizationUniqueId": "uuid",
      "queueOrganizationName": "Mojo Kaliy",
      "queueOrganizationType": "customs",
      "queueOrganizationPhone": "+251…",
      "queueOrganizationAddress": "…",
      "latitude": "8.97750000",
      "longitude": "38.75780000",
      "approvalStatus": "approved",
      "approvalReason": null,
      "queueEnabled": 1,
      "approvedBy": "uuid",
      "approvedAt": "2026-08-06T00:00:00.000Z",
      "queueOrganizationCreatedAt": "…",
      "isDeleted": 0
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```
> NOTE: `latitude`/`longitude` and dates come back as strings from mysql2.

#### Update queue org profile — `PATCH /api/queueOrganization/:id` (QA / A)

Body (all optional): `queueOrganizationName`, `queueOrganizationType`,
`queueOrganizationPhone`, `queueOrganizationAddress`, `latitude`, `longitude`.

Response:
```json
{ "message": "success", "data": { "queueOrganizationUniqueId": "uuid" } }
```

#### Approve / suspend / toggle — `PATCH /api/queueOrganization/:id/approve` (A only)

```json
{ "approvalStatus": "approved", "approvalReason": "ok", "queueEnabled": true }
```
`approvalStatus`: `approved | rejected | suspended`.
Response:
```json
{ "message": "success", "data": { "queueOrganizationUniqueId": "uuid", "approvalStatus": "approved" } }
```
> Queue dispatch is only possible when `approvalStatus === "approved"` AND
> `queueEnabled === true`.

#### Delete (soft) — `DELETE /api/queueOrganization/:id` (A only)

Response:
```json
{ "message": "success", "data": { "queueOrganizationUniqueId": "uuid" } }
```

#### Add member — `POST /api/queueOrganization/:id/members/:userUniqueId` (QA / A)

```json
{ "roleId": 11, "isActive": true }
```
`roleId`: `11` (QueueOrgAdmin) or `12` (QueueDispatcher) — the only two values
the backend accepts (`Validations/QueueOrganization.schema.js`). A shipper is
role 1 and cannot be a queue org member.
Response `201`:
```json
{ "message": "success", "data": { "queueOrganizationUniqueId": "uuid", "userUniqueId": "uuid", "roleId": 11 } }
```

#### List members — `GET /api/queueOrganization/:id/members` (QA / A)

Response:
```json
{
  "message": "success",
  "data": [
    {
      "queueOrganizationMembershipUniqueId": "uuid",
      "userUniqueId": "uuid",
      "roleId": 11,
      "isActive": 1,
      "membershipStartDate": "2026-08-06T00:00:00.000Z",
      "fullName": "Queue Admin",
      "phoneNumber": "+251912345678"
    }
  ]
}
```

### 3.3 Driver Queue endpoints

#### Driver check-in — `POST /api/queue/driver/checkin` (driver)

```json
{ "queueOrganizationUniqueId": "uuid", "vehicleDriverUniqueId": "uuid", "latitude": 8.98, "longitude": 38.75 }
```

Response `201` — server stamps the position:
```json
{
  "message": "success",
  "data": {
    "queueUniqueId": "uuid",
    "queueOrganizationUniqueId": "uuid",
    "queueDate": "2026-08-06",
    "queueNumber": 3,
    "position": 3,
    "vehicleTypeUniqueId": "uuid"
  }
}
```

#### My position — `GET /api/queue/driver/myPosition?queueOrganizationUniqueId=<id>` (driver)

Response:
```json
{
  "message": "success",
  "data": {
    "queueUniqueId": "uuid",
    "queueNumber": 3,
    "joinedAt": "2026-08-06T06:00:00.000Z",
    "status": "waiting",
    "offeredAt": null,
    "loadedAt": null,
    "vehicleDriverUniqueId": "uuid",
    "driverUserUniqueId": "uuid",
    "driverName": "…",
    "driverPhoneNumber": "+251…",
    "vehicleTypeUniqueId": "uuid",
    "shipperRequestUniqueId": null,
    "waitingAhead": 2
  }
}
```

#### Driver checkout — `DELETE /api/queue/driver/checkout` (driver)

Body: same as check-in (`queueOrganizationUniqueId`, `vehicleDriverUniqueId`).
Response:
```json
{ "message": "success", "data": { "queueUniqueId": "uuid", "status": "removed" } }
```

#### Queue status — `GET /api/queue/status?queueOrganizationUniqueId=<id>&queueDate=2026-08-06` (QA / A)

`queueDate` optional (defaults to today). Response — the **dispute truth**,
grouped by vehicle type:
```json
{
  "message": "Query results fetched",
  "data": {
    "queueOrganizationUniqueId": "uuid",
    "queueDate": "2026-08-06",
    "totalWaiting": 4,
    "queues": {
      "55060ed0-…": [
        {
          "queueUniqueId": "uuid",
          "queueNumber": 1,
          "joinedAt": "2026-08-06T05:58:00.000Z",
          "status": "waiting",
          "offeredAt": null,
          "loadedAt": null,
          "vehicleDriverUniqueId": "uuid",
          "driverUserUniqueId": "uuid",
          "driverName": "Ato Bekele",
          "driverPhoneNumber": "+251911111111",
          "vehicleTypeUniqueId": "55060ed0-…",
          "shipperRequestUniqueId": null
        }
      ]
    }
  }
}
```
`queues` key is a map `vehicleTypeUniqueId → DriverQueueEntry[]` ordered by
`queueNumber ASC`. `status`: `waiting | offered | loaded | removed`.

#### Manual check-in — `POST /api/queue/manualCheckin` (QA)

```json
{ "queueOrganizationUniqueId": "uuid", "vehicleDriverUniqueId": "uuid" }
```
Optional `queueNumber` to pin an explicit ticket:
```json
{ "queueOrganizationUniqueId": "uuid", "vehicleDriverUniqueId": "uuid", "queueNumber": 7 }
```
Response `201`:
```json
{ "message": "success", "data": { "queueUniqueId": "uuid", "queueNumber": 7, "status": "waiting" } }
```

#### Override position — `PATCH /api/queue/entry/:queueUniqueId/override` (QA)

```json
{ "queueNumber": 2, "reason": "Physically first, app login failed" }
```
Response:
```json
{ "message": "success", "data": { "queueUniqueId": "uuid", "queueNumber": 2 } }
```
Audit-logged (`action: override`, `beforeValue` → `afterValue`).

#### Remove entry — `DELETE /api/queue/entry/:queueUniqueId` (QA)

Cancel a driver from the line (no-show / duplicate / admin cancel).
Response:
```json
{ "message": "success", "data": { "queueUniqueId": "uuid", "status": "removed" } }
```
Audit-logged (`action: remove`).

#### Dispatch — `POST /api/queue/dispatch` (QA)

Offer a waiting order to the **front** waiting driver of the matching type.

```json
{ "queueOrganizationUniqueId": "uuid", "vehicleTypeUniqueId": "uuid", "shipperRequestUniqueId": "uuid" }
```
`shipperRequestUniqueId` optional (order link; can be attached later).

Response:
```json
{
  "message": "success",
  "data": {
    "queueUniqueId": "uuid",
    "queueNumber": 1,
    "driverUserUniqueId": "uuid",
    "status": "offered"
  }
}
```
The front driver is notified over socket (`queue_order_offered`).
Fails `404` if no one is waiting in that vehicle type.

#### Place a queue order — `POST /api/shipperRequest` (shipper / QA)

Same payload as a normal order, plus `queueOrganizationUniqueId` (and a fixed
`shippingCost` — queue orders do **not** bid):

```json
{
  "queueOrganizationUniqueId": "uuid",
  "shippingCost": 120000,
  "vehicleTypeUniqueId": "uuid",
  "numberOfVehicles": 1,
  "...": "rest of a normal shipperRequest body"
}
```

The backend **auto-offers** it to the front waiting driver of the matching type
(`handleQueueDispatch`, see Workflow C). If no driver is waiting, the order stays
`waiting` — re-offer with `dispatch` above. `numberOfVehicles: N` → N rows, each
offered to the next front driver.

---

## 4. Socket.io realtime contract

### 4.1 Connection handshake

```ts
import { io } from "socket.io-client";

const socket = io(VITE_WEBSOCKET_URL, {
  // Top-level, NOT inside `auth`: this is what makes the browser send the
  // httpOnly session cookie. Putting it in `auth` silently does nothing.
  withCredentials: true,
  auth: {
    // MUST be "queueOrgAdmin" for BOTH role 11 and role 12. Sockets are keyed
    // `${userType}:${phone}` and every queue fan-out looks members up under the
    // queueOrgAdmin key while selecting `roleId IN (11, 12)`
    // (Utils/QueueSocket.js). A "queueDispatcher" identity registers under a key
    // nobody reads from and receives no events.
    user: "queueOrgAdmin",
    phoneNumber: "+251912345678",
  },
});
```

The session cookie is named `token` and authenticates the handshake, so nothing
is sent in `auth`. `phoneNumber` is still required — it is the socket-room key,
not a credential.

Rejection (`Utils/WSPusher.js`): missing/unverifiable token → `UNAUTHORIZED`;
phone number not 9–15 digits, or `user` outside the allowed set → `BAD_REQUEST`.

### 4.2 Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `queue:subscribe` | client → server | `{ queueOrganizationUniqueId: string, queueDate?: "YYYY-MM-DD" }` | Join `queueOrg:<id>` (all dates) + `queueOrg:<id>:<date>` (that day) |
| `queue:subscribed` | server → client | `{ queueOrganizationUniqueId, queueDate? }` | Ack on join |
| `queue:unsubscribe` | client → server | same as subscribe | Leave rooms |
| `queue:unsubscribed` | server → client | same | Ack on leave |
| `queue` | server → client | `string` (JSON.stringify) | Live queue change |

### 4.3 `queue` event payload

The `queue` event data is a **JSON string** — always `JSON.parse` it:

```ts
type QueueEventPayload = {
  message: string;            // "success" etc.
  messageTypes: string;       // see table below
  data?: Record<string, unknown>;
};
```

`messageTypes` values (from `Utils/MessageTypes.js`):

| messageTypes | When pushed | `data` hint |
|---|---|---|
| `queue_checkin_confirmed` | driver checked in | queue entry |
| `queue_position_changed` | queue changed | — |
| `queue_order_offered` | dispatch offered to a driver | `{ queueUniqueId, shipperRequestUniqueId, offerWindowMinutes: 3 }` |
| `queue_order_rejected` | driver rejected an offer | — |
| `queue_order_assigned` | driver accepted / job loaded | — |
| `queue_removed` | entry removed / checkout | — |
| `queue_org_approved` | org approved/suspended | `{ queueOrganizationUniqueId, approvalStatus, queueEnabled }` |
| `queue_org_updated` | org profile updated | `{ queueOrganizationUniqueId }` |

**Client rules:**
1. After `queue:subscribed`, the dashboard loads `GET /api/queue/status`
   (full snapshot) once.
2. Every `queue` event is an **invalidation signal** — refetch `status` (or
   apply optimistic updates from the payload). Do not poll.

---

## 5. TypeScript types

```ts
export const QUEUE_ORG_TYPES = ["customs", "factory", "cement", "depot", "other"] as const;
export type QueueOrgType = (typeof QUEUE_ORG_TYPES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const QUEUE_STATUSES = ["waiting", "offered", "loaded", "removed"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export interface AuthUser {
  userId: number;
  userUniqueId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  isPhoneVerified: number;
  isEmailVerified: number;
  userCreatedAt: string;
  roleId: number;
}

export interface LoginResponse {
  message: string;
  data: AuthUser;
}

export interface VerifyOtpResponse {
  message: string;
  token: string;
  userData: AuthUser;
}

export interface QueueOrganization {
  queueOrganizationId: number;
  queueOrganizationUniqueId: string;
  queueOrganizationName: string;
  queueOrganizationType: QueueOrgType;
  queueOrganizationPhone: string | null;
  queueOrganizationAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  approvalStatus: ApprovalStatus;
  approvalReason: string | null;
  queueEnabled: number;
  approvedBy: string | null;
  approvedAt: string | null;
  queueOrganizationCreatedAt: string;
  isDeleted: number;
}

export interface QueueOrgMember {
  queueOrganizationMembershipUniqueId: string;
  userUniqueId: string;
  roleId: number;
  isActive: number;
  membershipStartDate: string;
  fullName: string;
  phoneNumber: string;
}

export interface DriverQueueEntry {
  queueUniqueId: string;
  queueNumber: number;
  joinedAt: string;
  status: QueueStatus;
  offeredAt: string | null;
  loadedAt: string | null;
  vehicleDriverUniqueId: string;
  driverUserUniqueId: string;
  driverName: string;
  driverPhoneNumber: string;
  vehicleTypeUniqueId: string;
  shipperRequestUniqueId: string | null;
}

export interface QueueStatusResponse {
  message: string;
  data: {
    queueOrganizationUniqueId: string;
    queueDate: string;
    totalWaiting: number;
    queues: Record<string, DriverQueueEntry[]>;
  };
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

---

## 6. End-to-end workflows

### Workflow A — Onboard a queue org (Super Admin)

```
Admin:  POST /api/user/loginUser → OTP → POST /api/user/verifyUserByOTP → token
Admin:  POST /api/queueOrganization                 { queueOrganizationName, type: "customs", … }
Admin:  PATCH /api/queueOrganization/:id/approve    { approvalStatus: "approved", queueEnabled: true }
QA:     POST /api/queueOrganization/:id/members/:userUniqueId   { roleId: 11 }
```
Result: the org is approved+enabled, the QueueOrgAdmin can log in.

### Workflow B — Daily queue run (QueueOrgAdmin)

```
QA login:   loginUser → verifyUserByOTP → token
Socket:     io(…, { auth: { user: "queueOrgAdmin", phoneNumber, token } })
            socket.emit("queue:subscribe", { queueOrganizationUniqueId })
Dashboard:  GET /api/queue/status?queueOrganizationUniqueId=<id>   ← full snapshot
            socket.on("queue", …)                                  ← live invalidations
Register:   POST /api/queue/manualCheckin    { queueOrganizationUniqueId, vehicleDriverUniqueId }
Reorder:    PATCH /api/queue/entry/:queueUniqueId/override  { queueNumber, reason }
Cancel:     DELETE /api/queue/entry/:queueUniqueId
Assign:     POST /api/queue/dispatch  { queueOrganizationUniqueId, vehicleTypeUniqueId, shipperRequestUniqueId }
```

### Workflow C — Dispatch & offer lifecycle

```
1. Queue-enabled org places an order → POST /api/shipperRequest
   with queueOrganizationUniqueId + fixed shippingCost.
2. Server auto-offers it to the FRONT waiting entry of the order's vehicle type:
   JourneyDecision (requested, decisionBy='shipper') + DriverRequest created,
   entry → status "offered", offeredAt set, order linked (shipperRequestUniqueId)
3. Server socket push to that driver: queue (messageTypes=queue_order_offered,
   data.offerWindowMinutes=3)
4. Driver accepts → entry "loaded" (markEntryLoaded in the accept path)
5. Driver rejects (or 3-min timeout via releaseExpiredOffers) → entry returns to
   "waiting" (driver keeps position), decision → rejectedByDriver, order
   advances to the NEXT waiting driver of that type
6. Empty queue → order stays waiting; QA re-offers with
   POST /api/queue/dispatch once a driver checks in
```

---

## 7. Component breakdown

```
src/
  lib/
    api.ts                 legacy axios instance (used by src/services/ only)
    redux/api/             RTK Query base + injected endpoints (credentials: "include")
    socket.ts              socket singleton (connect, subscribe, event registry)
    auth.ts                localStorage userData only (key queueadmin:auth) — no token
  store/
    queueAdminStore.ts     zustand + persist: selectedOrgId, socketConnected
  context/
    AuthContext.tsx        auth provider + useAuth()
  schemas/
    queue.ts               zod schemas (login, otp, checkin, dispatch, override)
  types/queue.ts           TS types (see §6)
  pages/
    QueueDashboardPage.tsx org selector (zustand) + live queue (react-query)
    QueueOrgManagePage.tsx org profile edit + members list + admin approve/suspend/reject (route /orgs/:id)
  components/
    auth/
      AuthFlow.tsx         config-driven auth: login / register / verify-OTP, design prop
      AuthShell.tsx        layout shell (4 designs: classic / split / glass / minimal)
      useAuthFlow.ts       state machine + OTP mutations + validation
      fields.tsx           dynamic field renderer (text/tel/email + 6-box OTP)
      themes.ts            per-design class maps
      ProtectedRoute.tsx   redirect to /login if no token
      RoleGuard.tsx        allow roleId 11 / 12 / 3 / 6
    queue/
      QueueBoard.tsx       react-query status query + socket subscribe/invalidate
      QueueTable.tsx       grouped-by-type table (queueNumber, driver, status, actions)
      CheckinModal.tsx     RHF+zod manualCheckin form
      DispatchModal.tsx    RHF+zod dispatch form (shipperRequestUniqueId)
      OverrideModal.tsx    RHF+zod override position + reason
      ConfirmCancel.tsx    removeEntry confirm
```

**QueueBoard behavior contract:**
- `useQuery(["queue-status", orgId])` for the full snapshot.
- On mount: `queue:subscribe`; every `queue` socket event →
  `invalidateQueries(["queue-status", orgId])` (debounced ~250ms).
- `socketConnected` from zustand drives the live/connecting pill.
- Mutations (`checkin`/`dispatch`/`override`/`remove`) live in the modals,
  `onSuccess` → toast + invalidate.

---

## 8. Error handling contract

The backend returns errors as:

```json
{ "status": "error", "message": "…", "statusCode": 409 }
```

| statusCode | Meaning | Frontend action |
|---|---|---|
| `400` | validation / bad payload | show field errors |
| `401` | invalid OTP / bad token | toast + re-login |
| `403` | queue org not enabled / no permission | toast + disable dispatch actions |
| `404` | not found (`queue entry`, `vehicleDriver`, `no waiting driver`) | toast + refetch status |
| `409` | duplicate (already checked in / already member) | toast, highlight row |

Axios interceptor: on `401` → clear storage + `navigate("/login")`; on `403` →
toast; on network error → `offline` banner (queue updates will resume via
socket reconnect).
