import appAPIs from "@/utils/constant";
import { DEFAULT_VEHICLE_TYPES, registerDynamicVehicleTypes } from "@/utils/vehicleType";
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
            registerDynamicVehicleTypes(DEFAULT_VEHICLE_TYPES as unknown as VehicleType[]);
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
          registerDynamicVehicleTypes(list);
          return {
            data: {
              message: payload?.message || "success",
              data: list.length > 0 ? list : (DEFAULT_VEHICLE_TYPES as unknown as VehicleType[]),
            },
          };
        } catch {
          registerDynamicVehicleTypes(DEFAULT_VEHICLE_TYPES as unknown as VehicleType[]);
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

    /**
     * Driver directory for manual check-in — GET /api/queue/driverDirectory.
     *
     * This used to be a stub that unconditionally returned [], so CheckinModal
     * could only ever offer drivers already present in the current queue
     * payload and staff could not manually add anyone who had never queued at
     * this location. The backend endpoint now exists and returns active
     * driver/vehicle assignments scoped to the caller's queue org.
     *
     * Restricted to queue org staff (role 11/12) with an active membership.
     */
    listVehicleDrivers: builder.query<
      VehicleDriverListResponse,
      VehicleDriverListArgs
    >({
      query: ({
        queueOrganizationUniqueId,
        phone,
        name,
        vehicleTypeUniqueId,
        page = 1,
        limit = 20,
      }) => ({
        url: appAPIs.driverDirectoryAPI,
        params: {
          queueOrganizationUniqueId,
          ...(phone ? { phone } : {}),
          ...(name ? { name } : {}),
          ...(vehicleTypeUniqueId ? { vehicleTypeUniqueId } : {}),
          page,
          limit,
        },
      }),
      providesTags: ["DriverDirectory"],
    }),
  }),
});