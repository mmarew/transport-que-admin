# System Admin of Queue — Backend API Reference

This document is prepared for the admin page developer to manage queue-related features. It covers every API endpoint, socket event, database table, and configuration the frontend needs.

---

## 1. Why Queue Exists

Busy factories, customs depots, cement plants, and ports need fleet order management. Without a queue, the factory has no visibility into which truck is next, leading to driver disputes and operational chaos. The queue provides a virtual waiting line where drivers check in, get dispatched orders in FIFO order, and the admin can override positions when needed.

---

## 2. Roles & Auth

### Role IDs

| Role Name | roleId | Description |
|---|---|---|
| shipper | 1 | Creates orders, receives dispatch notifications |
| driver | 2 | Checks into queue, receives/dispatches orders |
| admin | 3 | Full system access (approve orgs, manage all queues) |
| vehicleOwner | 4 | Owns vehicles |
| system | 5 | Internal system account |
| superAdmin | 6 | Full system access (same as admin for queue) |
| companyAdmin | 7 | Manages transport companies |
| queueOrgAdmin | 11 | Manages a specific queue organization |

### Auth Middleware

Every request requires a valid JWT token (`verifyTokenOfAxios`). Beyond that, endpoints use role-based middleware:

| Middleware | Allowed Roles | Used By |
|---|---|---|
| `verifyTokenOfAxios` | Any authenticated user | All endpoints (baseline) |
| `verifyIfUserIsAdminOrSupperAdmin` | 3 (admin), 6 (superAdmin) | Approve org, Delete org |
| `verifyIfUserIsQueueOrgAdmin` | 3, 6, 11 | Org detail, Update org, Add member, List members, Queue status, Manual checkin, Dispatch, Override, Remove entry |
| `verifyIfUserIsAdminSuperAdminCompanyAdminOrQueueOrgAdmin` | 3, 6, 7, 11 | Create org, List orgs |

### Two-Gate Activation

A queue organization requires BOTH conditions to be active:
1. `approvalStatus = "approved"`
2. `queueEnabled = true`

Only admin (3) or superAdmin (6) can change approval status. When approving, `queueEnabled` defaults to `true`. When rejecting/suspending, it defaults to `false`. The admin can override `queueEnabled` explicitly in the approval request.

---

## 3. Database Tables

### QueueOrganization

The core entity. Represents a physical location (factory, customs depot, cement plant) that hosts a driver queue.

| Column | Type | Description |
|---|---|---|
| `queueOrganizationUniqueId` | VARCHAR(36) | Primary key (UUID) |
| `queueOrganizationName` | VARCHAR(255) | Display name (unique among non-deleted orgs) |
| `queueOrganizationType` | ENUM | `customs`, `factory`, `cement`, `depot`, `other` |
| `queueOrganizationPhone` | VARCHAR(20) | Contact phone (optional) |
| `queueOrganizationAddress` | VARCHAR(500) | Address (optional) |
| `latitude` | DECIMAL(10,8) | Site reference / order pickup point |
| `longitude` | DECIMAL(11,8) | Site reference / order pickup point |
| `checkinRadiusKm` | INT | Max distance (km) a driver can check in from. NULL = no limit |
| `approvalStatus` | ENUM | `pending`, `approved`, `rejected`, `suspended` |
| `approvalReason` | VARCHAR(500) | Admin note on approve/reject |
| `queueEnabled` | BOOLEAN | Must be true for queue to function |
| `approvedBy` | VARCHAR(36) | FK to Users (admin who approved) |
| `approvedAt` | DATETIME | When approved |
| `isDeleted` | BOOLEAN | Soft delete flag |

### QueueOrganizationMembership

Links users to a queue organization. One user can have one membership per org.

| Column | Type | Description |
|---|---|---|
| `queueOrganizationMembershipUniqueId` | VARCHAR(36) | Primary key (UUID) |
| `queueOrganizationUniqueId` | VARCHAR(36) | FK to QueueOrganization |
| `userUniqueId` | VARCHAR(36) | FK to Users |
| `roleId` | INT | 11 (QueueOrgAdmin) or 1 (shipper) |
| `isActive` | BOOLEAN | Whether membership is active |
| `membershipStartDate` | DATETIME | When membership started |
| `membershipEndDate` | DATETIME | When membership ended (null if active) |

Unique constraint: one membership per `(queueOrganizationUniqueId, userUniqueId)`.

### DriverQueue

The virtual waiting line. One entry per vehicle-driver per org per day.

| Column | Type | Description |
|---|---|---|
| `queueUniqueId` | VARCHAR(36) | Primary key (UUID) |
| `queueOrganizationUniqueId` | VARCHAR(36) | FK to QueueOrganization |
| `queueDate` | DATE | The day (daily reset) |
| `queueNumber` | INT | FIFO position (1, 2, 3...) per (org, date, vehicleType) |
| `queueRefusalCount` | INT | Consecutive front-position refusals (resets at limit) |
| `vehicleDriverUniqueId` | VARCHAR(36) | FK to VehicleDriver (truck + driver unit) |
| `shipperRequestUniqueId` | VARCHAR(36) | FK to ShipperRequest (order assigned, null if waiting) |
| `targetedShipperUserUUID` | VARCHAR(36) | FK to Users (shipper reservation, null if none) |
| `driverLatitude` | DECIMAL(10,8) | GPS at check-in |
| `driverLongitude` | DECIMAL(11,8) | GPS at check-in |
| `joinedAt` | DATETIME | Server-stamped check-in time |
| `status` | ENUM | `waiting`, `requested`, `agreed`, `notagreed`, `removed` |
| `requestedAt` | DATETIME | When order was offered |
| `agreedAt` | DATETIME | When driver accepted |

Unique constraint: one entry per `(vehicleDriverUniqueId, queueOrganizationUniqueId, queueDate)`.

### DriverQueueHistory

Column-level audit trail. Each row records ONE column change on ONE queue entry.

| Column | Type | Description |
|---|---|---|
| `historyUniqueId` | VARCHAR(36) | Primary key (UUID) |
| `queueUniqueId` | VARCHAR(36) | FK to DriverQueue |
| `columnName` | VARCHAR(50) | Which column changed |
| `oldValue` | VARCHAR(500) | Value BEFORE this change |
| `performedBy` | VARCHAR(36) | FK to Users (who made the change) |
| `performedAt` | DATETIME | When the change happened |

Tracked columns: `status`, `queueNumber`, `targetedShipperUserUUID`, `shipperRequestUniqueId`, `queueRefusalCount`, `requestedAt`, `driverLatitude`, `driverLongitude`.

### QueueAuditLog

Immutable audit trail for admin overrides and removals.

| Column | Type | Description |
|---|---|---|
| `queueAuditUniqueId` | VARCHAR(36) | Primary key (UUID) |
| `queueOrganizationUniqueId` | VARCHAR(36) | FK to QueueOrganization |
| `queueDate` | DATE | Which day's queue was changed |
| `queueUniqueId` | VARCHAR(36) | FK to DriverQueue (entry affected) |
| `action` | ENUM | `override`, `remove`, `manual_checkin`, `dispatch` |
| `beforeValue` | VARCHAR(500) | JSON snapshot before the change |
| `afterValue` | VARCHAR(500) | JSON snapshot after the change |
| `reason` | VARCHAR(500) | Supervisor note |
| `performedBy` | VARCHAR(36) | FK to Users |
| `performedAt` | DATETIME | When it happened |

---

## 4. Organization Lifecycle

```
Create (POST /api/queueOrganization)
  -> approvalStatus: "pending", queueEnabled: false
  -> Creator auto-assigned as QueueOrgAdmin (role 11)

Admin reviews (PATCH /api/queueOrganization/:id/approve)
  -> "approved"   (queueEnabled defaults to true)
  -> "rejected"   (queueEnabled defaults to false)
  -> "suspended"  (queueEnabled defaults to false)

Admin can update profile (PATCH /api/queueOrganization/:id)

Admin can soft-delete (DELETE /api/queueOrganization/:id)
```

A pending org cannot have drivers check in — the checkin endpoint verifies `approvalStatus === "approved"` AND `queueEnabled === true`.

---

## 5. All API Endpoints

Base URL: `https://queue.dynamicsroute.tech/api`

### 5.1 Organization Management

#### POST /api/queueOrganization — Create Organization

- **Auth:** admin, superAdmin, companyAdmin, queueOrgAdmin
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueOrganizationName` | string (max 255) | **YES** | Unique among non-deleted orgs |
| `queueOrganizationType` | string enum | no | `customs`, `factory`, `cement`, `depot`, `other` (default: `other`) |
| `queueOrganizationPhone` | string (max 20) | no | |
| `queueOrganizationAddress` | string (max 500) | no | |
| `latitude` | number (-90 to 90) | no | |
| `longitude` | number (-180 to 180) | no | |
| `checkinRadiusKm` | integer (1-1000) | no | null = no distance limit |

- **Response (201):**

```json
{
  "message": "success",
  "data": {
    "queueOrganizationUniqueId": "uuid",
    "approvalStatus": "pending",
    "alreadyExisted": false
  }
}
```

- **Note:** If an org with the same name already exists (not soft-deleted), returns the existing org with `alreadyExisted: true`. Creator is auto-assigned as QueueOrgAdmin.

#### GET /api/queueOrganization — List Organizations

- **Auth:** any authenticated user
- **Query params:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueOrganizationUniqueId` | UUID | no | Filter by specific org |
| `queueOrganizationType` | string enum | no | Filter by type |
| `approvalStatus` | string enum | no | `pending`, `approved`, `rejected`, `suspended` |
| `queueEnabled` | boolean | no | |
| `page` | integer | no | Default: 1 |
| `limit` | integer | no | Default: pagination default |

- **Visibility:** admin/superAdmin see all orgs. QueueOrgAdmin (11) and companyAdmin (7) see only orgs they are a member of.
- **Response (200):**

```json
{
  "message": "Query results fetched",
  "data": [
    {
      "organization": {
        "queueOrganizationUniqueId": "uuid",
        "queueOrganizationName": "Mojo Kaliy",
        "queueOrganizationType": "customs",
        "approvalStatus": "approved",
        "queueEnabled": 1,
        "...all other fields"
      },
      "creator": {
        "userUniqueId": "uuid",
        "fullName": "John",
        "phoneNumber": "+251912345678",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

- **For pending approvals badge:** Query with `?approvalStatus=pending` and read `pagination.total`.

#### GET /api/queueOrganization/:queueOrganizationUniqueId — Get Organization Detail

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Response (200):**

```json
{
  "data": {
    "organization": { "...all QueueOrganization fields" },
    "creator": { "userUniqueId": "uuid", "fullName": "...", "phoneNumber": "..." }
  }
}
```

#### PATCH /api/queueOrganization/:queueOrganizationUniqueId — Update Organization

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Body (all optional):**

| Field | Type | Notes |
|---|---|---|
| `queueOrganizationName` | string (max 255) | |
| `queueOrganizationType` | string enum | |
| `queueOrganizationPhone` | string (max 20) | null/"" to clear |
| `queueOrganizationAddress` | string (max 500) | null/"" to clear |
| `latitude` | number | null to clear |
| `longitude` | number | null to clear |
| `checkinRadiusKm` | integer | null to disable distance check |

- **Socket:** Emits `queue_org_updated` to all QueueOrgAdmins of this org.

#### PATCH /api/queueOrganization/:queueOrganizationUniqueId/approve — Approve/Reject/Suspend

- **Auth:** admin, superAdmin ONLY
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `approvalStatus` | string enum | **YES** | `approved`, `rejected`, `suspended` |
| `approvalReason` | string (max 500) | no | Admin note |
| `queueEnabled` | boolean | no | Defaults to true when approved, false otherwise |

- **Socket:** Emits `queue_org_approved` to all QueueOrgAdmins of this org.
- **Response (200):**

```json
{
  "message": "success",
  "data": {
    "queueOrganizationUniqueId": "uuid",
    "approvalStatus": "approved"
  }
}
```

#### DELETE /api/queueOrganization/:queueOrganizationUniqueId — Soft-Delete Organization

- **Auth:** admin, superAdmin ONLY
- **Socket:** Emits `queue_org_deleted` to all QueueOrgAdmins.
- **Response (200):**

```json
{
  "message": "success",
  "data": { "queueOrganizationUniqueId": "uuid" }
}
```

### 5.2 Member Management

#### POST /api/queueOrganization/:queueOrganizationUniqueId/members/:userUniqueId — Add Member

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `roleId` | integer | **YES** | 11 (QueueOrgAdmin) or 1 (shipper) |
| `isActive` | boolean | no | Default: true |

- **Socket:** Emits `queue_member_added` to all QueueOrgAdmins.
- **Response (201):**

```json
{
  "message": "success",
  "data": {
    "queueOrganizationUniqueId": "uuid",
    "userUniqueId": "uuid",
    "roleId": 11
  }
}
```

- **Errors:** 409 if user is already a member.

#### GET /api/queueOrganization/:queueOrganizationUniqueId/members — List Members

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Response (200):**

```json
{
  "message": "Query results fetched",
  "data": [
    {
      "queueOrganizationMembershipUniqueId": "uuid",
      "userUniqueId": "uuid",
      "roleId": 11,
      "isActive": 1,
      "membershipStartDate": "2026-09-01T...",
      "fullName": "Ahmed",
      "phoneNumber": "+251987654321"
    }
  ]
}
```

### 5.3 Queue Operations

#### GET /api/queue/status — Get Live Queue Board

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Query params:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueOrganizationUniqueId` | UUID | **YES** | |
| `queueDate` | string (YYYY-MM-DD) | no | Default: today |

- **Response (200):**

```json
{
  "message": "Query results fetched",
  "data": {
    "queueOrganization": { "...all org fields" },
    "queueDate": "2026-09-03",
    "totalWaiting": 12,
    "queues": {
      "Truck": [
        {
          "queue": {
            "queueUniqueId": "uuid",
            "queueNumber": 1,
            "status": "waiting",
            "joinedAt": "...",
            "requestedAt": null,
            "agreedAt": null,
            "vehicleDriverUniqueId": "uuid",
            "shipperRequestUniqueId": null,
            "targetedShipperUserUUID": null,
            "driverLatitude": 9.03,
            "driverLongitude": 38.74
          },
          "shipperRequest": { "...order details or {}" },
          "driverRequests": { "...driver info + vehicle + profile photo" },
          "decisions": { "...journey decision or {}" },
          "journey": { "...journey info or {}" },
          "proofOfDelivery": null
        }
      ],
      "Trailer": [ "..." ]
    }
  }
}
```

- **Key:** `queues` is keyed by vehicle type name. Each entry includes full order, driver, and journey data.

#### POST /api/queue/manualCheckin — Manual Driver Check-In

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueOrganizationUniqueId` | UUID | **YES** | |
| `vehicleDriverUniqueId` | UUID | XOR | Exactly one of these two required |
| `driverPhoneNumber` | string | XOR | Resolves phone to active vehicle assignment |
| `shipperPhoneNumber` | string | no | Reserves position for this shipper |

- **Behavior:**
  - Verifies org is approved + enabled (403 if not).
  - Active journey fence: 409 if driver has an active journey.
  - One-queue-per-day fence: 409 if driver is already in another org's queue today.
  - Idempotent: returns existing entry if already in this org's queue today.
  - Revives removed entries (preserves original queue number).
  - Auto-dispatches pending orders to the front driver.
  - Skips proximity validation (unlike driver self-checkin).
- **Socket:** Emits `queue_position_changed` to the queue room.
- **Audit:** Writes QueueAuditLog (action: `manual_checkin`).
- **Response (201):**

```json
{
  "message": "success",
  "data": {
    "queueUniqueId": "uuid",
    "queueNumber": 7,
    "status": "waiting"
  }
}
```

#### POST /api/queue/dispatch — Manual Dispatch

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueOrganizationUniqueId` | UUID | **YES** | |
| `vehicleTypeUniqueId` | UUID | optional | FIFO mode: front driver of this type |
| `queueUniqueId` | UUID | optional | Targeted mode: specific queue entry |
| `driverPhoneNumber` | string | optional | Targeted mode: specific driver by phone |
| `shipperRequestUniqueId` | UUID | optional | Specific order (oldest pending if omitted) |

**Dispatch modes (exactly one required):**

| Mode | Params | Behavior |
|---|---|---|
| FIFO | `vehicleTypeUniqueId` only | Offers to front waiting/notagreed driver of that type |
| By queue entry | `queueUniqueId` only | Offers to the specific entry |
| By driver phone | `driverPhoneNumber` only | Resolves phone to vehicle-driver, then offers |

- `queueUniqueId` and `driverPhoneNumber` are mutually exclusive (400 if both given).
- **Side effects:** Creates JourneyDecision, notifies driver (socket + FCM + SMS), notifies shipper (socket), emits queue snapshot.
- **Response (200):**

```json
{
  "message": "success",
  "offered": true,
  "data": {
    "queueUniqueId": "uuid",
    "queueNumber": 1,
    "driverUserUniqueId": "uuid",
    "journeyDecisionUniqueId": "uuid",
    "status": "requested"
  }
}
```

- **Errors:** 404 if targeted driver/entry not found or not dispatchable.

#### PATCH /api/queue/entry/:queueUniqueId/override — Override Queue Position

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `queueNumber` | integer (min 1) | **YES** | New 1-based position |
| `reason` | string (max 500) | no | Explanation for the override |

- **Behavior:** Moves the entry to the specified position. Does NOT renumber other entries.
- **Audit:** Writes DriverQueueHistory (queueNumber change) + QueueAuditLog (action: `override`).
- **Socket:** Emits `queue_position_changed` to the queue room + notifies QueueOrgAdmins.
- **Response (200):**

```json
{
  "message": "success",
  "data": { "queueUniqueId": "uuid", "queueNumber": 3 }
}
```

#### DELETE /api/queue/entry/:queueUniqueId — Remove Entry

- **Auth:** admin, superAdmin, queueOrgAdmin
- **Behavior:** Sets status to `removed`. If the entry held an order, releases it.
- **Audit:** Writes DriverQueueHistory (status change) + QueueAuditLog (action: `remove`).
- **Socket:** Emits `queue_position_changed` + `queue_removed` to QueueOrgAdmins.
- **Response (200):**

```json
{
  "message": "success",
  "data": { "queueUniqueId": "uuid", "status": "removed" }
}
```

#### GET /api/queue/entry/:queueUniqueId/history — Entry History

- **Auth:** any authenticated user (drivers see own entry only; admins see all)
- **Response (200):**

```json
{
  "message": "success",
  "data": [
    {
      "historyUniqueId": "uuid",
      "columnName": "status",
      "oldValue": "waiting",
      "performedBy": "uuid",
      "performedAt": "2026-09-03T10:30:00.000Z"
    }
  ]
}
```

### 5.4 Driver Endpoints (for reference)

These are primarily used by the driver app but the admin frontend may need them for the checkin modal driver search.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/queue/driver/checkin` | driver | Self check-in (with proximity validation) |
| GET | `/api/queue/driver/myPosition` | driver | Current position + waiting ahead + shipper info |
| DELETE | `/api/queue/driver/checkout` | driver | Self checkout |

---

## 6. Socket Events

### Connection

- **URL:** `https://queue.dynamicsroute.tech` (WebSocket)
- **Auth:** Send JWT token + user info in the connection handshake.
- **User type:** roleId 3 or 6 = `"admin"`, otherwise = `"queueOrgAdmin"`.

### Subscribe to Queue

After connecting, subscribe to a specific queue to receive live updates:

```
socket.emit("queue:subscribe", { queueOrganizationUniqueId, queueDate })
```

Reference-counted: calling subscribe multiple times increments a counter. Unsubscribe decrements. Auto re-subscribes on reconnect.

### Event Name

All queue events use the event name `"queue"`.

### Message Types

The `messageTypes` field in each payload tells the frontend what happened:

| Message Type | When | Data | Frontend Action |
|---|---|---|---|
| `queue_position_changed` | Checkin, re-checkin, override, removal, manual checkin | Full queue snapshot (entries array) | Refresh queue board |
| `queue_order_offered` | Dispatch/auto-dispatch matches order to driver | Full offer payload | Show offer in queue |
| `queue_order_rejected` | Driver rejects or times out on offer | `{ message, queue }` | Update entry status |
| `queue_refusal_moved_to_back` | Driver hits consecutive-refusal limit | `{ queueUniqueId, driverUserUniqueId, refusalCount, refusalLimit }` | Show moved-to-back notification |
| `queue_order_assigned` | Driver accepts offer | Driver info, vehicle info, queue org+date | Update entry to agreed |
| `queue_order_cancelled` | Order cancelled at job level | `{ queueUniqueId, driverUserUniqueId }` | Release entry |
| `queue_position_reserved` | Driver checks in with shipper phone | `{ targetedShipperUserUUID, driverFullName, driverPhoneNumber, queueOrganizationUniqueId, queueNumber }` | Show shipper reservation |
| `queue_removed` | Checkout or admin removal | `{ queueOrganizationUniqueId }` | Remove entry from board |
| `queue_org_approved` | Admin approves/rejects/suspends org | `{ queueOrganizationUniqueId, approvalStatus, queueEnabled }` | Update org status badge |
| `queue_org_updated` | Org profile updated | `{ queueOrganizationUniqueId }` | Refresh org data |
| `queue_org_deleted` | Org soft-deleted | `{ queueOrganizationUniqueId }` | Remove org from list |
| `queue_member_added` | New member added to org | `{ queueOrganizationUniqueId, userUniqueId, roleId }` | Refresh member list |

### Payload Structure

Every socket payload has this shape:

```json
{
  "message": "success",
  "messageTypes": {
    "message": "Queue organization approved",
    "details": "Admin approved/rejected a QueueOrganization; queueEnabled toggled."
  },
  "data": { "...depends on messageTypes" }
}
```

---

## 7. Frontend Configuration

### Environment Variables (.env)

```
VITE_API_BASE_URL=https://queue.dynamicsroute.tech
VITE_WEBSOCKET_URL=https://queue.dynamicsroute.tech
```

**Important:** The queue backend is deployed at `queue.dynamicsroute.tech`, NOT `dynamicsroute.tech`. The main domain does not proxy queue API routes.

### API Base URL Resolution

- Axios and RTK Query append `/api` to `VITE_API_BASE_URL`.
- So `GET /queue/status` becomes `https://queue.dynamicsroute.tech/api/queue/status`.
- WebSocket connects directly to `VITE_WEBSOCKET_URL`.

### Socket Connection Flow

1. User logs in -> `AuthContext` calls `connectSocket()`.
2. Socket connects with JWT auth payload.
3. `QueueBoard` component calls `subscribeToQueue(orgId, date)`.
4. On any `"queue"` event, RTK Query cache is invalidated (debounced 400ms, throttled 1200ms).
5. Components re-fetch automatically via RTK Query hooks.

---

## 8. Pending Approvals Workflow

### Finding Pending Orgs

```
GET /api/queueOrganization?approvalStatus=pending
```

Read `pagination.total` for the badge count.

### Approving

```
PATCH /api/queueOrganization/:queueOrganizationUniqueId/approve
Body: { "approvalStatus": "approved" }
```

This sets `queueEnabled = true` by default, enabling the queue immediately.

### Rejecting

```
PATCH /api/queueOrganization/:queueOrganizationUniqueId/approve
Body: { "approvalStatus": "rejected", "approvalReason": "Reason here" }
```

### Suspending (temporary disable)

```
PATCH /api/queueOrganization/:queueOrganizationUniqueId/approve
Body: { "approvalStatus": "suspended" }
```

This sets `queueEnabled = false`. The org can be re-approved later.

### Real-time Updates

All approval state changes emit `queue_org_approved` to the org's QueueOrgAdmins via socket. The admin frontend listening on the queue room will see the status badge update in real-time.
