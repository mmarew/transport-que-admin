# queadmin-frontend — Gap Analysis

> **Scope:** loading-place (queue organization) management console vs. the `transportBackEndNative` backend it consumes.
> **Status:** **all 14 findings addressed.** See "Resolution" below for per-finding detail and verification. Social bonding remains **deferred to a later phase**.
> **Method:** static read of both repos cross-checked against schema, routes, services, and the E2E suite.

### Verification performed

| Check | Command | Result |
|-------|---------|--------|
| Frontend typecheck | `npx tsc -b` | pass |
| Frontend build | `npm run build` | pass |
| Frontend tests | `npm test` | 98/98 pass (7 files) |
| Frontend lint | `npx eslint .` | 185 → 170 errors; **0 new**, 15 pre-existing removed |
| Backend lint | `npx eslint .` | 55 → 55 errors; **0 new** (unchanged pre-existing baseline) |
| Backend syntax | `node --check` on every changed file | pass |
| Auth schema contract | `Validations/User.schema.js` assertions | 7/7 pass (optional role accepted, unknown role rejected) |
| C3 migration guard | simulated live ENUM states | 5/5 pass |

Pre-existing lint debt in both repos is **not** from this work: frontend baseline
was 185 errors at `HEAD` (mostly `no-explicit-any`), backend baseline 55. Both
repos fail `npm run lint` before and after these changes.

---

## What the console is for

A **loading place** — port, customs post, cement plant, factory, farm, mine, depot — registers as a `QueueOrganization`. Drivers check in when they physically arrive; the system issues them a `queueNumber`. Freight is offered down the line.

The operational promise: **nobody argues about who was first.** Arrival is GPS-proven, server-stamped, and snapshotted into an immutable audit trail.

Three jobs are in scope today:

1. **Loading-place management** — register and operate the place.
2. **FIFO queue** — order drivers fairly, with an audit trail.
3. **Bid on behalf of shippers** — let the place run a price auction for a ship's freight.

Job 4 (social/trust layer) is out of scope for now.

---

## Summary

| # | Gap | Severity | Area | Status |
|---|---|---|---|---|
| A1 | Queue Dispatchers (role 12) cannot log in | **Blocker** | Frontend | **Resolved** |
| A2 | `addQueueOrgMember` points at a route that does not exist | **High** (latent) | Frontend | **Resolved** |
| A3 | DDL comment contradicts live validation on membership roles | Medium | Backend (doc) | **Resolved** |
| B1 | Member management is read-only | Medium | Frontend | **Resolved** |
| B2 | Entry history is wired but never displayed | Medium | Frontend | **Resolved** |
| C1 | Bidding board is never called; acceptance is guessed | **High** | Frontend | **Resolved** |
| C2 | Role 12 cannot approve bidding (role 11 can) | Medium | Backend | **Resolved** |
| C3 | `mine` / `farm` missing from org-type enum | Medium | Backend | **Resolved** |
| C4 | Check-in searches the queue, not drivers — no endpoint exists | Low | Backend gap | **Resolved** |
| D1 | 13 dead endpoint constants (12 unused + 1 typo); some named routes that do not exist | Medium | Frontend | **Resolved** |
| D2 | README and frontend spec are wrong on 4 technical facts | Medium | Frontend (doc) | **Resolved** |
| D3 | Settings reports success for operations that persist nothing | Medium | Frontend | **Resolved** |
| E1 | Permission denial returns 401 → console logs the user out | **High** | Backend | **Resolved** |
| E2 | Session lifetime is role-dependent and undocumented | Low (doc) | Frontend (doc) | **Resolved** |

---

## A. Console is unusable by half its intended staff

### A1 — Queue Dispatchers (role 12) cannot log in · **Blocker**

**Problem.** `RoleGuard` allows roles `{11, 3, 6}`. A user whose role is 12 authenticates successfully, is redirected to `/login` by the guard, and can never reach any page.

**Files**

| File | Line | Issue |
|------|------|-------|
| `src/components/auth/RoleGuard.tsx` | 10 | `const ALLOWED_ROLES = new Set([QUEUE_ORG_ADMIN_ROLE, 3, 6]);` — no 12 |
| `src/types/queue.ts` | 27 | Only `QUEUE_ORG_ADMIN_ROLE = 11` is defined; no dispatcher constant exists |
| `src/lib/socket.ts` | 78 | `roleId === 3 \|\| roleId === 6 ? "admin" : "queueOrgAdmin"` — every non-admin becomes `queueOrgAdmin` |

**Why it looks accidental.** The backend was built for dispatchers:

- `Middleware/VerifyToken.js` — `verifyIfUserIsQueueOrgAdmin` covers roles 11 **and** 12
- `Validations/QueueOrganization.schema.js:74` — `addMember` accepts 11 **or** 12
- `QueueDispatcher_Role12_plan.md` (backend) — a full implementation plan; §93–100 assigns dispatchers day-to-day queue operation
- Backend doc comments reference "role-12 dispatchers" throughout `Routes/queue/`

**Socket consequence.** Even if the guard allowed 12, the socket would still announce `userType: "queueOrgAdmin"`. `Utils/WSPusher.js` validates against `Utils/SocketUserTypes.js`, so the dispatcher would connect under the wrong identity and receive the wrong event fan-out.

**Fix**

1. Add `QUEUE_DISPATCHER_ROLE = 12` to `src/types/queue.ts`
2. `RoleGuard` → `new Set([QUEUE_ORG_ADMIN_ROLE, QUEUE_DISPATCHER_ROLE, 3, 6])`
3. `src/lib/socket.ts:78` → map 11 → `"queueOrgAdmin"`, 12 → `"queueDispatcher"`, 3/6 → `"admin"`
4. **Confirm first** whether `Utils/SocketUserTypes.js` accepts `"queueDispatcher"`. If not, the backend needs it added — this is not a frontend-only fix.

**Also verify:** auth requests hardcode `roleId: 11` in all three of login, OTP verify, and register. Dispatchers provisioned by an org admin will fail OTP verification if the role is asserted client-side.

---

### A2 — `addQueueOrgMember` targets a route that does not exist · **High (latent)**

**Problem.** The frontend substitutes `userUniqueId` into the URL path. The backend expects it in the request body.

| Side | Path |
|------|------|
| Frontend (`src/utils/constant.ts:15`) | `POST /queueOrganization/:id/members/:userUniqueId` |
| Backend (`Routes/queue/QueueOrganization.routes.js:111`) | `POST /api/queueOrganization/:queueOrganizationUniqueId/members` |

The backend route has no trailing parameter. `userUniqueId` is a required **body** field per `Validations/QueueOrganization.schema.js:74`.

The frontend's own code confirms it is body-shaped — `src/lib/redux/api/queueOrganizationEndpoints.ts:80` destructures it *out* of the body args:

```ts
query: ({ id, userUniqueId, ...body }) => ({
  url: appAPIs.addQueueOrgMemberAPI.replace(":id", id).replace(":userUniqueId", userUniqueId),
  method: "POST",
  body,           // ← userUniqueId is NOT in here
}),
```

**Why it is latent.** `useAddQueueOrgMemberMutation` has **no UI consumer** — the members table is read-only (B1). The bug fires the moment member-add is built, which is why it should be fixed *first*.

**Fix.** `src/utils/constant.ts:15` → `"/queueOrganization/:id/members"`, and stop stripping `userUniqueId` out of `body` at `queueOrganizationEndpoints.ts:80`.

---

### A3 — DDL comment contradicts live validation · Medium · Backend (documentation)

`Database/Database.js:2208–2217`:

```sql
-- QueueOrganizationMembership: Links users (QueueOrgAdmin role 11, shipper role 1)
--   to a QueueOrganization ...
--   roleId INT NOT NULL,   -- FK → Roles (11 = queueOrgAdmin, 1 = shipper)
```

Reality, from `Validations/QueueOrganization.schema.js:74`:

```js
roleId: Joi.number().integer()
  .valid(usersRoles.queueOrgAdminRoleId, usersRoles.queueDispatcherRoleId).required()
```

**11 or 12 — not shipper.** The comment predates role 12. The same wrong claim is repeated in route docblocks at `Routes/queue/QueueOrganization.routes.js:108, 135, 147, 160`.

This table is the authorization source of truth (see B1's backend section), so a comment that names the wrong roles is more costly than usual. Anyone reading the DDL first would build member management for the wrong actors.

**Fix.** Correct the SQL comments and the four route docblocks.

---

## B. Backend features with no interface

### B1 — Member management is read-only · Medium

**Problem.** `MembersTable.tsx` renders name / phone / role / status and nothing else. No add, no deactivate, no reactivate, no remove.

Its role labels are also wrong — `src/components/queue-org-manage/MembersTable.tsx:18`:

```ts
const roleLabels: Record<number, string> = {
  11: t("queueManage.roleQueueOrgAdmin"),
  1:  t("queueManage.roleShipper"),   // ← no dispatcher (12) label
};
```

A role-12 member renders as the raw number `12` because of the `?? member.roleId` fallback.

**Backend is fully built.** `Routes/queue/QueueOrganization.routes.js` exposes all four operations:

| Method | Path | Operation |
|--------|------|-----------|
| `POST` | `/:org/members` | add |
| `GET` | `/:org/members` | list ✅ *already used* |
| `PATCH` | `/:org/members/:membershipId/reactivate` | reactivate |
| `PATCH` | `/:org/members/:membershipId/deactivate` | deactivate |
| `DELETE` | `/:org/members/:membershipId` | soft-delete |

**Critical backend detail — membership IS the permission.** `Middleware/VerifyToken.js` → `verifyIfUserIsQueueOrgAdmin` requires an **active** `QueueOrganizationMembership` row (`roleId IN (11,12) AND isActive=1 AND membershipDeletedAt IS NULL`) for roles 11 and 12.

> Deactivating a member immediately revokes their queue power. The same call that returned 200 a moment ago now returns 403.

That makes member management a **security control surface**, not a directory convenience — which is the argument for building it sooner rather than later.

**Fix.** Add lifecycle actions to `MembersTable`, plus a dispatcher role label, and correct A2 first (add cannot work until then).

---

### B2 — Entry history is wired but never displayed · Medium

**Problem.** The backend returns a full before-state snapshot for every queue mutation, and the frontend has the query fully declared, tagged, and typed — with **zero consumers**.

| Layer | Location | State |
|-------|----------|-------|
| Backend | `GET /api/queue/entry/:queueUniqueId/history` | ✅ works |
| Frontend constant | `src/utils/constant.ts:31` | ✅ present |
| Frontend endpoint | `src/lib/redux/api/driverQueueEndpoints.ts:251` | ✅ query + tag `DriverQueue(id-history)` |
| Frontend hook | `useGetEntryHistoryQuery` | exported, **never called** |
| UI | — | **nothing** |

**What is being left on the table.** `DriverQueueHistory` is a literal mirror of every `DriverQueue` column, captured *before* each mutation, tagged with the `historyEvent` and `performedBy`. `QueueAuditLog` additionally records supervisor overrides and removals with JSON before/after snapshots and a free-text reason.

This is the system's **dispute-resolution artifact**. When a driver disputes their position, this endpoint is the evidence. It is fully available and entirely invisible.

**Fix.** Add a history drawer or panel to the queue board, opened from an existing entry row.

---

## C. Bid-on-behalf-of-shipper does not work

### C1 — Bidding board is never called; acceptance is guessed · **High**

**Problem.** The console has a bids modal but does not use the bidding endpoints. Instead it reconstructs the match client-side.

**Endpoints that exist and are never called:**

| Backend | Frontend references |
|---------|---------------------|
| `POST /api/queue/bidding/approve` | **zero** |
| `GET /api/queue/bidding/order/:shipperRequestUniqueId/bids` | **zero** |

**Instead**, `useAcceptDriverRequestMutation` (`src/lib/redux/api/driverQueueEndpoints.ts:66–232`, ~170 lines) does this:

1. Validate that `shipperRequestUniqueId` / `driverRequestUniqueId` / `journeyDecisionUniqueId` are UUIDs
2. If driver or decision IDs are missing, issue a **second request** — `GET /user/getShipperRequest4allOrSingleUser?target=all&limit=100` — to resolve them by fuzzy-matching on `driverRequestId`, `userUniqueId`, or `phoneNumber`
3. Fall back to: *"if there is exactly one driverRequest, take it"*
4. Call the real endpoint, `PUT /shipper/acceptDriverOffer`
5. If that cannot be assembled, fall back again to `POST /queue/dispatch`

**Why this is a problem, not a stylistic issue**

- **Correctness.** "Exactly one driverRequest ⇒ it is the right driver" is unsound. A race with a second bidder resolves to the wrong driver, silently.
- **Cost.** Accepting a bid can pull 100 shipper requests.
- **Fragility.** The guessing exists because the real bidding flow is unwired. A schema change upstream breaks it invisibly.
- **Audit gap.** Bids placed through `DriverBid` are not surfaced, so `bidStatus` transitions (`selected` / `not_selected` / `withdrawn` / `expired`) are invisible to staff.
- **Debug noise.** `console.log` / `console.error` in the hot path at lines 152, 168, 177, 224.

**What the backend actually does** (`Services/DriverBid.service.js:31`):

- Resolves each order via `LEFT JOIN ShipperRequestBatch`
- Rejects unless **every** id resolves to a live queue order
- Ownership fence → shipper owner **or** SuperAdmin **or** active QueueOrgAdmin of the order's org
- Sets `ShipperRequest.isBiddingApproved` per order
- On approval, distance-matches only orders still at `journeyStatusId = 1`

The gate is deliberately **per-order**, not per-batch, so one batch can run FIFO and auction simultaneously (`Database/Database.js:544`).

**Fix.** Replace the guessing with the real endpoints. Requires a UI for opening/closing the board and a list driven by `getBidsForOrder`.

---

### C2 — Role 12 cannot approve bidding (role 11 can) · Medium · Backend

**Correction to an earlier reading of mine.** I first read the route docblock, which says access is *"the shipper who owns the orders (or SuperAdmin)"*, and concluded queue org admins were excluded. **That docblock is stale.** The service is more permissive than the comment.

`Services/DriverBid.service.js:74–111` — actual behavior:

```js
const isSuperAdmin    = user?.roleId === usersRoles.supperAdminRoleId;
const ownsAll         = orders.every((o) => o.shipperUserUniqueId === user.userUniqueId);
const isQueueOrgAdmin = user?.roleId === usersRoles.queueOrgAdminRoleId;   // ← 11 only

if (!isSuperAdmin && !ownsAll && !isQueueOrgAdmin) throw FORBIDDEN;
```

Queue org admins (11) **are** allowed, and must hold an active membership in the target org. So:

- ✅ role 11 — can approve bidding on a shipper's behalf
- ❌ role 12 — **cannot**; a dispatcher hits `FORBIDDEN`

**Is that right?** Arguably yes — `QueueDispatcher_Role12_plan.md` reserves member and org management for role 11, and opening a price board on a shipper's behalf is a commercial decision, not a dispatch-floor action. But the console's `RoleGuard` blocks 12 entirely (A1), so today *nobody* in the console can use this feature.

**Decision needed:** is 12 intentionally excluded, or an oversight? If intentional, the route docblock must be corrected to state 11 — and C1's UI must be role-aware.

**Fix.** Update the stale docblock at `Routes/queue/DriverQueue.routes.js` to match `Services/DriverBid.service.js:74`.

---

### C3 — `mine` and `farm` missing from org-type enum · Medium · Backend

The console is described as managing **ports, farms, factories, and mining/cement places**. The enum supports none of mining or farming:

`Database/Database.js:2166`
```sql
queueOrganizationType ENUM('customs','factory','cement','depot','other') NOT NULL
```

Also duplicated in `Validations/QueueOrganization.schema.js:61`.

Mining places and farms would fall into `other`, so **nothing type-specific can ever attach to them** — no capacity rules, no seasonality, no cargo assumptions. For a platform whose premise is loading-place specificity, `other` is a dead end.

**Note on what the schema reveals.** The `QueueOrganization` comment (line 2158) names real sites — *"Mojo Kaliy customs, Diredawa customs, National Cement."* The enum was derived from actual places, which is why the coverage gap matters.

**Fix.** Add `mine`, `farm`, and consider `port` (the stated use case, currently also `other`). Requires a migration — changing an ENUM needs care on existing rows.

**Also see** the coordinate overloading note at the end of this document.

---

### C4 — No driver directory endpoint · Low · Backend gap

**Problem.** Manual check-in must pick a driver, but there is no way to search drivers.

`src/lib/redux/api/driverQueueEndpoints.ts` — `listVehicleDrivers` is an **honest stub**:

```ts
// No working driver-list endpoint exists on the backend.
// CheckinModal derives driver data from queueStatus directly.
queryFn: async () => []
```

So `CheckinModal` searches the *current queue payload* instead of a driver directory. A driver who has never checked in at this place cannot be manually added by staff.

**Effect.** The documented workaround is a real limitation, not a style choice. It also means `constant.ts` carries four aspirational driver endpoints that do not exist (`getOrgDriversAPI`, `listDriversPaginatedAPI`, `listDriverVehiclesAPI`, `getDriverVehiclesAPI`).

**Fix.** Needs a search endpoint: `GET /api/driver?phone=…&name=…&queueOrganizationUniqueId=…`, restricted to queue org staff. Note the existing `CheckinModal` path must keep working as a fallback.

---

## D. Hygiene

### D1 — 12 of 36 endpoint constants are dead; 5 point at routes that do not exist · Medium

`src/utils/constant.ts` presents itself as *"single source of truth for API"*. Verified against `Routes/`: **12 keys have exactly one reference — their own definition.**

| Constant | Path | Backend reality |
|----------|------|-----------------|
| `manualCheckoutAPI` | `/queue/manualCheckout` | ❌ actual: `/queue/driver/checkout` |
| `listQueueOrgRoutesAPI` | `/queueOrganization/:id/routes` | ❌ no such route |
| `getQueueStatsAPI` | `/queue/statistics` | ❌ no such route |
| `getOrgDriversAPI` | `/driver/listDriversByOrg` | ❌ no such route |
| `getUserProfileAPI` | `/user/getProfile` | ❌ no such route |
| `listVehicleDriversAPI` | `/vehicleDriver/list` | ❌ no such route |
| `listDriverVehiclesAPI` | `/vehicleDriver/org/:queueOrganizationUniqueId` | ❌ no such route |
| `listDriversPaginatedAPI` | `/driver/listPaginated` | ❌ no such route |
| `listDriversForCheckinAPI` | `/queue/driver/checkin` | ⚠️ exists, wrong intent (driver self-checkin) |
| `getDriverVehiclesAPI` | `/driver/:driverUniqueId/vehicles` | ❌ no such route |
| `addVehicleToDriverAPI` | `/vehicleDriver` | ❌ no such route |
| `deleteVehicleDriverAPI` | `/vehicleDriver/:id` | ❌ no such route |

**Why this is more than tidiness.** The file claims to be authoritative, so the next developer reaches for `/queue/statistics` and gets a 404 — with no indication the constant was never valid. This is the same failure mode as A2.

**Fix.** Delete the 12. Keep `manualCheckoutAPI` only if the checkout UI is built, and correct the path when it is.

**Related, same file family.** `listVehicleTypes` swallows all errors and falls back to a hardcoded `DEFAULT_VEHICLE_TYPES` (`src/utils/vehicleType.ts`). A broken vehicle-type endpoint is therefore invisible to both users and monitoring. Prefer surfacing the error.

---

### D2 — README and frontend spec are wrong on four technical facts · Medium

`README.md` and `docs/queadmin-frontend.md` both describe a stack the project does not use:

| Claim | Reality |
|-------|---------|
| Tailwind CSS v4 (`@tailwindcss/vite`) | **No Tailwind.** Hand-written CSS, ~30 co-located files + `src/index.css` design tokens |
| TanStack Query for server state | **RTK Query.** `@tanstack/react-query` is installed and **never imported** |
| `Authorization: Bearer <token>` | **httpOnly cookie session**, `credentials: "include"`. The client never stores a JWT |
| `VITE_API_URL` / `VITE_SOCKET_URL` | `VITE_API_BASE_URL` / `VITE_WEBSOCKET_URL` (`src/utils/baseUrl.ts`, `src/lib/socket.ts:126`) |

`docs/queadmin-frontend.md:147` — *"All endpoints require `Authorization: Bearer <token>`"* — is the most damaging, because it describes an auth scheme the system deliberately moved away from.

**For contrast, the docs that are right:** `docs/queadmin-operations.md` is an accurate role-11 operating manual, and `docs/refactor-plan.md` is a sound, evidently in-flight refactor artifact with real acceptance criteria.

**Also:** both docs cite `docs/queue-dispatch-design.md` and `docs/queue-tables-access.md`, which **do not exist in this repo** — they were moved to the backend (`docs/queue-tables-access.md:298`).

**Fix.** Rewrite the stack section of both against the real implementation.

---

### D3 — Settings reports success for operations that persist nothing · Medium

`SettingsPage` is fully designed and entirely non-functional.

| Control | Actual behavior |
|---------|-----------------|
| Save profile | `toast.success(...)`. No API call, no Redux update. |
| Push / email / 2FA toggles | `localStorage.setItem("app_push_notification", …)` + toast |
| Delete account | `toast.error("Account deletion requires primary system administrator authorization.")` — explicitly not implemented |

**The toggles are worse than absent** — they appear functional and mislead users into thinking notifications are configured. The delete-account message at least discloses itself.

**Fix.** Disable the non-functional controls with an explanatory label, or wire them. Do not leave a success toast on a no-op.

---

## E. Authentication and session

### E1 — A permission denial returns 401, which the console treats as session expiry · **High** · Backend

`VerifyToken.js:121-133` — `verifyIfUserIsSupperAdmin` guards super-admin-only routes and answers a *permission* failure with `AppError.UNAUTHORIZED` (401):

```js
if (roleId !== usersRoles.supperAdminRoleId) {
  return next(new AppError("You are not allowed to do this action", AppError.UNAUTHORIZED));
}
```

The console cannot tell that apart from a real expiry. `src/lib/redux/api/base.ts:61-67` dispatches `logout()` on **any** 401 from **any** endpoint:

```ts
if (result.error && result.error.status === 401) {
  apiCtx.dispatch(logout());
}
```

and `AuthContext.tsx:38-44` makes that destructive — it also POSTs `/user/logout`, which clears the httpOnly cookie server-side (`Controllers/Auth/auth.controller.js:462`).

**Impact.** A queue org admin (11) or dispatcher (12) who touches any super-admin-only action is not shown "you do not have permission." They are silently returned to the login screen, mid-task, with their session destroyed. The user-visible symptom is "the console logs me out randomly," which is indistinguishable from a session bug and will be misdiagnosed as one. This is the same class of failure as C2 (role 12 cannot approve bidding): a role-policy answer delivered as an auth failure.

The backend already uses 403 correctly elsewhere — `CsrfOriginCheck.js:37,43` and `AuthorizeDocumentAccess.js` return `FORBIDDEN`. Only this guard is wrong.

**Fix.** Return `AppError.FORBIDDEN` (403) from the guard. One word. 401 should mean *who are you, and that answer expired*; 403 means *we know who you are, and the answer is no.*

### E2 — Session lifetime is role-dependent, and the console never says so · Low (documentation)

Session length is set by role in `Utils/SessionPolicy.js:9-20`, driven by `SESSION_TTL_ADMINS` / `SESSION_TTL_OTHERS`:

| Role | ID | TTL |
|------|----|-----|
| `adminRoleId` | 3 | **24h** |
| `supperAdminRoleId` | 6 | **24h** |
| `queueOrgAdminRoleId` | 11 | 365d |
| `queueDispatcherRoleId` | 12 | 365d |
| all others | 1,2,4,5,7,8,9,10 | 365d |

Cookie and JWT cannot drift apart: `CreateJWT.js:20` nests the payload as `{ data: { userUniqueId, phoneNumber, roleId } }` and both `expiresIn` (`CreateJWT.js:23`) and `maxAge` (`Utils/AuthCookie.js:38,42`) read that same `roleId`.

**So the two console roles are not affected** — 11 and 12 both get 365 days, and `SESSION_TTL_OTHERS=365d` is doing what you expect.

**The trap is for whoever tests with a super-admin account.** Signing in as role 3 or 6 gives a 24-hour session by design, which reads as "the console forgets my login" and generates exactly this kind of investigation. Nothing in the console or `docs/` records the mapping.

**Fix.** Document the role→TTL table in the console README. Do not raise `SESSION_TTL_ADMINS`: a long-lived unrevocable super-admin token is the one place the session policy is genuinely tight, and E1 is the real defect.

Related, and worth pairing with E1: logout clears the cookie client-side only. There is no `tokenVersion`, blacklist, or per-request token store, so an already-issued 365-day token stays valid after a **role change** until it expires. Deactivation *is* enforced per request (`VerifyToken.js:263`, `AND isActive = 1`), so the residual gap is role scope only.

---


---

## Resolution — what was changed, per finding

### A1 — Queue Dispatchers cannot log in · Resolved

The blocker was three separate defects, not one:

1. **Frontend asserted the wrong role.** `auth.service.ts` sent `roleId: 11` on
   login, so every dispatcher was told "user not found in this role". Login and
   OTP now send **no** role; the backend resolves the account's own role from
   `UserRole`. Registration is the exception — it *creates* a role-11 admin, so
   it still sends an explicit role.
2. **`otp.service.js` crashed on the omitted role.** `roleId` was destructured
   `const` and then reassigned during resolution, throwing
   `Assignment to constant variable` on every role-less OTP login. Now `let`.
   ESLint (`no-const-assign`) had been flagging this the whole time.
3. **The login schema still required `roleId`.** `Validations/User.schema.js`
   `loginUser` had `.required()`, so the console's role-less request was
   rejected with 400 *before* reaching the service. Now optional, still
   validated against the known role list when supplied.

Verified: 7/7 schema assertions — role-less login/OTP accepted, roles 11 and 12
accepted, unknown role 99 rejected, `createUser` still requires a role.

### A2 / A3 — Member route and role documentation · Resolved

`addQueueOrgMember` now posts to `POST /queueOrganization/:id/members` with
`userUniqueId` and `roleId` in the body. All queue-membership docs corrected
from role-1 shipper to role-12 dispatcher, including one `docs/queadmin-frontend.md`
line that still claimed a shipper could be a queue member — the backend accepts
only 11 and 12.

### B1 / B2 — Unsurfaced backend features · Resolved

B1: add / deactivate / reactivate / remove members wired through RTK Query and
`MembersTable`, gated to role 11 to match `assertCanAdministerMembers`.
B2: `EntryHistoryModal` added and wired through the board, tables, and cards.
Both already had backend routes; no backend change was needed — B2 was already
covered by router-level `verifyTokenOfAxios`.

### C1 / C2 — Bidding · Resolved

The guessed acceptance is gone. The modal now calls
`GET /api/queue/bidding/order/:id/bids`, renders those rows, and accepts by
explicit ids only — a bid that cannot be identified fails loudly instead of
falling back to "if there is one decision, it must be this driver's". Backend
`getBidsForOrder` gained an ownership fence.

**Safety note:** when the board cannot be loaded the modal still shows cached
rows, but Accept is **disabled** with an explanation. Those rows can carry a
driver request id without its matching journey decision; since the backend
requires that decision id, accepting from them either 400s or matches a
decision belonging to a different driver. Read-only is honest; a button that
cannot do the right thing is not.

C2 is **resolved by decision, not by code**: approval stays role-11-only. Role
12 operates queues; it does not approve bidding.

### C3 — Org-type enum · Resolved

`mine`, `farm`, `port` added to the DDL, `Utils/Constants.js`, and the Joi
validation, plus `scripts/migrate-queue-org-types.js`.

**The migration's own guard was wrong and would have refused to run.** It
required the live ENUM to be a strict *prefix* of the target, but `other` is
currently fifth while the target puts it last — so the script exited 1 against
its own starting state. Reordering an ENUM is safe (MySQL remaps the stored
index), so the guard now checks that no live value is *dropped*. Verified
against 5 simulated live states: current, already-migrated, partially-migrated,
`other`-absent, and unknown-value (correctly refuses).

**Not yet run against a live database.**

### C4 — Driver directory · Resolved

New `GET /api/queue/driverDirectory` with validation, active-membership and
active driver/vehicle filtering, and pagination. Manual check-in merges it with
the queue and keeps the queue fallback.

**Policy mismatch found and fixed:** the route docblock says "plus platform
Admin/SuperAdmin" and the middleware admits them, but `assertQueueStaffOfOrg`
demanded a membership row that a platform admin by definition does not have —
so they passed middleware and then got a 403. Platform admins are now exempt,
matching the documented policy.

### D1 / D2 / D3 · Resolved

D1: 13 dead constants removed (12 unused + the `vechicleDriverList` typo).
**Correction to the original finding:** `POST /api/vehicleDriver`,
`GET /api/vehicleDriver/`, and `DELETE /api/vehicleDriver/:id` *do* exist. The
constants named no such routes but had zero consumers, so the end result is the
same — they were removed for being unused, not for pointing nowhere.

D2: `README.md` and `docs/queadmin-frontend.md` corrected on cookie auth, roles,
legacy vs RTK API, and the socket handshake. The socket example had
`withCredentials` nested inside `auth`, where it does nothing; it is a top-level
Socket.IO option. The documented rejection codes were checked against
`Utils/WSPusher.js` rather than assumed.

D3: profile editing, notifications, and 2FA have **no backend endpoint and no
notification-preference table**, so they cannot honestly be wired. They are now
disabled with a visible explanation, and the localStorage "persistence" was
removed — a flag that only lives in one browser tab looks like a setting while
changing nothing. The false success toasts are gone. Dark mode, language, and
sign-out are real and keep their toasts.

### E1 / E2 · Resolved

E1: authorization failures return 403; 401 is reserved for genuine session
expiry, so a role check can no longer log a dispatcher out.
E2: the role → session-TTL table is documented (admins 24h, others 365d).

---


## Also noted — not a gap, but worth knowing

**Coordinates carry three meanings on `QueueOrganization`.**

- line 2160: *"latitude/longitude is the site reference / order pickup point, **NOT** a check-in gate"*
- line 2171: `checkinRadiusKm` makes that same point a **check-in gate** (Haversine, default 15 km; `0` disables)
- orders also use it as the **pickup origin**

One coordinate, three jobs, and the comment actively denies one of them. It works today, but any future change to loading-place geometry will interact with check-in validation and order origin in ways the schema does not warn about.

**`roleId` arrives as a number in some paths, `1`/`0` in others.** `MembersTable.tsx` compares `member.isActive === 1`, while `QueueOrganization` uses `BOOLEAN`. Minor today, a real bug the first time it is read as truthy.

**Realtime discards payloads.** Every `queue_*` socket event triggers a debounced RTK Query tag invalidation → full `GET /queue/status`. Consistent and simple, but the 7 typed events in the backend (`Utils/MessageTypes.js:292–322`) carry data the console throws away, and a busy queue means a status refetch per 150 ms window per client.

**Dashboard recomputes what the backend already answers.** `GET /api/queueOrganization/getQueueCountsByStatus` exists and is role-scoped to 11/12 — the console ignores it and counts client-side from the full list. Less efficient, and it will disagree with the backend for admins who can see all orgs.

**Orphaned page.** `src/pages/organizations/OrganizationsPage.tsx` is fully implemented but absent from `AppRoutes`; `/organizations` redirects to `/dashboard`. Its logic was extracted into `useOrgList`. `docs/refactor-plan.md` already proposes deleting it.

**Two context directories.** `src/context/` (`AuthContext`) and `src/contexts/` (`ThemeContext`) should be merged.

**Non-English keys are invisible if missing.** Every call passes an inline default — `t("common.close", "Close")` — so an absent Amharic key silently renders English. Good for resilience, but it will hide translation gaps in production. No automated key-parity check exists.

---

## Recommended order — executed as planned

> All 11 steps below are complete. See [Resolution](#resolution--what-was-changed-per-finding)
> for what each one actually turned out to require.

**A1 → A2 → A3**, then **E1**, then **B**, then **C**.

Rationale: A1 blocks the console for an entire role, and B and C cannot be validated with that role until it is fixed. A2 is latent but must precede B1, since member-add is the first action B1 introduces. E1 is a one-word backend change that sits before C2, because both are role-policy answers and C2's role-12 approval rule will keep producing 401s until E1 lands. C1 is the largest piece and depends on the console being usable at all.

Suggested sequence:

1. **A1** ✓ — confirm whether the backend socket accepts `"queueDispatcher"`; then guard + socket + role constant
2. **A2** ✓ — one-line constant fix plus stop stripping `userUniqueId` from the body
3. **A3** ✓ — correct DDL comments and four route docblocks
4. **E1** ✓ — `AppError.UNAUTHORIZED` → `AppError.FORBIDDEN` in `verifyIfUserIsSupperAdmin`
5. **E2** ✓ — add the role→TTL table to the console README
6. **B1** ✓ — member lifecycle actions (works properly only after A2)
7. **B2** ✓ — entry history panel
8. **C1** ✓ — wire the real bidding board, retire the fuzzy-match
9. **C2** ✓ — settle role 12 policy, then align docblock and UI
10. **C3 / C4** ✓ — enum migration; driver search endpoint
11. **D1 / D2 / D3** ✓ — prune constants, rewrite docs, disable dead settings

---

## Deferred by decision

**Social bonding / trust layer.** Deliberately out of scope for this phase.

For the record, the raw material already exists in the schema:

- `DriverQueue.targetedShipperUserUUID` (`Database.js:2270`) — a queue position reserved exclusively for one shipper's orders. A relationship encoded as a queue slot.
- `DriverQueue.queueRefusalCount` (`:2262`) — consecutive front-of-line refusals; cost applied at the limit.
- `DriverQueueHistory` / `QueueAuditLog` — complete before/after snapshots with actor and reason.

Every row answers *"who changed what."* None answer *"how does this driver behave at this place."* There is no aggregate anywhere: no driver↔org history, no acceptance rate, no no-show count, no tenure. A driver who has loaded at a plant 40 times without a refusal is indistinguishable from one who arrived this morning.

That analysis is recorded here so the next phase starts from it.
