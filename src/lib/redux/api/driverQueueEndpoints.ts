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
  GetCompanyBidsArgs,
  GetCompanyBidsResponse,
  CompanyBidItem,
  ApproveBiddingArgs,
  ApproveBiddingResponse,
} from "./types";

export const {
  useGetQueueStatusQuery,
  useManualCheckinMutation,
  useDispatchQueueMutation,
  useAcceptDriverRequestMutation,
  useOverrideEntryMutation,
  useRemoveEntryMutation,
  useGetEntryHistoryQuery,
  useGetBidsForOrderQuery,
  useGetCompanyBidsQuery,
  useLazyGetCompanyBidsQuery,
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
     * Backend truth: PUT /api/company/bids/:companyBidRequestUniqueId/status
     * with { bidStatus }, keyed on the bid's own id. The ids must be supplied
     * exactly as the backend issued them. The previous version tried to
     * reconstruct shipperRequestUniqueId + driverRequestUniqueId client-side,
     * then fell back to fuzzy-matching or "if there is exactly one driverRequest,
     * it must be the right one". That is unsound under a concurrent bid — the
     * race resolves to a different driver with no error — and it cost 100 rows
     * per accept. A missing bid id is now a hard, visible failure instead of a
     * silent wrong-driver write.
     */
    acceptDriverRequest: builder.mutation<AcceptDriverRequestResponse, AcceptDriverRequestArgs>({
      queryFn: async (args, _queryApi, _extraOptions, baseQuery) => {
        // Preferred: the bid-aware accept endpoint, keyed on the bid id. When
        // the row is a legacy shipper-request payload that only carries the
        // shipper-request / driver-request ids (queue board path), fall back to
        // the classic accept driver offer endpoint.
        const normalizeId = (val?: unknown): string | undefined => {
          if (typeof val === "string") {
            const trimmed = val.trim();
            return trimmed.length > 0 ? trimmed : undefined;
          }
          if (typeof val === "number" && !Number.isNaN(val)) {
            return String(val);
          }
          return undefined;
        };

        const companyBidRequestUniqueId = normalizeId(args.companyBidRequestUniqueId);
        const shipperRequestUniqueId = normalizeId(args.shipperRequestUniqueId);
        const driverRequestUniqueId =
          normalizeId(args.driverRequestUniqueId) ??
          (args.driverRequestId != null ? String(args.driverRequestId) : undefined);
        const journeyDecisionUniqueId = normalizeId(args.journeyDecisionUniqueId);

        if (companyBidRequestUniqueId) {
          const resolvedBidStatus =
            args.bidStatus && args.bidStatus !== "selected" && args.bidStatus !== "accepted"
              ? args.bidStatus
              : "accepted_by_shipper";

          const res = await baseQuery({
            url: appAPIs.updateCompanyBidStatusAPI.replace(
              ":companyBidRequestUniqueId",
              companyBidRequestUniqueId,
            ),
            method: "PATCH",
            body: {
              bidStatus: resolvedBidStatus,
            },
          });

          if (!res.error) {
            return {
              data: (res.data as AcceptDriverRequestResponse) || {
                message: "Company request accepted successfully",
              },
            };
          }

          const status = (res.error as any)?.status;

          // If the bid endpoint fails with 404 or 400 (e.g. not a company bid table entry)
          // and we have driver offer ids with journeyDecisionUniqueId, fall back to acceptDriverOfferAPI!
          const canFallback = Boolean(
            shipperRequestUniqueId &&
            driverRequestUniqueId &&
            journeyDecisionUniqueId
          );
          if (!canFallback || (status !== 404 && status !== 400 && status !== 405)) {
            return { error: res.error };
          }
        }

        if (!shipperRequestUniqueId || !driverRequestUniqueId || !journeyDecisionUniqueId) {
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
            ...(args.driverRequestId != null ? { driverRequestId: args.driverRequestId } : {}),
            ...(args.driverUserUniqueId ? { driverUserUniqueId: args.driverUserUniqueId } : {}),
            ...(args.driverPhoneNumber ? { driverPhoneNumber: args.driverPhoneNumber } : {}),
            ...(args.queueOrganizationUniqueId ? { queueOrganizationUniqueId: args.queueOrganizationUniqueId } : {}),
            ...(args.vehicleTypeUniqueId ? { vehicleTypeUniqueId: args.vehicleTypeUniqueId } : {}),
            ...(args.queueUniqueId ? { queueUniqueId: args.queueUniqueId } : {}),
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
      queryFn: async ({ shipperRequestUniqueId, page = 1, limit = 100 }, _queryApi, _extraOptions, baseQuery) => {
        const res = await baseQuery({
          url: appAPIs.getBidsForOrderAPI.replace(
            ":shipperRequestUniqueId",
            shipperRequestUniqueId,
          ),
          params: { page, limit },
        });

        if (res.error) {
          // If 404 or 400 (order has no bids or not on the bidding board), gracefully return empty list
          if (res.error.status === 404 || res.error.status === 400) {
            return {
              data: {
                message: "No bids found",
                data: [],
              } as GetBidsForOrderResponse,
            };
          }
          return { error: res.error };
        }

        return { data: res.data as GetBidsForOrderResponse };
      },
      providesTags: (_r, _e, { shipperRequestUniqueId }) => [
        { type: "DriverBids", id: shipperRequestUniqueId },
      ],
    }),

    /**
     * Bids submitted by transport companies for batch orders.
     * Backed by GET /api/company/bids.
     */
    getCompanyBids: builder.query<GetCompanyBidsResponse, GetCompanyBidsArgs>({
      queryFn: async (params, _queryApi, _extraOptions, baseQuery) => {
        const res = await baseQuery({
          url: appAPIs.companyBidsAPI,
          params: {
            limit: 100,
            ...params,
          },
        });
        if (res.error) {
          // Gracefully return empty array on 404/400 (e.g. no company bids submitted yet)
          const status = (res.error as any)?.status;
          if (status === 404 || status === 400) {
            return {
              data: {
                message: "No company bids found",
                data: [],
              } as GetCompanyBidsResponse,
            };
          }
          return { error: res.error };
        }
        const raw = (res.data ?? {}) as any;
        const rawList: any[] =
          (Array.isArray(raw) ? raw : null) ||
          (Array.isArray(raw?.data) ? raw.data : null) ||
          (Array.isArray(raw?.rows) ? raw.rows : null) ||
          (Array.isArray(raw?.items) ? raw.items : null) ||
          [];

        const normalized: CompanyBidItem[] = rawList.map((item: any) => {
          const offer =
            (Array.isArray(item.offers) && item.offers.length > 0 ? item.offers[0] : null) ||
            item.offer ||
            item.companyBidRequest ||
            item.companyBid ||
            item;

          const bidId =
            offer.companyBidRequestUniqueId ||
            offer.bidUniqueId ||
            offer.uniqueId ||
            item.companyBidRequestUniqueId ||
            item.bidUniqueId ||
            item.uniqueId ||
            item.id ||
            "";

          const batchObj =
            item.shipperRequestBatch ||
            item.batch ||
            item.shipperRequest ||
            offer.shipperRequestBatch ||
            offer.batch ||
            {};

          return {
            companyBidRequestUniqueId: String(bidId),
            shipperRequestBatchId:
              item.shipperRequestBatchId ||
              batchObj.shipperRequestBatchId ||
              item.batchUniqueId ||
              batchObj.batchUniqueId ||
              (item.batchId != null ? String(item.batchId) : null),
            shipperRequestBatchUniqueId:
              item.shipperRequestBatchUniqueId ||
              batchObj.shipperRequestBatchUniqueId ||
              item.batchUniqueId ||
              batchObj.batchUniqueId ||
              null,
            batchId: item.batchId ?? batchObj.batchId ?? null,
            companyUniqueId: item.companyUniqueId ?? offer.companyUniqueId ?? null,
            companyName: item.companyName ?? offer.companyName ?? null,
            proposedCostPerVehicle:
              offer.proposedCostPerVehicle ?? offer.costPerVehicle ?? item.proposedCostPerVehicle ?? null,
            proposedTotalCost: offer.proposedTotalCost ?? item.proposedTotalCost ?? null,
            bidStatus: offer.bidStatus || item.bidStatus || "submitted",
            journeyStatusId: item.journeyStatusId ?? offer.journeyStatusId ?? 1,
            vehicleTypeName: item.vehicleTypeName ?? offer.vehicleTypeName ?? null,
            companyPhone: item.companyPhone ?? offer.companyPhone ?? item.phoneNumber ?? offer.phoneNumber ?? null,
          };
        });

        return {
          data: {
            message: "Success",
            data: normalized,
          },
        };
      },
      providesTags: ["DriverBids"],
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