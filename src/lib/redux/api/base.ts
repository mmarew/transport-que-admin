import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { logout } from "@/lib/redux/slices/authSlice";

function getBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";
  if (!raw) return "/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

// WHAT IS fetchBaseQuery?
// ------------------------
// fetchBaseQuery(...) is a FACTORY: you call it with config, it RETURNS a
// "base query" function. That returned function is what actually performs the
// network request (it calls the browser's native `fetch`), and RTK Query calls
// it for every endpoint request. It is NOT axios, and createApi does not fetch
// anything itself — createApi only invokes the baseQuery you hand to it.
//
//   createApi  →  baseQueryWithReauth (wrapper)  →  rawBaseQuery (this fn)
//      └─ orchestrates cache/tags/invalidation  └─ builds URL + headers, calls fetch
//
// HOW IT IS USED HERE:
//   - baseUrl:      prefix for every request. We compute it from
//                   VITE_API_BASE_URL / VITE_API_URL (default "/api") so the
//                   same app works against dev/prod backends without rebuild.
//   - credentials:  "include" so the httpOnly session cookie is sent with every
//                   request. The cookie (not a JS-hosted Bearer token) is what
//                   authorizes each call, so no prepareHeaders auth is needed.
//
// COMMON OPTIONS (when you need them):
//   - fetchFn:       swap native fetch for axios/fetch with special behavior.
//   - credentials:   "include" to send cookies cross-origin.
//   - paramsSerializer: custom serialization for query params.
//   - timeout/validateStatus: request timeout & custom response validity.
//
// Saving `prepareHeaders` + base URL inside fetchBaseQuery once means every
// endpoint in this api automatically gets the correct prefix and credentials —
// query/mutation definitions (see *_endpoints.ts) only specify url + method.
const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: "include",
});

// WHY baseQueryWithReauth
// ------------------------
// RTK Query needs a `baseQuery` — the function that actually performs every
// fetch. fetchBaseQuery() already gives us URL construction + the Authorization
// header (prepareHeaders above). baseQueryWithReauth is a thin, central wrapper
// around that raw query that runs on EVERY single API call.
//
// Its one job: catch a 401 "Unauthorized" response. When the session cookie is
// invalid or expired, ANY endpoint can start returning 401. Instead of writing
// "handle expired session" logic in every hook/mutation/toast, we detect it in
// exactly one place and dispatch logout() — which clears the auth slice (stored
// user + cookie), so the app drops the user to the login screen everywhere at
// once. This is the canonical RTK Query "reauth" pattern (retry-after-refresh
// uses the same slot; we have no refresh-token flow, so for us "reauth" === logout).
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiCtx, extraOptions) => {
  const result = await rawBaseQuery(args, apiCtx, extraOptions);
  if (result.error && result.error.status === 401) {
    apiCtx.dispatch(logout());
  }
  return result;
};

export const api = createApi({
  reducerPath: "api",
  refetchOnFocus: false,
  refetchOnReconnect: false,
  keepUnusedDataFor: 300,
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "QueueOrganizations",
    "QueueOrgMembers",
    "QueueStatus",
    "DriverQueue",
    "Auth",
    "VehicleTypes",
    "ShipperRequests",
  ],
  // HOW ENDPOINTS GET "LINKED" (injectEndpoints)
  // ----------------------------------------------
  // There are NO endpoint definitions here. This is the empty base api that all
  // feature modules EXTEND at runtime. Each *_endpoints.ts file imports THIS
  // `api` and calls `api.injectEndpoints({ endpoints: (builder) => ({...}) })`
  // right below the import — that single call is the core linker: it:
  //   1. APPENDS the module's endpoints to api.endpoints (now 22 total),
  //   2. attaches the tags to tagTypes above, and
  //   3. exports the generated hooks (useXQuery / useXMutation) from that file.
  // Because every module imports the same `api` object, the file that matters
  // at the store level is THIS one (reducer + middleware), while features stay
  // isolated in their own file. The empty endpoints callback is required by
  // RTK Query even when everything is injected later.
  //
  // INJECTED ENDPOINTS BY MODULE (src/lib/redux/api/*_endpoints.ts):
//   authEndpoints.ts   — requestLoginOtp (mutation), verifyOtp (mutation,
//                        persists non-secret userData via storeAuth),
//                        registerUser (mutation)
  //   queueOrganizationEndpoints.ts —
  //       listQueueOrganizations (query), getQueueOrganization (query),
  //       updateQueueOrganization (mutation), approveQueueOrganization (mutation),
  //       deleteQueueOrganization (mutation), createQueueOrganization (mutation),
  //       listQueueOrgMembers (query), addQueueOrgMember (mutation)
  //   driverQueueEndpoints.ts —
  //       getQueueStatus (query), manualCheckin (mutation),
  //       dispatchQueue (mutation), acceptDriverRequest (mutation, custom queryFn),
  //       overrideEntry (mutation), removeEntry (mutation)
  //   shipperRequestEndpoints.ts —
  //       createQueueOrder (mutation), getShipperRequests (query),
  //       getShipperRequestBatches (query)
  //   vehicleEndpoints.ts —
  //       listVehicleTypes (query, falls back to DEFAULT_VEHICLE_TYPES),
  //       listVehicleDrivers (query, returns [] — no backend endpoint yet)
  //
  // Each module's hooks come back through the same barrel export (./index.ts),
  // so components keep importing from "@lib/redux/api" unchanged.
  endpoints: () => ({}),
});
