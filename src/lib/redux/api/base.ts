import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getToken } from "@/lib/auth";
import { logout } from "@/lib/redux/slices/authSlice";

function getBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";
  if (!raw) return "/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) {
      const cleanToken = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
      headers.set("Authorization", cleanToken);
    }
    return headers;
  },
});

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
  refetchOnReconnect: true,
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
  endpoints: () => ({}),
});
