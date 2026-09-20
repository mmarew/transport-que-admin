import { useMemo, useEffect } from "react";
import {
  useGetQueueStatusQuery,
  useListVehicleTypesQuery,
} from "../../../lib/redux/api";
import { normalizeQueueEntry } from "../../../utils/formatters";
import { resolveVehicleName } from "../../../utils/vehicleType";
import type { CheckinDriverItem } from "./types";

interface UseCheckinDataOptions {
  queueOrganizationUniqueId: string;
  searchQuery: string;
  selectedVehicleDriverUniqueId?: string;
  inputQueueNumber?: number;
  onInitialDriverSelect?: (id: string) => void;
}

export function useCheckinData({
  queueOrganizationUniqueId,
  searchQuery,
  selectedVehicleDriverUniqueId,
  inputQueueNumber,
  onInitialDriverSelect,
}: UseCheckinDataOptions) {
  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId },
    { skip: !queueOrganizationUniqueId },
  );

  const driversList = useMemo(() => {
    if (!queueStatusData?.data?.queues) return [];
    const seen = new Set<string>();
    const result: CheckinDriverItem[] = [];
    Object.values(queueStatusData.data.queues)
      .flat()
      .forEach((rawEntry) => {
        const entry = normalizeQueueEntry(rawEntry);
        if (
          entry.vehicleDriverUniqueId &&
          !seen.has(entry.vehicleDriverUniqueId)
        ) {
          seen.add(entry.vehicleDriverUniqueId);
          result.push({
            vehicleDriverUniqueId: entry.vehicleDriverUniqueId,
            vehicleTypeUniqueId: entry.vehicleTypeUniqueId || "",
            driverName: entry.driverName || "",
            driverPhoneNumber: entry.driverPhoneNumber || "",
            vehicleTypeName: entry.vehicleTypeName || "",
          });
        }
      });
    return result;
  }, [queueStatusData]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return driversList;
    const q = searchQuery.toLowerCase().trim();
    return driversList.filter(
      (d) =>
        d.driverName?.toLowerCase().includes(q) ||
        d.driverPhoneNumber?.includes(q) ||
        d.vehicleDriverUniqueId?.toLowerCase().includes(q) ||
        d.vehicleTypeName?.toLowerCase().includes(q),
    );
  }, [driversList, searchQuery]);

  const selectedDriver = useMemo(() => {
    if (!selectedVehicleDriverUniqueId) {
      return driversList[0] || null;
    }
    return (
      driversList.find(
        (d) => d.vehicleDriverUniqueId === selectedVehicleDriverUniqueId,
      ) || null
    );
  }, [selectedVehicleDriverUniqueId, driversList]);

  useEffect(() => {
    if (
      driversList.length > 0 &&
      !selectedVehicleDriverUniqueId &&
      onInitialDriverSelect
    ) {
      onInitialDriverSelect(driversList[0].vehicleDriverUniqueId);
    }
  }, [driversList, selectedVehicleDriverUniqueId, onInitialDriverSelect]);

  const estimatedPosition = useMemo(() => {
    if (inputQueueNumber && Number(inputQueueNumber) > 0) {
      return Number(inputQueueNumber);
    }
    if (queueStatusData?.data?.queues) {
      const allQueues = Object.values(queueStatusData.data.queues);
      const totalWaiting = allQueues.flat().length;
      return totalWaiting + 1;
    }
    return 1;
  }, [inputQueueNumber, queueStatusData]);

  const { data: vtData } = useListVehicleTypesQuery();
  const vtList = vtData?.data || [];
  const targetVehicleTypeName = resolveVehicleName(
    selectedDriver?.vehicleTypeUniqueId,
    selectedDriver?.vehicleTypeName,
    vtList,
  );

  return {
    driversList,
    filteredDrivers,
    selectedDriver,
    estimatedPosition,
    targetVehicleTypeName,
  };
}
