import type { TFunction } from "i18next";
import {
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "../../../utils/formatters";
import { getJourneyStatusName } from "../../../utils/journeyStatus";

export interface MapDriverRequestsParams {
  rawDriverRequests: any[];
  rawDecisions: any[];
  entryObj: any;
  item: any;
  originLat: number | null;
  originLng: number | null;
  resolvedShipperRequestUniqueId: string;
}

/**
 * Maps raw driver request objects into normalized driver bids.
 */
export function mapDriverRequests({
  rawDriverRequests,
  rawDecisions,
  entryObj,
  item,
  originLat,
  originLng,
  resolvedShipperRequestUniqueId,
}: MapDriverRequestsParams): any[] {
  return rawDriverRequests.map((d: any) => {
    const dLat = d.latitude != null ? Number(d.latitude) : null;
    const dLng = d.longitude != null ? Number(d.longitude) : null;
    const resolvedLoc =
      d.currentPlace ??
      d.location ??
      d.locationName ??
      d.currentLocation ??
      d.city ??
      d.terminalName ??
      (dLat && dLng ? lookupLocationFromCoordinates(dLat, dLng) : null);
    const dist = calculateDistanceKm(originLat, originLng, dLat, dLng);

    const driverCost = extractOfferCost(d, item);

    const matchingDecision =
      rawDecisions.find(
        (dec: any) =>
          (dec.driverRequestId != null && dec.driverRequestId === d.driverRequestId) ||
          (dec.driverRequestUniqueId && dec.driverRequestUniqueId === d.driverRequestUniqueId) ||
          (dec.driverUserUniqueId && dec.driverUserUniqueId === d.userUniqueId)
      ) || (rawDecisions.length === 1 ? rawDecisions[0] : null);

    const resolvedJourneyDecisionUniqueId =
      d.journeyDecisionUniqueId ||
      matchingDecision?.journeyDecisionUniqueId ||
      null;

    const driverEntry = d.entry || matchingDecision?.entry || entryObj || null;

    return {
      ...d,
      driverRequestId: d.driverRequestId,
      driverRequestUniqueId: d.driverRequestUniqueId || d.bidUniqueId || d.userUniqueId,
      companyBidRequestUniqueId:
        d.companyBidRequestUniqueId ??
        d.driverBidUniqueId ??
        (d.companyBidRequest && d.companyBidRequest.companyBidRequestUniqueId) ??
        (d.companyBid && d.companyBid.companyBidRequestUniqueId) ??
        null,
      driverBidUniqueId: d.driverBidUniqueId ?? d.companyBidRequestUniqueId ?? null,
      userUniqueId:
        d.userUniqueId ||
        d.driverUserUniqueId ||
        driverEntry?.targetedShipperUserUUID ||
        driverEntry?.vehicleDriverUniqueId,
      journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
      fullName:
        d.fullName ??
        d.driverName ??
        d.name ??
        driverEntry?.fullName ??
        null,
      phoneNumber:
        d.phoneNumber ??
        d.driverPhoneNumber ??
        driverEntry?.phoneNumber ??
        null,
      journeyStatusId:
        d.journeyStatusId ??
        d.statusId ??
        driverEntry?.status ??
        null,
      journeyStatus: d.journeyStatus ?? null,
      queueNumber:
        d.queueNumber ??
        driverEntry?.queueNumber ??
        null,
      loadingOrderNumber:
        d.loadingOrderNumber ??
        driverEntry?.loadingOrderNumber ??
        null,
      queueUniqueId:
        d.queueUniqueId ??
        driverEntry?.queueUniqueId ??
        null,
      vehicleDriverUniqueId:
        d.vehicleDriverUniqueId ??
        driverEntry?.vehicleDriverUniqueId ??
        null,
      shipperRequestUniqueId:
        d.shipperRequestUniqueId ||
        d.shipper_request_unique_id ||
        resolvedShipperRequestUniqueId,
      offerCost:
        driverCost ??
        d.offerCost ??
        d.proposedCost ??
        d.bidAmount ??
        d.proposedCostPerVehicle ??
        d.bidCost ??
        d.biddingCost ??
        d.cost ??
        d.price ??
        null,
      proposedCost:
        driverCost ??
        d.proposedCost ??
        d.proposedCostPerVehicle ??
        d.offerCost ??
        d.bidAmount ??
        null,
      bidAmount:
        driverCost ??
        d.bidAmount ??
        d.proposedCost ??
        d.proposedCostPerVehicle ??
        d.offerCost ??
        null,
      vehicleTypeName: d.vehicleTypeName ?? d.vehicleType ?? null,
      plateNumber:
        d.licensePlate ??
        d.license_plate ??
        d.plateNumber ??
        d.plate_number ??
        d.vehiclePlateNumber ??
        d.vehicle_plate_number ??
        d.vehiclePlate ??
        d.vehicle_plate ??
        d.plate ??
        d.vehicleOfDriver?.licensePlate ??
        d.vehicleOfDriver?.license_plate ??
        d.vehicleOfDriver?.plateNumber ??
        d.vehicleOfDriver?.plate_number ??
        d.vehicle?.licensePlate ??
        d.vehicle?.license_plate ??
        d.vehicle?.plateNumber ??
        d.vehicle?.plate_number ??
        driverEntry?.licensePlate ??
        driverEntry?.license_plate ??
        driverEntry?.plateNumber ??
        driverEntry?.plate_number ??
        matchingDecision?.licensePlate ??
        matchingDecision?.license_plate ??
        matchingDecision?.plateNumber ??
        matchingDecision?.plate_number ??
        matchingDecision?.vehicleOfDriver?.licensePlate ??
        matchingDecision?.vehicle?.licensePlate ??
        (item as any).journey?.licensePlate ??
        (item as any).journey?.license_plate ??
        (item as any).journey?.plateNumber ??
        (item as any).journey?.plate_number ??
        (item as any).journey?.vehicle?.licensePlate ??
        (item as any).journey?.vehicle?.license_plate ??
        (item as any).journey?.vehicle?.plateNumber ??
        (item as any).journey?.vehicleOfDriver?.licensePlate ??
        (item as any).licensePlate ??
        (item as any).license_plate ??
        (item as any).plateNumber ??
        (item as any).plate_number ??
        null,
      latitude: dLat,
      longitude: dLng,
      currentPlace: resolvedLoc,
      distanceKm: dist,
      rawDriver: d,
      rawItem: item,
    };
  });
}

export interface ResolveFallbackDriverParams {
  item: any;
  req: any;
  matchedBatch: any;
  rawDecisions: any[];
  entryObj: any;
  resolvedJourneyStatusId?: number;
  isCompanyTargetOrder: boolean;
  vehicleTypeName: string;
  resolvedPlateNumber: string | null;
  mode: string;
  matchedBatchTotalCost?: number;
  costNum: number;
  resolvedShipperRequestUniqueId: string;
  t?: TFunction;
}

/**
 * Resolves fallback driver requests when no direct driver requests or batch bids are present,
 * for accepted journey statuses or company proposals.
 */
export function resolveFallbackDriverRequests(
  currentFinalRequests: any[],
  params: ResolveFallbackDriverParams
): any[] {
  if (currentFinalRequests.length > 0) {
    return currentFinalRequests;
  }

  const {
    item,
    req,
    matchedBatch,
    rawDecisions,
    entryObj,
    resolvedJourneyStatusId,
    isCompanyTargetOrder,
    vehicleTypeName,
    resolvedPlateNumber,
    mode,
    matchedBatchTotalCost,
    costNum,
    resolvedShipperRequestUniqueId,
    t,
  } = params;

  if (
    resolvedJourneyStatusId === 4 ||
    (resolvedJourneyStatusId != null && resolvedJourneyStatusId >= 3 && resolvedJourneyStatusId <= 9) ||
    resolvedJourneyStatusId === 14 ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "accepted" ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "acceptedbyshipper" ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "acceptedbydriver"
  ) {
    const resolvedDriverName =
      (item as any).journey?.driver?.fullName ??
      (item as any).journey?.driverName ??
      (req as any).journey?.driver?.fullName ??
      (req as any).journey?.driverName ??
      (item as any).driver?.fullName ??
      (item as any).driverName ??
      (req as any).driverName ??
      (req as any).driver?.fullName ??
      entryObj?.driverName ??
      entryObj?.fullName ??
      (Array.isArray(rawDecisions) && rawDecisions[0]?.driverName) ??
      (Array.isArray(rawDecisions) && rawDecisions[0]?.fullName) ??
      null;

    const resolvedDriverPhone =
      (item as any).journey?.driver?.phoneNumber ??
      (item as any).journey?.phoneNumber ??
      (req as any).journey?.driver?.phoneNumber ??
      (req as any).journey?.phoneNumber ??
      (item as any).driver?.phoneNumber ??
      (item as any).driverPhoneNumber ??
      (req as any).driverPhoneNumber ??
      entryObj?.driverPhoneNumber ??
      entryObj?.phoneNumber ??
      (Array.isArray(rawDecisions) && rawDecisions[0]?.driverPhoneNumber) ??
      (Array.isArray(rawDecisions) && rawDecisions[0]?.phoneNumber) ??
      null;

    const resolvedDriverVehicleType =
      (item as any).journey?.vehicle?.vehicleTypeName ??
      (item as any).journey?.vehicleType ??
      entryObj?.vehicleTypeName ??
      entryObj?.vehicleType ??
      vehicleTypeName;

    const companyOrDriverName =
      resolvedDriverName ||
      (isCompanyTargetOrder
        ? (matchedBatch?.targetCompanyName || (req as any).targetCompanyName || (t ? t("orders.acceptedCompany", "Accepted Transport Company") : "Accepted Transport Company"))
        : (t ? t("orders.acceptedDriver", "Accepted Driver") : "Accepted Driver"));

    const compId = isCompanyTargetOrder
      ? ((req as any).targetCompanyUniqueId || (item as any).targetCompanyUniqueId || matchedBatch?.targetCompanyUniqueId)
      : null;

    const rawBidId = isCompanyTargetOrder
      ? (matchedBatch?.companyBidRequestUniqueId ?? matchedBatch?.bidUniqueId ?? (req as any).companyBidRequestUniqueId ?? (item as any).companyBidRequestUniqueId ?? undefined)
      : undefined;

    const safeBidId = rawBidId && rawBidId !== compId ? rawBidId : null;

    const targetUid =
      (item as any).journey?.journeyUniqueId ||
      (req as any).journey?.journeyUniqueId ||
      resolvedShipperRequestUniqueId ||
      "accepted-driver";

    return [
      {
        driverRequestId: (req as any).driverRequestId || (item as any).driverRequestId || 1,
        driverRequestUniqueId: safeBidId || targetUid,
        companyBidRequestUniqueId: isCompanyTargetOrder ? safeBidId : null,
        driverBidUniqueId: isCompanyTargetOrder ? null : (safeBidId || targetUid),
        isCompany: isCompanyTargetOrder,
        fullName: companyOrDriverName,
        phoneNumber: resolvedDriverPhone || (isCompanyTargetOrder ? ((req as any).targetCompanyPhone || (item as any).targetCompanyPhone) : null),
        journeyStatusId: resolvedJourneyStatusId ?? 4,
        journeyStatus: getJourneyStatusName(resolvedJourneyStatusId ?? 4),
        bidStatus: "selected",
        offerCost: (mode === "Group" && matchedBatchTotalCost) ? matchedBatchTotalCost : costNum,
        vehicleTypeName: resolvedDriverVehicleType,
        plateNumber: resolvedPlateNumber,
        rawDriver: (item as any).journey || (req as any).journey || null,
        rawItem: item,
      },
    ];
  }

  if (isCompanyTargetOrder) {
    const compId =
      (req as any).targetCompanyUniqueId ||
      (item as any).targetCompanyUniqueId ||
      matchedBatch?.targetCompanyUniqueId;

    const rawBidId =
      matchedBatch?.companyBidRequestUniqueId ??
      matchedBatch?.bidUniqueId ??
      (req as any).companyBidRequestUniqueId ??
      (item as any).companyBidRequestUniqueId ??
      undefined;

    const safeBidId = rawBidId && rawBidId !== compId ? rawBidId : null;

    if (
      Boolean(safeBidId) &&
      ((req as any).targetCompanyName ||
        matchedBatch?.targetCompanyName ||
        Boolean(compId))
    ) {
      const companyOrDriverName =
        matchedBatch?.targetCompanyName ||
        (req as any).targetCompanyName ||
        (item as any).targetCompanyName ||
        (req as any).companyName ||
        (item as any).companyName ||
        (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal");

      const targetUid = compId || "company-target";
      const isSubmitted = Boolean(safeBidId);
      const resolvedStatusId = isSubmitted ? 1 : 2;
      const resolvedJourneyStatus = isSubmitted ? "submitted" : "requested";
      const resolvedBidStatus = isSubmitted ? "submitted" : "requested";
      const effectiveBidId = safeBidId || `company-proposal-${(req as any).batchId || matchedBatch?.batchId || 1}`;

      return [
        {
          driverRequestId: 1,
          driverRequestUniqueId: effectiveBidId,
          companyBidRequestUniqueId: safeBidId,
          driverBidUniqueId: safeBidId,
          isCompany: true,
          userUniqueId: targetUid,
          fullName: companyOrDriverName,
          phoneNumber:
            (req as any).targetCompanyPhone ||
            (item as any).targetCompanyPhone ||
            matchedBatch?.shipperPhone ||
            null,
          journeyStatusId: resolvedStatusId,
          journeyStatus: resolvedJourneyStatus,
          bidStatus: resolvedBidStatus,
          offerCost: (mode === "Group" && matchedBatchTotalCost) ? matchedBatchTotalCost : costNum,
          vehicleTypeName: vehicleTypeName,
        },
      ];
    }
  }

  return [];
}
