import type { TFunction } from "i18next";
import type {
  OrderDisplayItem,
  ShipperRequestPayloadItem,
} from "../../../components/orders/OrdersTypes";
import {
  extractOfferCost,
  lookupLocationFromCoordinates,
} from "../../../utils/formatters";
import {
  extractJourneyStatusId,
  getJourneyStatusName,
} from "../../../utils/journeyStatus";
import { parseBatchBids } from "./ordersBidParser";
import {
  extractLocationString,
  resolveEntryObject,
  resolvePlateNumber,
  resolveQueueNumber,
  resolveLoadingOrderNumber,
} from "./ordersFieldResolvers";
import {
  mapDriverRequests,
  resolveFallbackDriverRequests,
} from "./ordersDriverMapper";

export interface MapSingleItemParams {
  item: ShipperRequestPayloadItem;
  idx: number;
  batchUniqueIdToBatch: Map<string, any>;
  batchIdToBatch: Map<string, any>;
  getBidsForBatch: (b: any) => any[];
  activeOrg: any;
  targetOrgId?: string;
  t: TFunction;
}

/**
 * Maps a single raw shipper request item into a normalized UI OrderDisplayItem.
 */
export function mapSingleShipperRequestItem({
  item,
  idx,
  batchUniqueIdToBatch,
  batchIdToBatch,
  getBidsForBatch,
  activeOrg,
  targetOrgId,
  t,
}: MapSingleItemParams): OrderDisplayItem {
  const rawReq = (item.shipperRequest && typeof item.shipperRequest === "object" ? item.shipperRequest : null) as any;
  const req = rawReq || (item as any) || {};

  const compId =
    req.targetCompanyUniqueId ||
    (item as any).targetCompanyUniqueId ||
    (req as any).companyUniqueId ||
    (item as any).companyUniqueId;

  const safeReqUniqueId =
    (req as any).uniqueId && (req as any).uniqueId !== compId
      ? (req as any).uniqueId
      : (item as any).uniqueId && (item as any).uniqueId !== compId
      ? (item as any).uniqueId
      : "";

  const resolvedShipperRequestUniqueId =
    req.shipperRequestUniqueId ||
    (item as any).shipperRequestUniqueId ||
    (req as any).shipper_request_unique_id ||
    (item as any).shipper_request_unique_id ||
    safeReqUniqueId ||
    `real-${idx}`;

  const resolvedShipperRequestId =
    req.shipperRequestId ??
    (item as any).shipperRequestId ??
    (req as any).shipper_request_id ??
    (item as any).shipper_request_id ??
    null;

  // UUID form of the batch — present on company_target rows as
  // shipperRequest.shipperRequestBatchUniqueId. We track this separately
  // so step 2 can skip batch records already represented in step 1.
  const resolvedBatchUniqueId: string | null =
    req.shipperRequestBatchUniqueId ||
    (item as any).shipperRequestBatchUniqueId ||
    (req as any).batchUniqueId ||
    (item as any).batchUniqueId ||
    null;

  const resolvedBatchId =
    req.batchId ??
    (item as any).batchId ??
    (req as any).batch_id ??
    (item as any).batch_id ??
    (req as any).shipperRequestBatchId ??
    (item as any).shipperRequestBatchId ??
    (resolvedBatchUniqueId ? batchUniqueIdToBatch.get(resolvedBatchUniqueId)?.batchId : null) ??
    null;

  const matchedBatch =
    (resolvedBatchUniqueId ? batchUniqueIdToBatch.get(resolvedBatchUniqueId) : null) ||
    (resolvedBatchId != null ? batchIdToBatch.get(String(resolvedBatchId)) : null) ||
    null;

  const resolvedVehicleTypeUniqueId =
    req.vehicleTypeUniqueId ||
    (item as any).vehicleTypeUniqueId ||
    (req as any).vehicle_type_unique_id ||
    (item as any).vehicle_type_unique_id ||
    undefined;

  const resolvedQueueOrgId =
    req.queueOrganizationUniqueId ||
    (item as any).queueOrganizationUniqueId ||
    (req as any).queue_organization_unique_id ||
    (item as any).queue_organization_unique_id ||
    activeOrg?.queueOrganizationUniqueId ||
    targetOrgId ||
    "";

  const rawCost =
    extractOfferCost(req, item) ??
    req.shippingCost ??
    (item as any).shippingCost ??
    req.cost ??
    (item as any).cost ??
    25000;
  const costNum = Number(String(rawCost).replace(/[^0-9.]/g, "")) || 25000;

  const rawQuintal =
    req.shippableItemQtyInQuintal ??
    (item as any).shippableItemQtyInQuintal ??
    req.quintal ??
    (item as any).quintal ??
    5;
  const quintalNum = Number(String(rawQuintal).replace(/[^0-9.]/g, "")) || 5;

  const rawMode = req.requestMode || (item as any).requestMode || "";
  const mode =
    String(rawMode).toLowerCase().includes("group") ||
    String(rawMode).toLowerCase().includes("company")
      ? "Group"
      : "Individual";

  const hasReqId =
    resolvedShipperRequestId != null &&
    String(resolvedShipperRequestId).trim() !== "" &&
    !isNaN(Number(resolvedShipperRequestId));

  const hasBatchId =
    resolvedBatchId != null &&
    String(resolvedBatchId).trim() !== "" &&
    !isNaN(Number(resolvedBatchId));

  let displayId = "";
  if (hasBatchId && hasReqId) {
    displayId = `#${resolvedBatchId}/${resolvedShipperRequestId}`;
  } else if (hasBatchId) {
    displayId = `#${resolvedBatchId}`;
  } else if (hasReqId) {
    displayId = `#${resolvedShipperRequestId}`;
  } else {
    displayId = `#${idx + 1}`;
  }

  const fullId = displayId;
  const requestIdDisplay = hasReqId ? String(resolvedShipperRequestId) : String(idx + 1);
  const batchIdDisplay = hasBatchId ? String(resolvedBatchId) : null;
  const fullRequestId = String(resolvedShipperRequestId ?? (idx + 1));
  const fullBatchId = hasBatchId ? String(resolvedBatchId) : null;

  const rawDecisions: any[] =
    (Array.isArray((item as any).decisions) ? (item as any).decisions : []) ||
    (Array.isArray((req as any).decisions) ? (req as any).decisions : []) ||
    [];

  const rawDriverRequests =
    (Array.isArray(item.driverRequests) && item.driverRequests.length > 0
      ? item.driverRequests
      : null) ||
    (Array.isArray((req as any).driverRequests) &&
    (req as any).driverRequests.length > 0
      ? (req as any).driverRequests
      : null) ||
    rawDecisions ||
    [];

  let isBiddingApproved = Boolean(
    req.isBiddingApproved ||
    (req as any).is_bidding_approved ||
    (req as any).biddingApproved ||
    (item as any).isBiddingApproved ||
    (item as any).is_bidding_approved ||
    (item as any).biddingApproved
  );

  const originLat =
    req.originLatitude ??
    (item as any).originLatitude ??
    (activeOrg?.latitude != null ? activeOrg.latitude : null);
  const originLng =
    req.originLongitude ??
    (item as any).originLongitude ??
    (activeOrg?.longitude != null ? activeOrg.longitude : null);

  const entryObj = resolveEntryObject(item, req, rawDriverRequests, rawDecisions);

  const directDriverRequestQn =
    (Array.isArray(rawDriverRequests) &&
      rawDriverRequests.find(
        (d: any) =>
          d?.queueNumber != null ||
          d?.entry?.queueNumber != null ||
          d?.queue_number != null ||
          d?.entry?.queue_number != null ||
          d?.queueNo != null ||
          d?.entry?.queueNo != null
      )) ||
    null;
  const rawDriverQn =
    directDriverRequestQn?.queueNumber ??
    directDriverRequestQn?.entry?.queueNumber ??
    directDriverRequestQn?.queue_number ??
    directDriverRequestQn?.entry?.queue_number ??
    directDriverRequestQn?.queueNo ??
    directDriverRequestQn?.entry?.queueNo;

  const directDriverRequestLo =
    (Array.isArray(rawDriverRequests) &&
      rawDriverRequests.find(
        (d: any) =>
          d?.loadingOrderNumber != null ||
          d?.entry?.loadingOrderNumber != null ||
          d?.loading_order_number != null ||
          d?.entry?.loading_order_number != null ||
          d?.loadingOrderNo != null ||
          d?.entry?.loadingOrderNo != null ||
          d?.loadingOrderId != null ||
          d?.entry?.loadingOrderId != null
      )) ||
    null;
  const rawDriverLo =
    directDriverRequestLo?.loadingOrderNumber ??
    directDriverRequestLo?.entry?.loadingOrderNumber ??
    directDriverRequestLo?.loading_order_number ??
    directDriverRequestLo?.entry?.loading_order_number ??
    directDriverRequestLo?.loadingOrderNo ??
    directDriverRequestLo?.entry?.loadingOrderNo ??
    directDriverRequestLo?.loadingOrderId ??
    directDriverRequestLo?.entry?.loadingOrderId;

  const resolvedQueueNumber = resolveQueueNumber(entryObj, item, req, rawDriverQn);
  const resolvedLoadingOrderNumber = resolveLoadingOrderNumber(entryObj, item, req, rawDriverLo);

  const resolvedJourneyStatusId =
    extractJourneyStatusId((item as any).journey?.journeyStatusId) ??
    extractJourneyStatusId((req as any).journey?.journeyStatusId) ??
    extractJourneyStatusId(entryObj?.status) ??
    extractJourneyStatusId(req.journeyStatusId) ??
    extractJourneyStatusId((item as any).journeyStatusId) ??
    extractJourneyStatusId(req.statusId) ??
    extractJourneyStatusId((item as any).statusId) ??
    extractJourneyStatusId(req.journeyStatus) ??
    extractJourneyStatusId((item as any).journeyStatus) ??
    extractJourneyStatusId(req.status) ??
    extractJourneyStatusId((item as any).status) ??
    undefined;

  const isComplete =
    resolvedJourneyStatusId === 9 ||
    resolvedJourneyStatusId === 14 ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "complete" ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "completed" ||
    String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "delivered";

  const driverRequests = mapDriverRequests({
    rawDriverRequests,
    rawDecisions,
    entryObj,
    item,
    originLat,
    originLng,
    resolvedShipperRequestUniqueId,
  });

  const shipperName =
    req.fullName ||
    (item as any).fullName ||
    (req as any).shipperUser?.fullName ||
    (item as any).shipperUser?.fullName ||
    t("orders.defaultValuedShipper");

  const vehicleTypeName =
    req.vehicleTypeName ||
    (item as any).vehicleTypeName ||
    req.vehicleTypeOption ||
    (item as any).vehicleTypeOption ||
    t("orders.defaultHeavyTruck");

  const itemName =
    req.shippableItemName ||
    (item as any).shippableItemName ||
    req.item ||
    (item as any).item ||
    t("orders.defaultGeneralCargo");

  const matchedTotalVehicles =
    matchedBatch?.totalVehicles != null
      ? Number(matchedBatch.totalVehicles)
      : req.totalVehicles != null
      ? Number(req.totalVehicles)
      : (item as any).totalVehicles != null
      ? Number((item as any).totalVehicles)
      : undefined;

  const rawBatchCost =
    matchedBatch?.batchShippingCost ??
    (matchedBatch as any)?.totalShippingCost ??
    (matchedBatch as any)?.batchTotalCost ??
    (matchedBatch as any)?.batchTotalCost ??
    (req as any).batchTotalCost ??
    (item as any).batchTotalCost;

  const matchedBatchTotalCost =
    rawBatchCost != null
      ? Number(String(rawBatchCost).replace(/[^0-9.]/g, "")) || undefined
      : matchedBatch?.shippingCost != null && matchedTotalVehicles
      ? Number(String(matchedBatch.shippingCost).replace(/[^0-9.]/g, "")) * matchedTotalVehicles
      : undefined;

  const rawBatchQuintal =
    matchedBatch?.batchTotalQuintal ??
    (matchedBatch as any)?.totalQuintal ??
    (matchedBatch as any)?.batchTotalQuintal ??
    (req as any).batchTotalQuintal ??
    (item as any).batchTotalQuintal;

  const matchedBatchTotalQuintal =
    rawBatchQuintal != null
      ? Number(String(rawBatchQuintal).replace(/[^0-9.]/g, "")) || undefined
      : matchedBatch?.shippableItemQtyInQuintal != null && matchedTotalVehicles
      ? Number(String(matchedBatch.shippableItemQtyInQuintal).replace(/[^0-9.]/g, "")) * matchedTotalVehicles
      : undefined;

  const compBids = matchedBatch ? getBidsForBatch(matchedBatch) : [];
  const effectiveBatch = matchedBatch
    ? (compBids.length > 0 && !matchedBatch.companyBids
        ? {
            ...matchedBatch,
            companyBids: compBids,
          }
        : matchedBatch)
    : null;

  const itemCompBids = getBidsForBatch(item);
  const reqCompBids = getBidsForBatch(req);
  const directCompBids = [...itemCompBids, ...reqCompBids];
  const effectiveItem = directCompBids.length > 0
    ? {
        ...(item as any),
        companyBids: directCompBids,
      }
    : item;

  const batchBids = parseBatchBids(effectiveBatch as any, t);
  let finalDriverRequests = driverRequests.length > 0 ? driverRequests : batchBids;

  const hasIndividualDriverAccepted = Boolean(
    (item as any).journey?.driver?.fullName ||
    (req as any).journey?.driver?.fullName ||
    (item as any).driver?.fullName
  );

  const isCompanyTargetOrder = !hasIndividualDriverAccepted && Boolean(
    String(rawMode).toLowerCase().includes("company") ||
    req.targetCompanyUniqueId ||
    (item as any).targetCompanyUniqueId ||
    matchedBatch?.targetCompanyUniqueId
  );

  if (isCompanyTargetOrder) {
    if (finalDriverRequests.length === 0 && batchBids.length > 0) {
      finalDriverRequests = batchBids;
    } else if (finalDriverRequests.length === 0) {
      const itemBids = parseBatchBids(effectiveItem as any, t);
      if (itemBids.length > 0) {
        finalDriverRequests = itemBids;
      }
    }
  }

  if (finalDriverRequests.length > 0) {
    isBiddingApproved = true;
  }

  const resolvedPlateNumber = resolvePlateNumber(item, req, matchedBatch, rawDecisions);

  finalDriverRequests = resolveFallbackDriverRequests(finalDriverRequests, {
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
  });

  const originPlace =
    extractLocationString(
      req.originPlace,
      (item as any).originPlace,
      (req as any).origin_place,
      (item as any).origin_place,
      (req as any).originDescription,
      (item as any).originDescription,
      req.pickupLocationName,
      (item as any).pickupLocationName,
      (req as any).origin,
      (item as any).origin,
      (req as any).originLocation,
      (item as any).originLocation,
    ) ||
    (originLat && originLng ? lookupLocationFromCoordinates(originLat, originLng) : null) ||
    t("orders.defaultTerminal");

  const destPlace =
    extractLocationString(
      req.destinationPlace,
      (item as any).destinationPlace,
      (req as any).destination_place,
      (item as any).destination_place,
      (req as any).destinationDescription,
      (item as any).destinationDescription,
      req.dropoffLocationName,
      (item as any).dropoffLocationName,
      (req as any).destination,
      (item as any).destination,
      (req as any).destinationLocation,
      (item as any).destinationLocation,
    ) ||
    (req.destinationLatitude && req.destinationLongitude
      ? lookupLocationFromCoordinates(req.destinationLatitude, req.destinationLongitude)
      : null) ||
    t("orders.defaultDestination");

  return {
    id: resolvedShipperRequestUniqueId,
    shipperRequestUniqueId: resolvedShipperRequestUniqueId,
    shipperRequestId: resolvedShipperRequestId,
    batchId: resolvedBatchId,
    batchUniqueId: resolvedBatchUniqueId,
    requestIdDisplay,
    batchIdDisplay,
    fullRequestId,
    fullBatchId,
    displayId,
    fullId,
    shipper: shipperName,
    type: mode,
    vehicleType: vehicleTypeName,
    vehicleTypeUniqueId: resolvedVehicleTypeUniqueId,
    item: itemName,
    origin: originPlace,
    destination: destPlace,
    originLatitude: originLat,
    originLongitude: originLng,
    destinationLatitude: req.destinationLatitude ?? (item as any).destinationLatitude ?? null,
    destinationLongitude: req.destinationLongitude ?? (item as any).destinationLongitude ?? null,
    quintal: quintalNum,
    cost: costNum,
    status: isComplete ? "complete" : "ongoing",
    journeyStatusId: resolvedJourneyStatusId,
    journeyStatus: getJourneyStatusName(resolvedJourneyStatusId),
    phone: req.phoneNumber || (item as any).phoneNumber || (req as any).shipperUser?.phoneNumber || "",
    createdAt: req.shipperRequestCreatedAt || (item as any).shipperRequestCreatedAt || "",
    isBiddingApproved,
    driverRequests: finalDriverRequests,
    decisions: rawDecisions,
    queueOrganizationUniqueId: resolvedQueueOrgId,
    queueNumber: resolvedQueueNumber,
    loadingOrderNumber: resolvedLoadingOrderNumber,
    totalVehicles: matchedTotalVehicles,
    batchTotalCost: matchedBatchTotalCost,
    batchTotalQuintal: matchedBatchTotalQuintal,
    plateNumber:
      finalDriverRequests.find((d: any) => d?.plateNumber)?.plateNumber ??
      resolvedPlateNumber,
    rawItem: item,
  };
}
