import { useMemo } from "react";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";
import { calculateDistanceKm, extractOfferCost } from "@/utils/formatters";
import { extractJourneyStatusId } from "@/utils/journeyStatus";
import type { BidsSortOption } from "./BidsToolbar";

export interface UseDriverBidsFilterArgs {
  driverRequests: ShipperRequestDriverInfo[];
  order: OrderDisplayItem;
  searchTerm: string;
  sortBy: BidsSortOption;
  displayLimit: number;
  acceptedDriverIds: Set<string>;
}

export function useDriverBidsFilter({
  driverRequests,
  order,
  searchTerm,
  sortBy,
  displayLimit,
  acceptedDriverIds,
}: UseDriverBidsFilterArgs) {
  const filteredAndSortedDrivers = useMemo(() => {
    let list = [...driverRequests];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((d) => {
        const name = (d.fullName || "").toLowerCase();
        const phone = (d.phoneNumber || "").toLowerCase();
        const veh = (d.vehicleTypeName || "").toLowerCase();
        const plate = (d.plateNumber || "").toLowerCase();
        const place = (d.currentPlace || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          veh.includes(q) ||
          plate.includes(q) ||
          place.includes(q)
        );
      });
    }

    if (sortBy === "nearest") {
      list.sort((a, b) => {
        const distA =
          a.distanceKm ??
          calculateDistanceKm(
            order.originLatitude,
            order.originLongitude,
            a.latitude,
            a.longitude,
          ) ??
          999999;
        const distB =
          b.distanceKm ??
          calculateDistanceKm(
            order.originLatitude,
            order.originLongitude,
            b.latitude,
            b.longitude,
          ) ??
          999999;
        return distA - distB;
      });
    } else if (sortBy === "lowest-price") {
      list.sort((a, b) => {
        const costA = Number(
          a.offerCost ??
            a.proposedCost ??
            a.bidAmount ??
            extractOfferCost(a) ??
            order.cost,
        );
        const costB = Number(
          b.offerCost ??
            b.proposedCost ??
            b.bidAmount ??
            extractOfferCost(b) ??
            order.cost,
        );
        return costA - costB;
      });
    } else if (sortBy === "highest-price") {
      list.sort((a, b) => {
        const costA = Number(
          a.offerCost ??
            a.proposedCost ??
            a.bidAmount ??
            extractOfferCost(a) ??
            order.cost,
        );
        const costB = Number(
          b.offerCost ??
            b.proposedCost ??
            b.bidAmount ??
            extractOfferCost(b) ??
            order.cost,
        );
        return costB - costA;
      });
    } else if (sortBy === "name") {
      list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }

    return list;
  }, [
    driverRequests,
    searchTerm,
    sortBy,
    order.cost,
    order.originLatitude,
    order.originLongitude,
  ]);

  const visibleDrivers = useMemo(() => {
    if (displayLimit <= 0) return filteredAndSortedDrivers;
    return filteredAndSortedDrivers.slice(0, displayLimit);
  }, [filteredAndSortedDrivers, displayLimit]);

  const hasAnyAcceptedDriver = useMemo(() => {
    return (
      acceptedDriverIds.size > 0 ||
      driverRequests.some((d) => {
        const sid = extractJourneyStatusId(
          d.journeyStatusId ?? d.journeyStatus ?? (d as any).status,
        );
        return (
          (typeof sid === "number" && sid >= 4 && sid <= 9) ||
          d.journeyStatus === "acceptedByShipper"
        );
      })
    );
  }, [acceptedDriverIds, driverRequests]);

  return {
    filteredAndSortedDrivers,
    visibleDrivers,
    hasAnyAcceptedDriver,
  };
}
