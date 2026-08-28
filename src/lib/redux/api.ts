import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getToken, type StoredAuth } from "@/lib/auth";
import appAPIs from "@/utils/constant"
import type {
  QueueOrganization,
  QueueOrgListItem,
  QueueOrgMember,
  QueueStatusResponse,
  DriverQueueEntry,
  PaginatedResponse,
  QueueOrgType,
  CreateOrderPayload,
  VehicleType,
} from "@/types/queue";

function getBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "/api";
  if (!raw) return "/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { logout } from "./slices/authSlice";

const BASE_URL = getBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiCtx,
  extraOptions
) => {
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
  endpoints: (builder) => ({
    // --- Auth ---
    requestLoginOtp: builder.mutation<
      { message: string; data: { userId: number; userUniqueId: string; fullName: string; phoneNumber: string; email: string; roleId: number } },
      { phoneNumber: string; roleId: number }
    >({
      query: (body) => ({ url: appAPIs.loginAPI, method: "POST", body }),
    }),

    verifyOtp: builder.mutation<
      { message: string; token: string; userData: StoredAuth["userData"] },
      { phoneNumber: string; roleId: number; OTP: string }
    >({
      query: (body) => ({ url: appAPIs.verifyOtpAPI, method: "POST", body }),
      async onQueryStarted(_args, { queryFulfilled }) {
        /* eslint-disable no-empty */
        try {
          const { data } = await queryFulfilled;
          const { storeAuth } = await import("@/lib/auth");
          storeAuth({ token: data.token, userData: data.userData });
        } catch {
        }
        /* eslint-enable no-empty */
      },
    }),

    registerUser: builder.mutation<
      { message: string; data: { userId: number; userUniqueId: string; fullName: string; phoneNumber: string; email: string; roleId: number } },
      { fullName: string; phoneNumber: string; email?: string | null; roleId: number; statusId: number }
    >({
      query: (body) => ({ url: appAPIs.registerUserAPI, method: "POST", body }),
    }),

    // --- Queue Organizations ---
    listQueueOrganizations: builder.query<
      PaginatedResponse<QueueOrgListItem>,
      Record<string, string | number | boolean> | void
    >({
      query: (params) => {
        if (!params) return { url: appAPIs.listQueueOrganizationsAPI };
        return { url: appAPIs.listQueueOrganizationsAPI, params };
      },
      providesTags: ["QueueOrganizations"],
    }),

    getQueueOrganization: builder.query<
      { message: string; data: QueueOrgListItem },
      string
    >({
      query: (id) => appAPIs.getQueueOrganizationAPI.replace(":id", id),
      providesTags: (_, __, id) => [{ type: "QueueOrganizations", id }],
    }),

    updateQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string } },
      { id: string; body: Partial<QueueOrganization> }
    >({
      query: ({ id, body }) => ({ url: appAPIs.updateQueueOrganizationAPI.replace(":id", id), method: "PATCH", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    approveQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } },
      { id: string; body: { approvalStatus: "approved" | "rejected" | "suspended"; approvalReason?: string; queueEnabled?: boolean } }
    >({
      query: ({ id, body }) => ({ url: appAPIs.approveQueueOrganizationAPI.replace(":id", id), method: "PATCH", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    createQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } },
      {
        queueOrganizationName: string;
        queueOrganizationType: QueueOrgType;
        queueOrganizationPhone?: string | null;
        queueOrganizationAddress: string;
        latitude?: number | null;
        longitude?: number | null;
      }
    >({
      query: (body) => ({ url: appAPIs.createQueueOrganizationAPI, method: "POST", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    listQueueOrgMembers: builder.query<
      { message: string; data: QueueOrgMember[] },
      string
    >({
      query: (id) => appAPIs.listQueueOrgMembersAPI.replace(":id", id),
      providesTags: (_, __, id) => [{ type: "QueueOrgMembers", id }],
    }),

    addQueueOrgMember: builder.mutation<
      { message: string; data: QueueOrgMember },
      { id: string; userUniqueId: string; roleId: number; isActive?: boolean }
    >({
      query: ({ id, userUniqueId, ...body }) => ({ url: appAPIs.addQueueOrgMemberAPI.replace(":id", id).replace(":userUniqueId", userUniqueId), method: "POST", body }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }],
    }),

    // --- Driver Queue ---
    getQueueStatus: builder.query<
      QueueStatusResponse,
      { queueOrganizationUniqueId: string; queueDate?: string }
    >({
      query: ({ queueOrganizationUniqueId, queueDate }) => ({
        url: appAPIs.getQueueStatusAPI,
        params: { queueOrganizationUniqueId, queueDate },
      }),
      providesTags: (_, __, { queueOrganizationUniqueId, queueDate }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|${queueDate ?? "today"}` },
      ],
    }),

    manualCheckin: builder.mutation<
      { message: string; data: Pick<DriverQueueEntry, "queueUniqueId" | "queueNumber" | "status"> },
      { queueOrganizationUniqueId: string; vehicleDriverUniqueId: string; queueNumber?: number }
    >({
      query: (body) => ({ url: appAPIs.manualCheckinAPI, method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
      ],
    }),

    dispatchQueue: builder.mutation<
      { message: string; data: { queueUniqueId: string; queueNumber: number; driverUserUniqueId: string; status: string } },
      { queueOrganizationUniqueId: string; vehicleTypeUniqueId: string; shipperRequestUniqueId?: string }
    >({
      query: (body) => ({ url: appAPIs.dispatchQueueAPI, method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
        "ShipperRequests",
      ],
    }),

    overrideEntry: builder.mutation<
      { message: string; data: DriverQueueEntry },
      { queueUniqueId: string; body: { queueNumber: number; reason?: string } }
    >({
      query: ({ queueUniqueId, body }) => ({ url: appAPIs.overrideEntryAPI.replace(":queueUniqueId", queueUniqueId), method: "PATCH", body }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    removeEntry: builder.mutation<
      { message: string; data: { queueUniqueId: string } },
      string
    >({
      query: (queueUniqueId) => ({ url: appAPIs.removeEntryAPI.replace(":queueUniqueId", queueUniqueId), method: "DELETE" }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    // --- Shipper Request (queue orders) ---
    createQueueOrder: builder.mutation<
      { message: string; data: { totalRecords: Record<string, number> } },
      CreateOrderPayload
    >({
      query: (body) => ({ url: appAPIs.createOrderAPI, method: "POST", body }),
      invalidatesTags: ["QueueStatus", "DriverQueue", "ShipperRequests"],
    }),

    // --- Vehicle/Driver for checkin ---
    listVehicleTypes: builder.query<
      { message: string; data: VehicleType[] },
      void
    >({
      query: () => ({ url: appAPIs.listVehicleTypesAPI, params: { limit: 100 } }),
      providesTags: ["VehicleTypes"],
    }),

    listVehicleDrivers: builder.query<
      { message: string; data: Array<{ vehicleDriverUniqueId: string; vehicleTypeUniqueId: string; driverName: string; driverPhoneNumber: string; vehicleTypeName: string }> },
      void
    >({
      queryFn: async (_arg, _queryApi, _extraOptions, baseQuery) => {
        try {
          const result = await baseQuery({ url: appAPIs.listDriversPaginatedAPI, params: { page: 1, limit: 100 } });
          if (result.error && (result.error.status === 404 || result.error.status === 400)) {
            return { data: { message: "success", data: [] } };
          }
          return (result as { data: { message: string; data: Array<{ vehicleDriverUniqueId: string; vehicleTypeUniqueId: string; driverName: string; driverPhoneNumber: string; vehicleTypeName: string }> } }) || { data: { message: "success", data: [] } };
        } catch {
          return { data: { message: "success", data: [] } };
        }
      },
    }),

    // --- Shipper Requests list (orders) ---
    getShipperRequests: builder.query<
      {
        message: string;
        data: Array<{
          shipperRequest: {
            shipperRequestUniqueId: string;
            shipperRequestBatchUniqueId: string;
            vehicleTypeUniqueId: string;
            requestMode: string;
            originPlace: string;
            originLatitude: string;
            originLongitude: string;
            destinationPlace: string;
            destinationLatitude: string;
            destinationLongitude: string;
            shippableItemName: string;
            shippableItemQtyInQuintal: string;
            shippingDate: string;
            deliveryDate: string;
            shippingCost: string;
            shipperRequestCreatedAt: string;
            journeyStatusId: number;
            fullName: string;
            phoneNumber: string;
            vehicleTypeName: string;
            queueOrganizationUniqueId: string;
          };
          driverRequests: unknown[];
          decisions: unknown[];
          journey: Record<string, unknown>;
        }>;
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          limit: number;
        };
      },
      { queueOrganizationUniqueId: string; target?: "all" | "single"; page?: number; limit?: number }
    >({
      query: (params) => ({ url: appAPIs.getShipperRequestsAPI, params }),
      providesTags: ["ShipperRequests"],
    }),
  }),
});

export const {
  useRequestLoginOtpMutation,
  useVerifyOtpMutation,
  useRegisterUserMutation,
  useListQueueOrganizationsQuery,
  useGetQueueOrganizationQuery,
  useUpdateQueueOrganizationMutation,
  useApproveQueueOrganizationMutation,
  useCreateQueueOrganizationMutation,
  useListQueueOrgMembersQuery,
  useAddQueueOrgMemberMutation,
  useGetQueueStatusQuery,
  useManualCheckinMutation,
  useDispatchQueueMutation,
  useOverrideEntryMutation,
  useRemoveEntryMutation,
  useCreateQueueOrderMutation,
  useListVehicleTypesQuery,
  useListVehicleDriversQuery,
  useGetShipperRequestsQuery,
} = api;