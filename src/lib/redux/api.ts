import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getToken, type StoredAuth } from "@/lib/auth";
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

const BASE_URL = getBaseUrl();

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "QueueOrganizations",
    "QueueOrgMembers",
    "QueueStatus",
    "DriverQueue",
    "Auth",
    "VehicleTypes",
  ],
  endpoints: (builder) => ({
    // --- Auth ---
    requestLoginOtp: builder.mutation<
      { message: string; data: { userId: number; userUniqueId: string; fullName: string; phoneNumber: string; email: string; roleId: number } },
      { phoneNumber: string; roleId: number }
    >({
      query: (body) => ({ url: "/user/loginUser", method: "POST", body }),
    }),

    verifyOtp: builder.mutation<
      { message: string; token: string; userData: StoredAuth["userData"] },
      { phoneNumber: string; roleId: number; OTP: string }
    >({
query: (body) => ({ url: "/user/verifyUserByOTP", method: "POST", body }),
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
      query: (body) => ({ url: "/user/createUser", method: "POST", body }),
    }),

    // --- Queue Organizations ---
    listQueueOrganizations: builder.query<
      PaginatedResponse<QueueOrgListItem>,
      Record<string, string | number | boolean> | void
    >({
      query: (params) => {
        if (!params) return { url: "/queueOrganization" };
        return { url: "/queueOrganization", params };
      },
      providesTags: ["QueueOrganizations"],
    }),

    getQueueOrganization: builder.query<
      { message: string; data: QueueOrgListItem },
      string
    >({
      query: (id) => `/queueOrganization/${id}`,
      providesTags: (_, __, id) => [{ type: "QueueOrganizations", id }],
    }),

    updateQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string } },
      { id: string; body: Partial<QueueOrganization> }
    >({
      query: ({ id, body }) => ({ url: `/queueOrganization/${id}`, method: "PATCH", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    approveQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } },
      { id: string; body: { approvalStatus: "approved" | "rejected" | "suspended"; approvalReason?: string; queueEnabled?: boolean } }
    >({
      query: ({ id, body }) => ({ url: `/queueOrganization/${id}/approve`, method: "PATCH", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    createQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } },
      { queueOrganizationName: string; queueOrganizationType: QueueOrgType; queueOrganizationPhone?: string | null; queueOrganizationAddress: string; latitude: number; longitude: number }
    >({
      query: (body) => ({ url: "/queueOrganization", method: "POST", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    listQueueOrgMembers: builder.query<
      { message: string; data: QueueOrgMember[] },
      string
    >({
      query: (id) => `/queueOrganization/${id}/members`,
      providesTags: (_, __, id) => [{ type: "QueueOrgMembers", id }],
    }),

    addQueueOrgMember: builder.mutation<
      { message: string; data: QueueOrgMember },
      { id: string; userUniqueId: string; roleId: number; isActive?: boolean }
    >({
      query: ({ id, userUniqueId, ...body }) => ({ url: `/queueOrganization/${id}/members/${userUniqueId}`, method: "POST", body }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }],
    }),

    // --- Driver Queue ---
    getQueueStatus: builder.query<
      QueueStatusResponse,
      { queueOrganizationUniqueId: string; queueDate?: string }
    >({
      query: ({ queueOrganizationUniqueId, queueDate }) => ({
        url: "/queue/status",
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
      query: (body) => ({ url: "/queue/manualCheckin", method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
      ],
    }),

    dispatchQueue: builder.mutation<
      { message: string; data: { queueUniqueId: string; queueNumber: number; driverUserUniqueId: string; status: string } },
      { queueOrganizationUniqueId: string; vehicleTypeUniqueId: string; shipperRequestUniqueId?: string }
    >({
      query: (body) => ({ url: "/queue/dispatch", method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
      ],
    }),

    overrideEntry: builder.mutation<
      { message: string; data: DriverQueueEntry },
      { queueUniqueId: string; body: { queueNumber: number; reason?: string } }
    >({
      query: ({ queueUniqueId, body }) => ({ url: `/queue/entry/${queueUniqueId}/override`, method: "PATCH", body }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    removeEntry: builder.mutation<
      { message: string; data: { queueUniqueId: string } },
      string
    >({
      query: (queueUniqueId) => ({ url: `/queue/entry/${queueUniqueId}`, method: "DELETE" }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    // --- Shipper Request (queue orders) ---
    createQueueOrder: builder.mutation<
      { message: string; data: { totalRecords: Record<string, number> } },
      CreateOrderPayload
    >({
      query: (body) => ({ url: "/shipperRequest/createRequest", method: "POST", body }),
      invalidatesTags: ["QueueStatus"],
    }),

    // --- Vehicle/Driver for checkin ---
    listVehicleTypes: builder.query<
      { message: string; data: VehicleType[] },
      void
    >({
      query: () => ({ url: "/admin/vehicleTypes", params: { limit: 100 } }),
      providesTags: ["VehicleTypes"],
    }),

    listVehicleDrivers: builder.query<
      { message: string; data: Array<{ vehicleDriverUniqueId: string; vehicleTypeUniqueId: string; driverName: string; driverPhoneNumber: string; vehicleTypeName: string }> },
      { queueOrganizationUniqueId?: string }
    >({
      query: (params) => ({ url: "/vehicleDriver/list", params }),
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
} = api;