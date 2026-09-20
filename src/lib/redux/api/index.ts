// =============================================================================
// API MODULE BARREL — how everything is linked
// =============================================================================
// This file is the SINGLE public entry point for the whole RTK Query api
// module. Every consumer in the app imports from here (components, hooks,
// store.ts, socket.ts) using the same path:
//
//   import { useGetQueueStatusQuery, api } from "../lib/redux/api";
//
// WHY THIS FILE EXISTS (the linking story):
//   The core `api` object in ./base.ts is created with an EMPTY endpoint list.
//   Real functionality comes from 5 feature modules, each of which imports the
//   SAME api from "./base" and calls `api.injectEndpoints(...)` at module load.
//   THAT side-effect call is the "linker" — it mutates api.endpoints and
//   registers the module's hooks.
//
//   Linking happens the moment a module is IMPORTED. So index.ts is built so
//   that importing the barrel:
//     1. re-exports the core `api`            (line 1)  → store wiring + socket
//        invalidation, and the *_endpoints files use it for injection,
//     2. re-exports shared request/response   (line 2)  → used by every
//        endpoint definition AND by components that need the arg/response types,
//     3. imports each *_endpoints module (lines 3-7) via `export *`,
//        which RUNS its injectEndpoints call. The generated hooks
//        (useXQuery / useXMutation) are then re-exported here so consumers
//        never touch the feature files directly.
//
// IMPORT ORDER MATTERS (but is safe here):
//   Because store.ts imports this barrel, and this barrel pulls in all five
//   endpoint modules, all 22 endpoints are registered BEFORE the store is ever
//   configured — so api.reducer + api.middleware (base.ts) see a fully
//   populated api at runtime.
//
// TL;DR:   import index.ts  →  loads base (core) + feature modules (inject links)
//           ├─ api .................. the core (store.ts, socket.ts, injectors)
//           ├─ types ................ shared ARGS/RESPONSE contracts
//           └─ hooks + endpoint fns . the 5 features', via each injectEndpoints
//
// Full endpoint inventory per module is documented next to `endpoints: () => ({})`
// in ./base.ts.
// =============================================================================

export { api } from "./base";
export * from "./types";
export * from "./authEndpoints";
export * from "./queueOrganizationEndpoints";
export * from "./driverQueueEndpoints";
export * from "./shipperRequestEndpoints";
export * from "./vehicleEndpoints";