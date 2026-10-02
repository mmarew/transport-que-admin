import appAPIs from "@/utils/constant";
import type { QueueStatusResponse } from "@/types/queue";
import { api } from "./base";
import type {
  AcceptDriverRequestArgs,
  AcceptDriverRequestResponse,
  DispatchQueueArgs,
  DispatchQueueResponse,
  GetQueueStatusArgs,
  ManualCheckinArgs,
  ManualCheckinResponse,
  OverrideEntryArgs,
  OverrideEntryResponse,
  RemoveEntryResponse,
  GetEntryHistoryResponse,
  GetBidsForOrderArgs,
  GetBidsForOrderResponse,
  ApproveBiddingArgs,
  ApproveBiddingResponse,
} from "./types";

function isUUID(value?: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

export const {
  useGetQueueStatusQuery,
  useManualCheckinMutation,
  useDispatchQueueMutation,
  useAcceptDriverRequestMutation,
  useOverrideEntryMutation,
  useRemoveEntryMutation,
  useGetEntryHistoryQuery,
  useGetBidsForOrderQuery,
  useApproveBiddingMutation,
} = api.injectEndpoints({
  endpoints: (builder) => ({
    getQueueStatus: builder.query<QueueStatusResponse, GetQueueStatusArgs>({
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

    manualCheckin: builder.mutation<ManualCheckinResponse, ManualCheckinArgs>({
      query: (body) => ({ url: appAPIs.manualCheckinAPI, method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
      ],
    }),

    dispatchQueue: builder.mutation<DispatchQueueResponse, DispatchQueueArgs>({
      query: (body) => ({ url: appAPIs.dispatchQueueAPI, method: "POST", body }),
      invalidatesTags: (_, __, { queueOrganizationUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
        "ShipperRequests",
      ],
    }),

    /**
     * Accepting a driver bid.
     *
     * The ids must be supplied exactly as the backend issued them. The previous
     * version tried to reconstruct them: when an id was missing it pulled 100
     * shipper requests and fuzzy-matched on driverRequestId / userUniqueId /
     * phoneNumber, then fell back to "if there is exactly one driverRequest,
     * it must be the right one", and finally to POST /queue/dispatch. That is
     * unsound under a concurrent bid — the race resolves to a different driver
     * with no error — and it cost 100 rows per accept. A missing id is now a
     * hard, visible failure instead of a silent wrong-driver write.
     */
    acceptDriverRequest: builder.mutation<AcceptDriverRequestResponse, AcceptDriverRequestArgs>({
      queryFn: async (args, _queryApi, _extraOptions, baseQuery) => {
        const shipperRequestUniqueId = isUUID(args.shipperRequestUniqueId)
          ? args.shipperRequestUniqueId.trim()
          : undefined;
        const driverRequestUniqueId = isUUID(args.driverRequestUniqueId)
          ? args.driverRequestUniqueId.trim()
          : undefined;
        const journeyDecisionUniqueId = isUUID(args.journeyDecisionUniqueId)
          ? args.journeyDecisionUniqueId.trim()
          : undefined;

        if (!shipperRequestUniqueId || !driverRequestUniqueId) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error:
                "Cannot accept this bid: the order and driver request ids are missing. " +
                "Reload the bids for this order and try again.",
            },
          };
        }

        const res = await baseQuery({
          url: appAPIs.acceptDriverOfferAPI,
          method: "PUT",
          body: {
            shipperRequestUniqueId,
            driverRequestUniqueId,
            ...(journeyDecisionUniqueId ? { journeyDecisionUniqueId } : {}),
          },
        });

        if (res.error) return { error: res.error };
        return {
          data: (res.data as AcceptDriverRequestResponse) || {
            message: "Driver offer accepted successfully",
          },
        };
      },
      invalidatesTags: (_, __, { queueOrganizationUniqueId, shipperRequestUniqueId }) => [
        { type: "QueueStatus", id: `${queueOrganizationUniqueId}|today` },
        { type: "DriverQueue", id: queueOrganizationUniqueId },
        { type: "DriverBids", id: shipperRequestUniqueId as string },
        "ShipperRequests",
      ],
    }),

    /**
     * The authoritative bid list for one order. Ordered cheapest-first by the
     * backend, scoped to the shipper owner / SuperAdmin / active QueueOrgAdmin.
     */
    getBidsForOrder: builder.query<GetBidsForOrderResponse, GetBidsForOrderArgs>({
      query: ({ shipperRequestUniqueId, page = 1, limit = 100 }) => ({
        url: appAPIs.getBidsForOrderAPI.replace(
          ":shipperRequestUniqueId",
          shipperRequestUniqueId,
        ),
        params: { page, limit },
      }),
      providesTags: (_r, _e, { shipperRequestUniqueId }) => [
        { type: "DriverBids", id: shipperRequestUniqueId },
      ],
    }),

    /**
     * Open or close the bidding board. The gate is per-order, not per-batch, so
     * orders inside one batch can diverge between FIFO and auction.
     */
    approveBidding: builder.mutation<ApproveBiddingResponse, ApproveBiddingArgs>({
      query: ({ shipperRequestUniqueIds, approved }) => ({
        url: appAPIs.approveBiddingAPI,
        method: "POST",
        body: { shipperRequestUniqueIds, approved },
      }),
      invalidatesTags: ["ShipperRequests"],
    }),

    overrideEntry: builder.mutation<OverrideEntryResponse, OverrideEntryArgs>({
      query: ({ queueUniqueId, body }) => ({
        url: appAPIs.overrideEntryAPI.replace(":queueUniqueId", queueUniqueId),
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    removeEntry: builder.mutation<RemoveEntryResponse, string>({
      query: (queueUniqueId) => ({
        url: appAPIs.removeEntryAPI.replace(":queueUniqueId", queueUniqueId),
        method: "DELETE",
      }),
      invalidatesTags: ["QueueStatus", "DriverQueue"],
    }),

    getEntryHistory: builder.query<GetEntryHistoryResponse, string>({
      query: (queueUniqueId) => ({
        url: appAPIs.getEntryHistoryAPI.replace(":queueUniqueId", queueUniqueId),
      }),
      providesTags: (_, __, queueUniqueId) => [{ type: "DriverQueue", id: `${queueUniqueId}-history` }],
    }),
  }),
});