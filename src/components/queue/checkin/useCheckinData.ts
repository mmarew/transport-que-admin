import { useMemo, useEffect } from "react";
import {
  useGetQueueStatusQuery,
  useListVehicleTypesQuery,
  useListVehicleDriversQuery,
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

  // Drivers already in today's queue — derived from the live payload. Kept as
  // the fallback so manual check-in still works if the directory is
  // unreachable, and as the source of the `isInQueue` flag below.
  const queueDrivers = useMemo(() => {
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
            isInQueue: true,
          });
        }
      });
    return result;
  }, [queueStatusData]);

  const { data: vtData } = useListVehicleTypesQuery();
  // Stable identity: `vtData?.data || []` allocates a new array on every render,
  // which invalidates the directory memo below on every render.
  const vtList = useMemo(() => vtData?.data || [], [vtData?.data]);

  // The directory needs a search term, so only query once the operator has
  // typed something. Before that the picker shows the queue itself.
  const searchTerm = searchQuery.trim();
  const { data: directoryData, isFetching: isSearchingDirectory } =
    useListVehicleDriversQuery(
      {
        queueOrganizationUniqueId,
        phone: /^[\d\s+-]+$/.test(searchTerm) ? searchTerm : undefined,
        name: /^[\d\s+-]+$/.test(searchTerm) ? undefined : searchTerm,
      },
      {
        skip: !queueOrganizationUniqueId || searchTerm.length < 2,
      },
    );

  const directoryDrivers: CheckinDriverItem[] = useMemo(() => {
    const rows = directoryData?.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      vehicleDriverUniqueId: row.vehicleDriverUniqueId,
      vehicleTypeUniqueId: row.vehicleTypeUniqueId || "",
      driverName: row.fullName || "",
      driverPhoneNumber: row.phoneNumber || "",
      // The directory returns vehicleTypeUniqueId only; resolve the display
      // name against the real vehicle-type list rather than leaking the id.
      vehicleTypeName: resolveVehicleName(row.vehicleTypeUniqueId, undefined, vtList),
      isInQueue: false,
    }));
  }, [directoryData, vtList]);

  /**
   * Directory results win once a search has run, because they are the only
   * source that includes drivers who have never queued here. Queue entries are
   * merged in so an operator still sees who is already waiting, and so
   * `isInQueue` is accurate for directory hits.
   */
  const driversList = useMemo(() => {
    const inQueueIds = new Set(
      queueDrivers.map((d) => d.vehicleDriverUniqueId),
    );
    const merged = [
      ...queueDrivers,
      ...directoryDrivers.filter(
        (d) => !inQueueIds.has(d.vehicleDriverUniqueId),
      ),
    ];
    return merged;
  }, [queueDrivers, directoryDrivers]);

  // The directory already filtered server-side, so re-filtering client-side
  // would only discard rows the backend legitimately returned (a partial name
  // match, for instance). Keep the local filter only for the queue fallback.
  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return driversList;
    if (directoryDrivers.length > 0) return driversList;
    const q = searchTerm.toLowerCase();
    return driversList.filter(
      (d) =>
        d.driverName?.toLowerCase().includes(q) ||
        d.driverPhoneNumber?.includes(q) ||
        d.vehicleDriverUniqueId?.toLowerCase().includes(q) ||
        d.vehicleTypeName?.toLowerCase().includes(q),
    );
  }, [driversList, searchTerm, directoryDrivers.length]);

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

  const targetVehicleTypeName = resolveVehicleName(
    selectedDriver?.vehicleTypeUniqueId,
    selectedDriver?.vehicleTypeName,
    vtList,
  );

  return {
    driversList,
    filteredDrivers,
    isSearchingDirectory,
    selectedDriver,
    estimatedPosition,
    targetVehicleTypeName,
  };
}
