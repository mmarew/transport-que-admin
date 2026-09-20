import appAPIs from "@/utils/constant";
import type { QueueStatusResponse } from "@/types/queue";
import { api } from "./base";
import type {
  AcceptDriverRequestArgs,
  AcceptDriverRequestResponse,
  DispatchQueueArgs,
  DispatchQueueResponse,
  GetQueueStatusArgs,
  GetShipperRequestsResponse,
  ManualCheckinArgs,
  ManualCheckinResponse,
  OverrideEntryArgs,
  OverrideEntryResponse,
  RemoveEntryResponse,
  GetEntryHistoryResponse,
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

    acceptDriverRequest: builder.mutation<AcceptDriverRequestResponse, AcceptDriverRequestArgs>({
      queryFn: async (args, _queryApi, _extraOptions, baseQuery) => {
        try {
          const cleanShipperReqId = isUUID(args.shipperRequestUniqueId)
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
              const payload = fetchRes.data as GetShipperRequestsResponse | undefined;
              const items = payload?.data;
              if (Array.isArray(items)) {
                const targetItem = items.find(
                  (it) =>
                    it.shipperRequest?.shipperRequestUniqueId === cleanShipperReqId ||
                    it.shipperRequestUniqueId === cleanShipperReqId
                );
                if (targetItem) {
                  const decisions = Array.isArray(targetItem.decisions)
                    ? targetItem.decisions
                    : [];
                  const driverRequests = Array.isArray(targetItem.driverRequests)
                    ? targetItem.driverRequests
                    : [];

                  if (!cleanDriverReqId) {
                    const matchedDriver =
                      driverRequests.find(
                        (d) =>
                          (args.driverRequestId != null &&
                            d.driverRequestId === args.driverRequestId) ||
                          (args.driverUserUniqueId &&
                            d.userUniqueId === args.driverUserUniqueId) ||
                          (args.driverPhoneNumber &&
                            d.phoneNumber === args.driverPhoneNumber)
                      ) || (driverRequests.length === 1 ? driverRequests[0] : undefined);

                    if (matchedDriver && isUUID(matchedDriver.driverRequestUniqueId)) {
                      cleanDriverReqId = matchedDriver.driverRequestUniqueId;
                    }
                  }

                  if (!cleanDecisionId) {
                    const matchedDecision =
                      decisions.find(
                        (dec) =>
                          (args.driverRequestId != null &&
                            dec.driverRequestId === args.driverRequestId) ||
                          (cleanDriverReqId &&
                            dec.driverRequestUniqueId === cleanDriverReqId) ||
                          (args.driverUserUniqueId &&
                            dec.driverUserUniqueId === args.driverUserUniqueId)
                      ) || (decisions.length === 1 ? decisions[0] : undefined);

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

          // Primary: PUT /api/shipper/acceptDriverOffer
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
                data: (offerRes.data as AcceptDriverRequestResponse) || {
                  message: "Driver offer accepted successfully",
                },
              };
            }

            console.error("[acceptDriverRequest] PUT /api/shipper/acceptDriverOffer error:", offerRes.error);
            return { error: offerRes.error };
          }

          // If driver identifiers were provided but could not be resolved to valid UUIDs
          if (
            args.driverRequestId ||
            args.driverRequestUniqueId ||
            args.journeyDecisionUniqueId ||
            args.driverUserUniqueId
          ) {
            return {
              error: {
                status: "CUSTOM_ERROR",
                error:
                  "Missing required offer IDs (shipperRequestUniqueId, driverRequestUniqueId, journeyDecisionUniqueId) to accept offer.",
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
              data: (res.data as AcceptDriverRequestResponse) || {
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