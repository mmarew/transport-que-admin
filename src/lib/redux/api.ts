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
import { DEFAULT_VEHICLE_TYPES } from "@/utils/vehicleType";

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
    if (token) {
      const cleanToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      headers.set("Authorization", cleanToken);
    }
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
        const queryParams = { limit: 100, ...(params || {}) };
        return { url: appAPIs.listQueueOrganizationsAPI, params: queryParams };
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
      invalidatesTags: (_, __, { id }) => ["QueueOrganizations", { type: "QueueOrganizations", id }],
    }),

    approveQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } },
      { id: string; body: { approvalStatus: "approved" | "rejected" | "suspended"; approvalReason?: string; queueEnabled?: boolean } }
    >({
      query: ({ id, body }) => ({ url: appAPIs.approveQueueOrganizationAPI.replace(":id", id), method: "PATCH", body }),
      invalidatesTags: (_, __, { id }) => ["QueueOrganizations", { type: "QueueOrganizations", id }],
    }),

    deleteQueueOrganization: builder.mutation<
      { message: string; data?: { queueOrganizationUniqueId: string } },
      string
    >({
      query: (id) => ({ url: appAPIs.getQueueOrganizationAPI.replace(":id", id), method: "DELETE" }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    createQueueOrganization: builder.mutation<
      { message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string; alreadyExisted?: boolean } },
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
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
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
        { type: "QueueStatus", id: "LIST" },
        { type: "QueueStatus" },
        "QueueStatus",
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

    acceptDriverRequest: builder.mutation<
      { message: string; data?: unknown },
      {
        queueOrganizationUniqueId: string;
        shipperRequestUniqueId: string;
        driverPhoneNumber?: string;
        driverUserUniqueId?: string;
        driverRequestId?: number | string;
        driverRequestUniqueId?: string;
        journeyDecisionUniqueId?: string;
        vehicleTypeUniqueId?: string;
        queueUniqueId?: string;
      }
    >({
      queryFn: async (args, _queryApi, _extraOptions, baseQuery) => {
        try {
          const isUUID = (val?: unknown): val is string =>
            typeof val === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

          let cleanShipperReqId = isUUID(args.shipperRequestUniqueId)
            ? args.shipperRequestUniqueId.trim()
            : undefined;
          let cleanDriverReqId = isUUID(args.driverRequestUniqueId)
            ? args.driverRequestUniqueId.trim()
            : undefined;
          let cleanDecisionId = isUUID(args.journeyDecisionUniqueId)
            ? args.journeyDecisionUniqueId.trim()
            : undefined;

          // If journeyDecisionUniqueId or driverRequestUniqueId is missing, resolve from shipper requests query
          if ((!cleanDecisionId || !cleanDriverReqId) && cleanShipperReqId) {
            try {
              const fetchRes = await baseQuery({
                url: appAPIs.getShipperRequestsAPI,
                params: { target: "all", limit: 100 },
              });
              const items = (fetchRes.data as any)?.data;
              if (Array.isArray(items)) {
                const targetItem = items.find(
                  (it: any) =>
                    it.shipperRequest?.shipperRequestUniqueId === cleanShipperReqId ||
                    it.shipperRequestUniqueId === cleanShipperReqId
                );
                if (targetItem) {
                  const decisions: any[] = Array.isArray(targetItem.decisions) ? targetItem.decisions : [];
                  const driverRequests: any[] = Array.isArray(targetItem.driverRequests) ? targetItem.driverRequests : [];

                  if (!cleanDriverReqId) {
                    const matchedDriver = driverRequests.find(
                      (d: any) =>
                        (args.driverRequestId != null && d.driverRequestId === args.driverRequestId) ||
                        (args.driverUserUniqueId && d.userUniqueId === args.driverUserUniqueId) ||
                        (args.driverPhoneNumber && d.phoneNumber === args.driverPhoneNumber)
                    ) || (driverRequests.length === 1 ? driverRequests[0] : null);

                    if (matchedDriver && isUUID(matchedDriver.driverRequestUniqueId)) {
                      cleanDriverReqId = matchedDriver.driverRequestUniqueId;
                    }
                  }

                  if (!cleanDecisionId) {
                    const matchedDecision = decisions.find(
                      (dec: any) =>
                        (args.driverRequestId != null && dec.driverRequestId === args.driverRequestId) ||
                        (cleanDriverReqId && dec.driverRequestUniqueId === cleanDriverReqId) ||
                        (args.driverUserUniqueId && dec.driverUserUniqueId === args.driverUserUniqueId)
                    ) || (decisions.length === 1 ? decisions[0] : null);

                    if (matchedDecision && isUUID(matchedDecision.journeyDecisionUniqueId)) {
                      cleanDecisionId = matchedDecision.journeyDecisionUniqueId;
                    }
                  }
                }
              }
            } catch (resolveErr) {
              console.warn("[acceptDriverRequest] Failed to resolve missing IDs:", resolveErr);
            }
          }

          // Primary: PUT /api/shipper/acceptDriverOffer as requested by user
          const finalDecisionId = cleanDecisionId || cleanDriverReqId;
          const finalDriverReqId = cleanDriverReqId || cleanDecisionId;

          if (cleanShipperReqId && finalDriverReqId && finalDecisionId) {
            const acceptOfferBody = {
              shipperRequestUniqueId: cleanShipperReqId,
              driverRequestUniqueId: finalDriverReqId,
              journeyDecisionUniqueId: finalDecisionId,
            };
            console.log("[acceptDriverRequest] Calling PUT", appAPIs.acceptDriverOfferAPI, acceptOfferBody);

            const offerRes = await baseQuery({
              url: appAPIs.acceptDriverOfferAPI,
              method: "PUT",
              body: acceptOfferBody,
            });

            if (!offerRes.error) {
              return {
                data: (offerRes.data as { message: string; data?: unknown }) || {
                  message: "Driver offer accepted successfully",
                },
              };
            }

            console.error("[acceptDriverRequest] PUT /api/shipper/acceptDriverOffer error:", offerRes.error);
            return { error: offerRes.error };
          }

          // If driver identifiers were provided but could not be resolved to valid UUIDs
          if (args.driverRequestId || args.driverRequestUniqueId || args.journeyDecisionUniqueId || args.driverUserUniqueId) {
            return {
              error: {
                status: "CUSTOM_ERROR",
                error: "Missing required offer IDs (shipperRequestUniqueId, driverRequestUniqueId, journeyDecisionUniqueId) to accept offer.",
              },
            };
          }

          // Fallback only for direct queue dispatch (no driver bid)
          const rawPhone = args.driverPhoneNumber?.trim();
          const cleanPhone = rawPhone ? rawPhone.replace(/[\s-]/g, "") : undefined;
          const cleanVehicleTypeId = isUUID(args.vehicleTypeUniqueId)
            ? args.vehicleTypeUniqueId.trim()
            : undefined;
          const cleanQueueUniqueId = isUUID(args.queueUniqueId)
            ? args.queueUniqueId.trim()
            : undefined;

          const dispatchBody: Record<string, unknown> = {
            queueOrganizationUniqueId: args.queueOrganizationUniqueId,
          };
          if (cleanShipperReqId) dispatchBody.shipperRequestUniqueId = cleanShipperReqId;
          if (cleanQueueUniqueId) dispatchBody.queueUniqueId = cleanQueueUniqueId;
          else if (cleanPhone) dispatchBody.driverPhoneNumber = cleanPhone;
          else if (cleanVehicleTypeId) dispatchBody.vehicleTypeUniqueId = cleanVehicleTypeId;

          const res = await baseQuery({
            url: appAPIs.dispatchQueueAPI,
            method: "POST",
            body: dispatchBody,
          });

          if (!res.error) {
            return {
              data: (res.data as { message: string; data?: unknown }) || {
                message: "Driver request accepted",
              },
            };
          }

          return { error: res.error };
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to accept driver request";
          return { error: { status: "CUSTOM_ERROR", error: message } };
        }
      },
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
      queryFn: async (_arg, _queryApi, _extraOptions, baseQuery) => {
        try {
          const result = await baseQuery({
            url: appAPIs.listVehicleTypesAPI,
            params: { limit: 100 },
          });
          if (result.error) {
            // Backend endpoint not found or error, safely return standard default vehicle types
            return {
              data: {
                message: "success",
                data: DEFAULT_VEHICLE_TYPES as unknown as VehicleType[],
              },
            };
          }
          const payload = result.data as { message?: string; data?: VehicleType[] };
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : (DEFAULT_VEHICLE_TYPES as unknown as VehicleType[]);
          return {
            data: {
              message: payload?.message || "success",
              data: list.length > 0 ? list : (DEFAULT_VEHICLE_TYPES as unknown as VehicleType[]),
            },
          };
        } catch {
          return {
            data: {
              message: "success",
              data: DEFAULT_VEHICLE_TYPES as unknown as VehicleType[],
            },
          };
        }
      },
      providesTags: ["VehicleTypes"],
    }),

    listVehicleDrivers: builder.query<
      { message: string; data: Array<{ vehicleDriverUniqueId: string; vehicleTypeUniqueId: string; driverName: string; driverPhoneNumber: string; vehicleTypeName: string }> },
      { queueOrganizationUniqueId: string } | void
    >({
      // No working driver-list endpoint exists on the backend.
      // CheckinModal derives driver data from queueStatus directly.
      queryFn: async () => ({ data: { message: "success", data: [] } }),
    }),


    // --- Shipper Requests list (orders) ---
    getShipperRequests: builder.query<
      {
        message: string;
        data: Array<{
          shipperRequest: {
            shipperRequestUniqueId: string;
            shipperRequestBatchUniqueId: string;
            userUniqueId: string;
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
          driverRequests: Array<{
            driverRequestId?: number;
            driverRequestUniqueId?: string;
            userUniqueId: string;
            journeyStatusId?: number | null;
            fullName?: string | null;
            phoneNumber?: string | null;
            email?: string | null;
            vehicleOfDriver?: unknown;
            driverProfilePhoto?: string | null;
          }>;
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
      {
        queueOrganizationUniqueId: string;
        target?: "all" | "single";
        page?: number;
        limit?: number;
        journeyStatusId?: string;
      }
    >({
      query: (params) => ({
        url: appAPIs.getShipperRequestsAPI,
        params: {
          target: "all",
          page: 1,
          limit: 100,
          ...params,
        },
      }),
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
  useDeleteQueueOrganizationMutation,
  useCreateQueueOrganizationMutation,
  useListQueueOrgMembersQuery,
  useAddQueueOrgMemberMutation,
  useGetQueueStatusQuery,
  useManualCheckinMutation,
  useDispatchQueueMutation,
  useAcceptDriverRequestMutation,
  useOverrideEntryMutation,
  useRemoveEntryMutation,
  useCreateQueueOrderMutation,
  useListVehicleTypesQuery,
  useListVehicleDriversQuery,
  useGetShipperRequestsQuery,
} = api;