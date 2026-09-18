import appAPIs from "@/utils/constant";
import type { CreateOrderPayload } from "@/types/queue";
import { api } from "./base";
import type {
  CreateOrderResponse,
  GetShipperRequestBatchesArgs,
  GetShipperRequestBatchesResponse,
  GetShipperRequestsArgs,
  GetShipperRequestsResponse,
} from "./types";

export const {
  useCreateQueueOrderMutation,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
} = api.injectEndpoints({
  endpoints: (builder) => ({
    createQueueOrder: builder.mutation<CreateOrderResponse, CreateOrderPayload>({
      query: (body) => ({ url: appAPIs.createOrderAPI, method: "POST", body }),
      invalidatesTags: ["QueueStatus", "DriverQueue", "ShipperRequests"],
    }),

    getShipperRequests: builder.query<GetShipperRequestsResponse, GetShipperRequestsArgs>({
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

    getShipperRequestBatches: builder.query<
      GetShipperRequestBatchesResponse,
      GetShipperRequestBatchesArgs
    >({
      query: (params) => ({
        url: appAPIs.getShipperRequestBatchAPI,
        params: {
          requestMode: "company_target",
          includeBids: true,
          limit: 100,
          ...params,
        },
      }),
      providesTags: ["ShipperRequests"],
    }),
  }),
});