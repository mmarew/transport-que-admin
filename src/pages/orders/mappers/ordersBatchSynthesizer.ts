import type { TFunction } from "i18next";
import type { OrderDisplayItem } from "../../../components/orders/OrdersTypes";
import { lookupLocationFromCoordinates } from "../../../utils/formatters";
import { getJourneyStatusName } from "../../../utils/journeyStatus";
import { extractLocationString } from "./ordersFieldResolvers";
import { parseBatchBids } from "./ordersBidParser";

export interface SynthesizeCompanyTargetBatchesParams {
  rawBatchList: any[];
  existingBatchIds: Set<string>;
  existingBatchUniqueIds: Set<string>;
  activeOrg: any;
  getBidsForBatch: (b: any) => any[];
  t: TFunction;
}

/**
 * Pipeline 2: Processes company target batches from /shipperRequestBatch that
 * did not have corresponding individual rows in step 1.
 */
export function synthesizeCompanyTargetBatches({
  rawBatchList,
  existingBatchIds,
  existingBatchUniqueIds,
  activeOrg,
  getBidsForBatch,
  t,
}: SynthesizeCompanyTargetBatchesParams): OrderDisplayItem[] {
  const result: OrderDisplayItem[] = [];
  if (!Array.isArray(rawBatchList)) return result;

  for (const batch of rawBatchList) {
    if (!batch) continue;
    const bIdStr = batch.batchId != null ? String(batch.batchId) : "";
    const bUniqueIdStr = String(
      batch.batchUniqueId ||
      (batch as any).shipperRequestBatchUniqueId ||
      (batch as any).batch_unique_id ||
      (batch as any).uniqueId ||
      ""
    ).trim();

    // Skip if already represented by rows from step 1 (matched by either key)
    if (bIdStr && existingBatchIds.has(bIdStr)) continue;
    if (bUniqueIdStr && existingBatchUniqueIds.has(bUniqueIdStr)) continue;

    const totalVehicles = Math.max(1, Number(batch.totalVehicles) || 1);
    const costPerVehicle = Number(String(batch.shippingCost ?? 0).replace(/[^0-9.]/g, "")) || 0;
    const quintalPerVehicle = Number(String(batch.shippableItemQtyInQuintal ?? 0).replace(/[^0-9.]/g, "")) || 0;

    // When batchShippingCost / batchTotalQuintal are explicitly provided as whole-batch totals, use them;
    // otherwise, batch totals are calculated as (per-vehicle value * totalVehicles).
    const rawBatchShippingCost = (batch as any).batchShippingCost ?? (batch as any).totalShippingCost;
    const batchTotalCost =
      rawBatchShippingCost != null
        ? Number(String(rawBatchShippingCost).replace(/[^0-9.]/g, "")) || (costPerVehicle * totalVehicles)
        : costPerVehicle * totalVehicles;

    const rawBatchTotalQuintal = (batch as any).batchTotalQuintal ?? (batch as any).totalQuintal;
    const batchTotalQuintal =
      rawBatchTotalQuintal != null
        ? Number(String(rawBatchTotalQuintal).replace(/[^0-9.]/g, "")) || (quintalPerVehicle * totalVehicles)
        : quintalPerVehicle * totalVehicles;

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

    const originLat =
      batch.originLatitude != null
        ? batch.originLatitude
        : (activeOrg?.latitude != null ? activeOrg.latitude : null);
    const originLng =
      batch.originLongitude != null
        ? batch.originLongitude
        : (activeOrg?.longitude != null ? activeOrg.longitude : null);

    const originPlace =
      extractLocationString(
        batch.originPlace,
        (batch as any).origin_place,
        (batch as any).originDescription,
        (batch as any).pickupLocationName,
        (batch as any).origin,
        (batch as any).originLocation,
      ) ||
      (originLat && originLng ? lookupLocationFromCoordinates(originLat, originLng) : null) ||
      t("orders.defaultTerminal");

    const destPlace =
      extractLocationString(
        batch.destinationPlace,
        (batch as any).destination_place,
        (batch as any).destinationDescription,
        (batch as any).dropoffLocationName,
        (batch as any).destination,
        (batch as any).destinationLocation,
      ) ||
      (batch.destinationLatitude && batch.destinationLongitude
        ? lookupLocationFromCoordinates(batch.destinationLatitude, batch.destinationLongitude)
        : null) ||
      t("orders.defaultDestination");

    const sid = Number(batch.journeyStatusId) || 1;
    const isComplete =
      sid === 9 ||
      sid === 14 ||
      String(batch.journeyStatusName || "").toLowerCase() === "completed" ||
      String(batch.journeyStatusName || "").toLowerCase() === "delivered";

    const batchQueueNumber =
      batch.queueNumber ??
      (batch as any).queue_number ??
      (batch as any).queueNo ??
      (batch as any).queue_no ??
      (batch as any).queuePosition ??
      null;

    const batchLoadingOrderNumber =
      batch.loadingOrderNumber ??
      (batch as any).loading_order_number ??
      (batch as any).loadingOrderNo ??
      (batch as any).loading_order_no ??
      (batch as any).loadingOrderId ??
      (batch as any).loading_order_id ??
      (batch as any).loadingNumber ??
      (batch as any).loading_number ??
      (batch as any).loadingOrder ??
      (batch as any).loading_order ??
      null;

    const matchedCompBids = getBidsForBatch(batch);
    const effectiveBatch =
      matchedCompBids.length > 0
        ? {
            ...batch,
            companyBids: [
              ...(Array.isArray(batch.companyBids) ? batch.companyBids : []),
              ...matchedCompBids,
            ],
          }
        : batch;

    let driverRequests: any[] = parseBatchBids(effectiveBatch, t);

    if (
      driverRequests.length === 0 &&
      ((batch.bidSummary?.submitted || 0) > 0)
    ) {
      const count = batch.bidSummary.submitted;
      driverRequests = Array.from({ length: count }, (_, idx) => ({
        driverRequestId: idx + 1,
        driverRequestUniqueId: `bid-${bUniqueIdStr || batch.batchUniqueId}-${idx + 1}`,
        userUniqueId: `bidder-${idx + 1}`,
        journeyDecisionUniqueId: null,
        fullName: batch.targetCompanyName || `Company Bidder ${idx + 1}`,
        phoneNumber: null,
        journeyStatusId: 1,
        journeyStatus: "submitted",
        shipperRequestUniqueId: bUniqueIdStr || batch.batchUniqueId,
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
      const childCost = costPerVehicle;
      const childQuintal = quintalPerVehicle;

      for (let truckIdx = 1; truckIdx <= totalVehicles; truckIdx++) {
        const childTruck = Array.isArray(batch.trucks)
          ? batch.trucks[truckIdx - 1]
          : Array.isArray((batch as any).orders)
          ? (batch as any).orders[truckIdx - 1]
          : Array.isArray((batch as any).subOrders)
          ? (batch as any).subOrders[truckIdx - 1]
          : null;

        const childEntry =
          childTruck?.queue?.entry ||
          childTruck?.entry ||
          (Array.isArray(childTruck?.decisions) ? childTruck.decisions[0]?.entry : null) ||
          (Array.isArray(childTruck?.driverRequests) ? childTruck.driverRequests[0]?.entry : null) ||
          null;

        const childQueueNumber =
          childEntry?.queueNumber ??
          childTruck?.queue?.entry?.queueNumber ??
          childTruck?.queueNumber ??
          childTruck?.queue_number ??
          childTruck?.queueNo ??
          childTruck?.queue_no ??
          (batch as any)[`queueNumber_${truckIdx}`] ??
          (batch as any)[`queue_number_${truckIdx}`] ??
          null;

        const childLoadingOrderNumber =
          childEntry?.loadingOrderNumber ??
          childTruck?.queue?.entry?.loadingOrderNumber ??
          childTruck?.loadingOrderNumber ??
          childTruck?.loading_order_number ??
          childTruck?.loadingOrderNo ??
          childTruck?.loading_order_no ??
          childTruck?.loadingOrderId ??
          childTruck?.loading_order_id ??
          (batch as any)[`loadingOrderNumber_${truckIdx}`] ??
          (batch as any)[`loading_order_number_${truckIdx}`] ??
          null;

        const childId = `${bUniqueIdStr || `batch-${batch.batchId}`}-truck-${truckIdx}`;
        // If the whole batch is complete, all are 9; otherwise slot 1 carries the current journey status,
        // while remaining slots 2..N wait for driver assignments (sid 1)
        const childSid = isComplete ? 9 : (truckIdx === 1 ? sid : 1);
        const childStatus = childSid === 9 || childSid === 14 ? "complete" : "ongoing";

        const childShipperRequestId =
          childTruck?.shipperRequestId ??
          childTruck?.shipper_request_id ??
          childTruck?.requestId ??
          childTruck?.request_id ??
          null;

        const hasChildReqId =
          childShipperRequestId != null &&
          String(childShipperRequestId).trim() !== "" &&
          !isNaN(Number(childShipperRequestId));

        const reqDisplay = hasChildReqId ? String(childShipperRequestId) : "";
        const childDisplayId = hasChildReqId
          ? `#${batch.batchId}/${reqDisplay}`
          : `#${batch.batchId}`;

        result.push({
          id: childId,
          shipperRequestId: hasChildReqId ? childShipperRequestId : null,
          batchId: bIdStr,
          batchUniqueId: bUniqueIdStr || batch.batchUniqueId || null,
          shipperRequestUniqueId:
            childTruck?.shipperRequestUniqueId ||
            childTruck?.uniqueId ||
            bUniqueIdStr ||
            batch.batchUniqueId ||
            null,
          requestIdDisplay: reqDisplay,
          batchIdDisplay: bIdStr,
          fullRequestId: reqDisplay,
          fullBatchId: bIdStr,
          displayId: childDisplayId,
          fullId: childDisplayId,
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
          driverRequests: driverRequests,
          decisions: [],
          queueOrganizationUniqueId: batch.queueOrganizationUniqueId,
          totalVehicles,
          batchTotalCost,
          batchTotalQuintal,
          queueNumber: childQueueNumber,
          loadingOrderNumber: childLoadingOrderNumber,
          plateNumber:
            childTruck?.licensePlate ??
            childTruck?.license_plate ??
            childTruck?.plateNumber ??
            childTruck?.plate_number ??
            childTruck?.vehiclePlateNumber ??
            childTruck?.vehiclePlate ??
            childTruck?.vehicle?.licensePlate ??
            childTruck?.vehicleOfDriver?.licensePlate ??
            childEntry?.licensePlate ??
            childEntry?.plateNumber ??
            batch.licensePlate ??
            batch.license_plate ??
            batch.plateNumber ??
            batch.plate_number ??
            null,
          rawItem: batch,
        });
      }
    } else {
      const batchUniqueId = bUniqueIdStr || `batch-${batch.batchId}`;
      result.push({
        id: batchUniqueId,
        shipperRequestId: null,
        batchId: bIdStr,
        batchUniqueId: bUniqueIdStr || batch.batchUniqueId || null,
        shipperRequestUniqueId: bUniqueIdStr || batch.batchUniqueId || null,
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
        queueNumber: batchQueueNumber,
        loadingOrderNumber: batchLoadingOrderNumber,
        plateNumber:
          batch.licensePlate ??
          batch.license_plate ??
          batch.plateNumber ??
          batch.plate_number ??
          batch.vehiclePlateNumber ??
          batch.vehiclePlate ??
          null,
        rawItem: batch,
      });
    }
  }

  return result;
}
