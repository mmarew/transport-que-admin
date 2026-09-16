import type { TFunction } from "i18next";
import {
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "../../utils/formatters";
import { extractJourneyStatusId, getJourneyStatusName } from "../../utils/journeyStatus";
import type {
  OrderDisplayItem,
  ShipperRequestPayloadItem,
} from "../../components/orders/OrdersTypes";

export interface MapBackendOrdersParams {
  ordersData: unknown;
  batchesData: unknown;
  deletedIds: Set<string>;
  editedOrders: Record<string, OrderDisplayItem>;
  activeOrg: any;
  targetOrgId?: string;
  t: TFunction;
}

/**
 * Normalizes and maps raw backend shipper requests and company target batches
 * into unified UI OrderDisplayItem objects.
 */
export function mapBackendOrdersToDisplayItems({
  ordersData,
  batchesData,
  deletedIds,
  editedOrders,
  activeOrg,
  targetOrgId,
  t,
}: MapBackendOrdersParams): OrderDisplayItem[] {
  const rawList = (ordersData as any)?.data as unknown as ShipperRequestPayloadItem[] | undefined;
  let baseList: OrderDisplayItem[] = [];

  // 1. Process standard individual and group shipper requests
  if (Array.isArray(rawList)) {
    baseList = rawList.map((item, idx) => {
      const rawReq = (item.shipperRequest && typeof item.shipperRequest === "object" ? item.shipperRequest : null) as any;
      const req = rawReq || (item as any) || {};

      const resolvedShipperRequestUniqueId =
        req.shipperRequestUniqueId ||
        (item as any).shipperRequestUniqueId ||
        (req as any).shipper_request_unique_id ||
        (item as any).shipper_request_unique_id ||
        (req as any).uniqueId ||
        (item as any).uniqueId ||
        `real-${idx}`;

      const resolvedShipperRequestId =
        req.shipperRequestId ??
        (item as any).shipperRequestId ??
        (req as any).shipper_request_id ??
        (item as any).shipper_request_id ??
        null;

      const resolvedBatchId =
        req.batchId ??
        (item as any).batchId ??
        (req as any).batch_id ??
        (item as any).batch_id ??
        (req as any).shipperRequestBatchId ??
        (item as any).shipperRequestBatchId ??
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

      const isBiddingApproved = Boolean(
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

      const resolvedJourneyStatusId =
        extractJourneyStatusId(req.journeyStatusId) ??
        extractJourneyStatusId((item as any).journeyStatusId) ??
        extractJourneyStatusId(req.statusId) ??
        extractJourneyStatusId((item as any).statusId) ??
        extractJourneyStatusId(req.journeyStatus) ??
        extractJourneyStatusId((item as any).journeyStatus) ??
        extractJourneyStatusId(req.status) ??
        extractJourneyStatusId((item as any).status) ??
        null;

      const isComplete =
        resolvedJourneyStatusId === 9 ||
        resolvedJourneyStatusId === 14 ||
        String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "complete" ||
        String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "completed" ||
        String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "delivered";

      const driverRequests = rawDriverRequests.map((d: any) => {
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

        return {
          ...d,
          driverRequestId: d.driverRequestId,
          driverRequestUniqueId: d.driverRequestUniqueId || d.bidUniqueId || d.userUniqueId,
          userUniqueId: d.userUniqueId || d.driverUserUniqueId,
          journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
          fullName: d.fullName ?? d.driverName ?? d.name ?? null,
          phoneNumber: d.phoneNumber ?? d.driverPhoneNumber ?? null,
          journeyStatusId: d.journeyStatusId ?? d.statusId ?? null,
          journeyStatus: d.journeyStatus ?? null,
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
          plateNumber: d.plateNumber ?? d.vehiclePlateNumber ?? null,
          latitude: dLat,
          longitude: dLng,
          currentPlace: resolvedLoc,
          distanceKm: dist,
          rawDriver: d,
          rawItem: item,
        };
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

      const originPlace =
        req.originPlace ||
        (item as any).originPlace ||
        req.pickupLocationName ||
        (item as any).pickupLocationName ||
        t("orders.defaultTerminal");

      const destPlace =
        req.destinationPlace ||
        (item as any).destinationPlace ||
        req.dropoffLocationName ||
        (item as any).dropoffLocationName ||
        t("orders.defaultDestination");

      return {
        id: resolvedShipperRequestUniqueId,
        shipperRequestId: resolvedShipperRequestId,
        batchId: resolvedBatchId,
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
        driverRequests,
        decisions: rawDecisions,
        queueOrganizationUniqueId: resolvedQueueOrgId,
        rawItem: item,
      };
    });
  }

  // 2. Process company target batches from /shipperRequestBatch
  const rawBatchList = (batchesData as any)?.data;
  if (Array.isArray(rawBatchList)) {
    const existingBatchIds = new Set(
      baseList.map((o) => (o.batchId != null ? String(o.batchId) : "")).filter(Boolean)
    );

    for (const batch of rawBatchList) {
      if (!batch) continue;
      const bIdStr = batch.batchId != null ? String(batch.batchId) : "";
      if (bIdStr && existingBatchIds.has(bIdStr)) continue;

      const totalVehicles = Math.max(1, Number(batch.totalVehicles) || 1);
      const batchTotalCost = Number(String(batch.shippingCost ?? 0).replace(/[^0-9.]/g, "")) || 0;
      const batchTotalQuintal = Number(String(batch.shippableItemQtyInQuintal ?? 0).replace(/[^0-9.]/g, "")) || 0;

      const shipperName =
        batch.shipperName ||
        (batch as any).fullName ||
        batch.shipperPhone ||
        t("orders.defaultValuedShipper");

      const vehicleTypeName =
        batch.vehicleTypeName ||
        t("orders.defaultHeavyTruck");

      const itemName =
        batch.shippableItemName ||
        t("orders.defaultGeneralCargo");

      const originPlace =
        batch.originPlace ||
        t("orders.defaultTerminal");

      const destPlace =
        batch.destinationPlace ||
        t("orders.defaultDestination");

      const originLat =
        batch.originLatitude != null
          ? batch.originLatitude
          : (activeOrg?.latitude != null ? activeOrg.latitude : null);
      const originLng =
        batch.originLongitude != null
          ? batch.originLongitude
          : (activeOrg?.longitude != null ? activeOrg.longitude : null);

      const sid = Number(batch.journeyStatusId) || 1;
      const isComplete =
        sid === 9 ||
        sid === 14 ||
        String(batch.journeyStatusName || "").toLowerCase() === "completed" ||
        String(batch.journeyStatusName || "").toLowerCase() === "delivered";

      // Parse bids / driverRequests from batch
      const rawBids: any[] =
        (Array.isArray((batch as any).bids) ? (batch as any).bids : []) ||
        (Array.isArray((batch as any).companyBids) ? (batch as any).companyBids : []) ||
        (Array.isArray((batch as any).offers) ? (batch as any).offers : []) ||
        (Array.isArray((batch as any).driverRequests) ? (batch as any).driverRequests : []) ||
        [];

      let driverRequests: any[] = rawBids.map((b: any, bIdx: number) => ({
        driverRequestId: b.driverRequestId ?? b.bidId ?? bIdx + 1,
        driverRequestUniqueId: b.driverRequestUniqueId ?? b.bidUniqueId ?? b.uniqueId ?? `bid-${batch.batchId}-${bIdx + 1}`,
        userUniqueId: b.userUniqueId ?? b.driverUserUniqueId ?? b.companyUniqueId ?? `company-${bIdx + 1}`,
        journeyDecisionUniqueId: b.journeyDecisionUniqueId ?? null,
        fullName: b.fullName ?? b.companyName ?? b.driverName ?? b.name ?? (batch.targetCompanyName || `Company Bidder #${bIdx + 1}`),
        phoneNumber: b.phoneNumber ?? b.phone ?? null,
        journeyStatusId: b.journeyStatusId ?? (b.status === "accepted" ? 3 : 1),
        journeyStatus: b.journeyStatus ?? b.status ?? "submitted",
        shipperRequestUniqueId: b.shipperRequestUniqueId ?? batch.batchUniqueId,
        offerCost: Number(b.offerCost ?? b.bidAmount ?? b.proposedCost ?? b.cost ?? batch.shippingCost) || null,
        proposedCost: Number(b.proposedCost ?? b.bidAmount ?? b.offerCost ?? b.cost ?? batch.shippingCost) || null,
        bidAmount: Number(b.bidAmount ?? b.proposedCost ?? b.offerCost ?? b.cost ?? batch.shippingCost) || null,
        vehicleTypeName: b.vehicleTypeName ?? batch.vehicleTypeName ?? null,
        plateNumber: b.plateNumber ?? null,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
        currentPlace: b.currentPlace ?? null,
        distanceKm: null,
        rawDriver: b,
        rawItem: batch,
      }));

      if (
        driverRequests.length === 0 &&
        ((batch.bidSummary?.total || 0) > 0 || (batch.bidSummary?.submitted || 0) > 0)
      ) {
        const count = batch.bidSummary?.submitted || batch.bidSummary?.total || 1;
        driverRequests = Array.from({ length: count }, (_, idx) => ({
          driverRequestId: idx + 1,
          driverRequestUniqueId: `bid-${batch.batchUniqueId}-${idx + 1}`,
          userUniqueId: `bidder-${idx + 1}`,
          journeyDecisionUniqueId: null,
          fullName: batch.targetCompanyName || `Company Bidder ${idx + 1}`,
          phoneNumber: null,
          journeyStatusId: 1,
          journeyStatus: "submitted",
          shipperRequestUniqueId: batch.batchUniqueId,
          offerCost: batchTotalCost || null,
          proposedCost: batchTotalCost || null,
          bidAmount: batchTotalCost || null,
          vehicleTypeName,
          plateNumber: null,
          latitude: null,
          longitude: null,
          currentPlace: null,
          distanceKm: null,
          rawDriver: batch.bidSummary,
          rawItem: batch,
        }));
      }

      const isBiddingApproved = true;

      if (totalVehicles > 1) {
        const childCost = Math.round((batchTotalCost / totalVehicles) * 100) / 100;
        const childQuintal = Math.round((batchTotalQuintal / totalVehicles) * 100) / 100;

        for (let truckIdx = 1; truckIdx <= totalVehicles; truckIdx++) {
          const childId = `${batch.batchUniqueId || `batch-${batch.batchId}`}-truck-${truckIdx}`;
          // If the whole batch is complete, all are 9; otherwise slot 1 carries the current journey status,
          // while remaining slots 2..N wait for driver assignments (sid 1)
          const childSid = isComplete ? 9 : (truckIdx === 1 ? sid : 1);
          const childStatus = childSid === 9 || childSid === 14 ? "complete" : "ongoing";

          baseList.push({
            id: childId,
            shipperRequestId: truckIdx,
            batchId: bIdStr,
            requestIdDisplay: String(truckIdx),
            batchIdDisplay: bIdStr,
            fullRequestId: String(truckIdx),
            fullBatchId: bIdStr,
            displayId: `#${batch.batchId}/${truckIdx}`,
            fullId: `#${batch.batchId}/${truckIdx}`,
            shipper: shipperName,
            type: "Group",
            vehicleType: vehicleTypeName,
            vehicleTypeUniqueId: batch.vehicleTypeUniqueId,
            item: itemName,
            origin: originPlace,
            destination: destPlace,
            originLatitude: originLat,
            originLongitude: originLng,
            destinationLatitude: batch.destinationLatitude ?? null,
            destinationLongitude: batch.destinationLongitude ?? null,
            quintal: childQuintal,
            cost: childCost,
            status: childStatus,
            journeyStatusId: childSid,
            journeyStatus: getJourneyStatusName(childSid),
            phone: batch.shipperPhone || "",
            createdAt: batch.batchCreatedAt || "",
            isBiddingApproved,
            driverRequests: truckIdx === 1 ? driverRequests : [],
            decisions: [],
            queueOrganizationUniqueId: batch.queueOrganizationUniqueId,
            totalVehicles,
            batchTotalCost,
            batchTotalQuintal,
            rawItem: batch,
          });
        }
      } else {
        const batchUniqueId = batch.batchUniqueId || `batch-${batch.batchId}`;
        baseList.push({
          id: batchUniqueId,
          shipperRequestId: null,
          batchId: bIdStr,
          requestIdDisplay: "",
          batchIdDisplay: bIdStr,
          fullRequestId: "",
          fullBatchId: bIdStr,
          displayId: `#${batch.batchId}`,
          fullId: `#${batch.batchId}`,
          shipper: shipperName,
          type: "Group",
          vehicleType: vehicleTypeName,
          vehicleTypeUniqueId: batch.vehicleTypeUniqueId,
          item: itemName,
          origin: originPlace,
          destination: destPlace,
          originLatitude: originLat,
          originLongitude: originLng,
          destinationLatitude: batch.destinationLatitude ?? null,
          destinationLongitude: batch.destinationLongitude ?? null,
          quintal: batchTotalQuintal,
          cost: batchTotalCost,
          status: isComplete ? "complete" : "ongoing",
          journeyStatusId: sid,
          journeyStatus: batch.journeyStatusName || getJourneyStatusName(sid),
          phone: batch.shipperPhone || "",
          createdAt: batch.batchCreatedAt || "",
          isBiddingApproved,
          driverRequests,
          decisions: [],
          queueOrganizationUniqueId: batch.queueOrganizationUniqueId,
          totalVehicles: 1,
          batchTotalCost,
          batchTotalQuintal,
          rawItem: batch,
        });
      }
    }
  }

  return baseList
    .filter((o) => !deletedIds.has(o.id))
    .map((o) => editedOrders[o.id] || o);
}
