import appAPIs from "@/utils/constant";
import { DEFAULT_VEHICLE_TYPES } from "@/utils/vehicleType";
import type { VehicleType } from "@/types/queue";
import { api } from "./base";
import type {
  VehicleDriverListArgs,
  VehicleDriverListResponse,
  VehicleTypeListResponse,
} from "./types";

export const { useListVehicleTypesQuery, useListVehicleDriversQuery } = api.injectEndpoints({
  endpoints: (builder) => ({
    listVehicleTypes: builder.query<VehicleTypeListResponse, void>({
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

    listVehicleDrivers: builder.query<VehicleDriverListResponse, VehicleDriverListArgs>({
      // No working driver-list endpoint exists on the backend.
      // CheckinModal derives driver data from queueStatus directly.
      queryFn: async () => ({ data: { message: "success", data: [] } }),
    }),
  }),
});