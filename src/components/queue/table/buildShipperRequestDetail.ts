import type { DriverQueueEntry } from "../../../types/queue";
import type { ShipperRequestDetail } from "../ShipperRequestsModal";

export function buildShipperRequestDetail(
  entry: DriverQueueEntry,
): ShipperRequestDetail | null {
  const own = entry.shipperRequest;
  if (!own?.shipperRequestUniqueId) return null;

  return {
    shipperRequestUniqueId: own.shipperRequestUniqueId,
    fullName: own.fullName ?? null,
    phoneNumber: own.phoneNumber ?? undefined,
    requestMode: own.requestMode ?? null,
    vehicleTypeName: own.vehicleTypeName ?? null,
    vehicleTypeUniqueId: (own as any).vehicleTypeUniqueId || null,
    shippableItemName: own.shippableItemName ?? null,
    shippableItemQtyInQuintal: own.shippableItemQtyInQuintal ?? null,
    shippingCost: own.shippingCost ?? null,
    originPlace: own.originPlace ?? null,
    destinationPlace: own.destinationPlace ?? null,
    shippingDate: own.shippingDate ?? null,
    deliveryDate: own.deliveryDate ?? null,
    shipperRequestCreatedAt: own.shipperRequestCreatedAt ?? null,
    journeyStatusId: own.journeyStatusId ?? null,
    isBiddingApproved: Boolean((own as any).isBiddingApproved),
    driverRequests: ((own as any).driverRequests || []).map((d: any) => {
      const ownDecisions: any[] =
        (own as any).decisions || (entry as any).decisions || [];
      const matchingDecision =
        ownDecisions.find(
          (dec: any) =>
            (dec.driverRequestId != null &&
              dec.driverRequestId === d.driverRequestId) ||
            (dec.driverRequestUniqueId &&
              dec.driverRequestUniqueId === d.driverRequestUniqueId) ||
            (dec.driverUserUniqueId &&
              dec.driverUserUniqueId === d.userUniqueId),
        ) || (ownDecisions.length === 1 ? ownDecisions[0] : null);

      return {
        ...d,
        journeyDecisionUniqueId:
          d.journeyDecisionUniqueId ||
          matchingDecision?.journeyDecisionUniqueId ||
          null,
        offerCost:
          d.offerCost ??
          d.proposedCost ??
          d.bidAmount ??
          d.bidCost ??
          d.biddingCost ??
          d.cost ??
          d.price ??
          null,
        proposedCost: d.proposedCost ?? d.offerCost ?? d.bidAmount ?? null,
        bidAmount: d.bidAmount ?? d.proposedCost ?? d.offerCost ?? null,
        vehicleTypeName: d.vehicleTypeName ?? d.vehicleType ?? null,
        plateNumber: d.plateNumber ?? d.vehiclePlateNumber ?? null,
      };
    }),
  };
}
