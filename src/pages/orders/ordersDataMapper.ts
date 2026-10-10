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
  ShipperRequestDriverInfo,
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

function extractLocationString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
    if (c && typeof c === "object") {
      const obj = c as Record<string, unknown>;
      if (typeof obj.description === "string" && obj.description.trim()) {
        return obj.description.trim();
      }
      if (typeof obj.place === "string" && obj.place.trim()) {
        return obj.place.trim();
      }
      if (typeof obj.locationName === "string" && obj.locationName.trim()) {
        return obj.locationName.trim();
      }
    }
  }
  return null;
}

/**
 * Extracts bids, offers, or accepted company proposals from a batch object.
 */
export function parseBatchBids(batch: any, t?: any): ShipperRequestDriverInfo[] {
  if (!batch) return [];
  const bUniqueIdStr = String(
    batch.batchUniqueId ||
    batch.shipperRequestBatchUniqueId ||
    batch.batch_unique_id ||
    batch.uniqueId ||
    ""
  ).trim();

  let rawBids: any[] = [];
  if (Array.isArray(batch.companyBids) && batch.companyBids.length > 0) rawBids = batch.companyBids;
  else if (Array.isArray(batch.company_bids) && batch.company_bids.length > 0) rawBids = batch.company_bids;
  else if (Array.isArray(batch.companyBidRequests) && batch.companyBidRequests.length > 0) rawBids = batch.companyBidRequests;
  else if (Array.isArray(batch.company_bid_requests) && batch.company_bid_requests.length > 0) rawBids = batch.company_bid_requests;
  else if (Array.isArray(batch.bids) && batch.bids.length > 0) rawBids = batch.bids;
  else if (Array.isArray(batch.bids?.data) && batch.bids.data.length > 0) rawBids = batch.bids.data;
  else if (Array.isArray(batch.companyBids?.data) && batch.companyBids.data.length > 0) rawBids = batch.companyBids.data;
  else if (Array.isArray(batch.offers) && batch.offers.length > 0) rawBids = batch.offers;
  else if (Array.isArray(batch.submittedBids) && batch.submittedBids.length > 0) rawBids = batch.submittedBids;
  else if (Array.isArray(batch.submittedOffers) && batch.submittedOffers.length > 0) rawBids = batch.submittedOffers;
  else if (Array.isArray(batch.driverRequests) && batch.driverRequests.length > 0) rawBids = batch.driverRequests;
  else if (Array.isArray(batch.batchBids) && batch.batchBids.length > 0) rawBids = batch.batchBids;
  else if (batch.acceptedOffer && typeof batch.acceptedOffer === "object") rawBids = [batch.acceptedOffer];
  else if (batch.companyBid && typeof batch.companyBid === "object") rawBids = [batch.companyBid];
  else if (batch.companyBidRequest && typeof batch.companyBidRequest === "object") rawBids = [batch.companyBidRequest];
  else if (batch.bid && typeof batch.bid === "object") rawBids = [batch.bid];

  let parsed: any[] = rawBids.map((b: any, bIdx: number) => {
    const compId = b.companyUniqueId ?? batch.targetCompanyUniqueId;
    const rawBidUid =
      b.companyBidRequestUniqueId ??
      b.company_bid_request_unique_id ??
      b.driverBidUniqueId ??
      b.driver_bid_unique_id ??
      b.bidUniqueId ??
      b.bid_unique_id ??
      b.companyBidRequestId ??
      b.companyBidUniqueId ??
      (b.uniqueId && b.uniqueId !== compId ? b.uniqueId : undefined) ??
      (b.id && b.id !== compId ? b.id : undefined) ??
      (b.companyBidRequest && b.companyBidRequest.companyBidRequestUniqueId) ??
      (b.companyBid && b.companyBid.companyBidRequestUniqueId) ??
      undefined;

    const bidUid = rawBidUid ?? `bid-${batch.batchId || bIdx + 1}-${bIdx + 1}`;
    const isRealBidId = Boolean(rawBidUid && rawBidUid !== compId);

    const compName =
      b.companyName ??
      b.submittedByName ??
      b.fullName ??
      b.driverName ??
      b.name ??
      batch.targetCompanyName ??
      `Company Bidder #${bIdx + 1}`;

    const phone =
      b.companyPhone ??
      b.phoneNumber ??
      b.phone ??
      b.driverPhoneNumber ??
      batch.targetCompanyPhone ??
      batch.shipperPhone ??
      null;

    const rawBidStatus = String(b.bidStatus || b.status || "").toLowerCase();
    const isPending =
      rawBidStatus === "submitted" ||
      rawBidStatus === "pending" ||
      rawBidStatus === "requested";

    const isAccepted =
      !isPending &&
      (b.status === "accepted" ||
        b.bidStatus === "selected" ||
        b.bidStatus === "accepted" ||
        b.bidStatus === "accepted_by_shipper" ||
        (b.journeyStatusId === 4 && rawBidStatus !== "submitted"));

    const cost =
      Number(
        b.proposedTotalCost ??
        b.proposedCostPerVehicle ??
        b.offerCost ??
        b.bidAmount ??
        b.proposedCost ??
        b.cost ??
        batch.batchShippingCost ??
        batch.shippingCost ??
        batch.batchTotalCost
      ) || null;

    return {
      driverRequestId: b.driverRequestId ?? b.bidId ?? bIdx + 1,
      driverRequestUniqueId: bidUid,
      companyBidRequestUniqueId: isRealBidId ? String(rawBidUid) : null,
      driverBidUniqueId: isRealBidId ? String(rawBidUid) : null,
      userUniqueId: b.userUniqueId ?? b.bidderUserUniqueId ?? b.companyUniqueId ?? `company-${bIdx + 1}`,
      journeyDecisionUniqueId: b.journeyDecisionUniqueId ?? null,
      fullName: compName,
      phoneNumber: phone,
      journeyStatusId: isAccepted ? 4 : (isPending ? 1 : (b.journeyStatusId ?? 1)),
      journeyStatus: isAccepted ? "accepted" : (b.journeyStatus || "submitted"),
      bidStatus: isAccepted ? "selected" : (b.bidStatus || "submitted"),
      shipperRequestUniqueId: b.shipperRequestUniqueId ?? (bUniqueIdStr || batch.batchUniqueId),
      offerCost: cost,
      proposedCost: cost,
      bidAmount: cost,
      vehicleTypeName: b.vehicleTypeName ?? b.offeredVehicleTypeName ?? batch.vehicleTypeName ?? null,
      plateNumber: b.plateNumber ?? null,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      currentPlace: b.currentPlace ?? null,
      distanceKm: null,
      rawDriver: b,
      rawItem: batch,
    };
  });

  // If there's an acceptedOffer, targetCompanyName, or targetCompany on the batch:
  // First, check if that accepted company already exists in `parsed`.
  // If it exists, update it in-place to accepted status instead of unshifting a duplicate row!
  const hasAccepted = parsed.some(
    (d) =>
      d.journeyStatusId === 4 ||
      d.journeyStatus === "accepted" ||
      d.bidStatus === "selected",
  );

  if (
    batch.acceptedOffer ||
    batch.targetCompanyName ||
    batch.targetCompany ||
    batch.companyName ||
    batch.journeyStatusId === 4 ||
    batch.status === "accepted"
  ) {
    const offer = (batch.acceptedOffer && typeof batch.acceptedOffer === "object"
      ? batch.acceptedOffer
      : {}) as any;
    const isActuallyAccepted =
      Boolean(batch.acceptedOffer) ||
      batch.journeyStatusId === 4 ||
      batch.status === "accepted" ||
      offer.bidStatus === "accepted_by_shipper" ||
      offer.bidStatus === "selected";
    const companyName =
      offer.companyName ??
      offer.fullName ??
      batch.targetCompanyName ??
      batch.targetCompany?.name ??
      batch.targetCompany?.companyName ??
      batch.companyName ??
      offer.name ??
      (isActuallyAccepted
        ? (t ? t("orders.acceptedCompany", "Accepted Transport Company") : "Accepted Transport Company")
        : (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal"));
    const phone =
      offer.companyPhone ??
      offer.phoneNumber ??
      offer.phone ??
      batch.targetCompanyPhone ??
      batch.shipperPhone ??
      null;
    const compUserUid = offer.userUniqueId ?? batch.targetCompanyUniqueId ?? null;
    const rawBidId =
      offer.companyBidRequestUniqueId ??
      offer.driverBidUniqueId ??
      offer.bidUniqueId ??
      batch.companyBidRequestUniqueId ??
      batch.bidUniqueId ??
      (Array.isArray(batch.companyBids) && batch.companyBids[0]?.companyBidRequestUniqueId) ??
      (Array.isArray(batch.bids) && (batch.bids[0]?.companyBidRequestUniqueId || batch.bids[0]?.bidUniqueId)) ??
      undefined;

    const realBidId =
      rawBidId && rawBidId !== batch.targetCompanyUniqueId && rawBidId !== compUserUid
        ? rawBidId
        : undefined;

    const targetUid =
      compUserUid ||
      batch.targetCompanyUniqueId ||
      batch.targetCompany?.uniqueId ||
      batch.batchUniqueId ||
      `company-target-${batch.batchId || 1}`;

    // Check if this company is already present in parsed
    const existingIndex = parsed.findIndex((p) => {
      if (realBidId && (p.companyBidRequestUniqueId === realBidId || p.driverBidUniqueId === realBidId)) return true;
      if (compUserUid && (p.userUniqueId === compUserUid || (p as any).companyUniqueId === compUserUid)) return true;
      if (phone && p.phoneNumber && String(phone).replace(/\s+/g, "") === String(p.phoneNumber).replace(/\s+/g, "")) return true;
      if (companyName && p.fullName && companyName.trim().toLowerCase() === p.fullName.trim().toLowerCase()) return true;
      return false;
    });

    if (existingIndex !== -1) {
      if (isActuallyAccepted) {
        parsed[existingIndex] = {
          ...parsed[existingIndex],
          fullName: companyName || parsed[existingIndex].fullName,
          phoneNumber: phone || parsed[existingIndex].phoneNumber,
          journeyStatusId: 4,
          journeyStatus: "accepted",
          bidStatus: "selected",
        };
      }
    } else if (!hasAccepted) {
      const isSubmitted =
        batch.status === "submitted" ||
        batch.journeyStatus === "submitted" ||
        batch.journeyStatusId === 1 ||
        offer.bidStatus === "submitted" ||
        offer.status === "submitted" ||
        offer.journeyStatusId === 1 ||
        String(batch.status || "").toLowerCase().includes("submit") ||
        String(batch.journeyStatus || "").toLowerCase().includes("submit");

      const resolvedStatusId = isActuallyAccepted ? 4 : isSubmitted ? 1 : 2;
      const resolvedJourneyStatus = isActuallyAccepted ? "accepted" : isSubmitted ? "submitted" : "requested";
      const resolvedBidStatus = isActuallyAccepted ? "selected" : isSubmitted ? "submitted" : "requested";
      const effectiveBidId = realBidId || `company-proposal-${batch.batchId || 1}`;

      parsed.unshift({
        driverRequestId: 1,
        driverRequestUniqueId: effectiveBidId,
        companyBidRequestUniqueId: realBidId || null,
        driverBidUniqueId: realBidId || null,
        userUniqueId: targetUid,
        journeyDecisionUniqueId: null,
        fullName: companyName,
        phoneNumber: phone,
        journeyStatusId: resolvedStatusId,
        journeyStatus: resolvedJourneyStatus,
        bidStatus: resolvedBidStatus,
        shipperRequestUniqueId: bUniqueIdStr || batch.batchUniqueId,
        offerCost:
          Number(
            offer.proposedTotalCost ??
              offer.offerCost ??
              offer.bidAmount ??
              batch.shippingCost ??
              batch.batchShippingCost ??
              batch.batchTotalCost,
          ) || null,
        proposedCost:
          Number(
            offer.proposedTotalCost ??
              offer.offerCost ??
              offer.bidAmount ??
              batch.shippingCost ??
              batch.batchShippingCost ??
              batch.batchTotalCost,
          ) || null,
        bidAmount:
          Number(
            offer.proposedTotalCost ??
              offer.offerCost ??
              offer.bidAmount ??
              batch.shippingCost ??
              batch.batchShippingCost ??
              batch.batchTotalCost,
          ) || null,
        vehicleTypeName: batch.vehicleTypeName ?? null,
        plateNumber: null,
        latitude: null,
        longitude: null,
        currentPlace: null,
        distanceKm: null,
        rawDriver: offer,
        rawItem: batch,
      });
    }
  }

  // If parsed is still empty for a company target batch, add a pending proposal placeholder with real batch details
  if (
    parsed.length === 0 &&
    (batch.requestMode === "company_target" ||
      String(batch.requestMode || "").toLowerCase().includes("company") ||
      batch.type === "Group")
  ) {
    const compName =
      batch.targetCompanyName ??
      batch.targetCompany?.name ??
      batch.targetCompany?.companyName ??
      batch.companyName ??
      (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal");
    const rawBidId =
      batch.companyBidRequestUniqueId ??
      batch.companyBid?.companyBidRequestUniqueId ??
      batch.bidUniqueId ??
      (Array.isArray(batch.companyBids) && batch.companyBids[0]?.companyBidRequestUniqueId) ??
      (Array.isArray(batch.bids) && (batch.bids[0]?.companyBidRequestUniqueId || batch.bids[0]?.bidUniqueId)) ??
      undefined;
    const realBidId =
      rawBidId && rawBidId !== batch.targetCompanyUniqueId ? rawBidId : undefined;
    const targetUid =
      batch.targetCompanyUniqueId ??
      batch.targetCompany?.uniqueId ??
      batch.batchUniqueId ??
      bUniqueIdStr ??
      `company-target-${batch.batchId || 1}`;
    const isSubmitted =
      batch.status === "submitted" ||
      batch.journeyStatus === "submitted" ||
      batch.journeyStatusId === 1 ||
      batch.bidStatus === "submitted" ||
      String(batch.status || "").toLowerCase().includes("submit") ||
      String(batch.journeyStatus || "").toLowerCase().includes("submit");

    const resolvedStatusId = isSubmitted ? 1 : 2;
    const resolvedJourneyStatus = isSubmitted ? "submitted" : "requested";
    const resolvedBidStatus = isSubmitted ? "submitted" : "requested";
    const effectiveBidId = realBidId || `company-proposal-${batch.batchId || 1}`;

    parsed.push({
      driverRequestId: 1,
      driverRequestUniqueId: effectiveBidId,
      companyBidRequestUniqueId: realBidId || null,
      driverBidUniqueId: realBidId || null,
      userUniqueId: targetUid,
      journeyDecisionUniqueId: null,
      fullName: compName,
      phoneNumber: batch.targetCompanyPhone ?? batch.shipperPhone ?? null,
      journeyStatusId: resolvedStatusId,
      journeyStatus: resolvedJourneyStatus,
      bidStatus: resolvedBidStatus,
      shipperRequestUniqueId: bUniqueIdStr || batch.batchUniqueId,
      offerCost: Number(batch.batchShippingCost ?? batch.shippingCost ?? batch.batchTotalCost) || null,
      proposedCost: Number(batch.batchShippingCost ?? batch.shippingCost ?? batch.batchTotalCost) || null,
      bidAmount: Number(batch.batchShippingCost ?? batch.shippingCost ?? batch.batchTotalCost) || null,
      vehicleTypeName: batch.vehicleTypeName ?? null,
      plateNumber: null,
      latitude: null,
      longitude: null,
      currentPlace: null,
      distanceKm: null,
      rawDriver: batch,
      rawItem: batch,
    });
  }

  // Deduplicate entries to prevent rendering duplicate cards for the exact same company
  const deduped: any[] = [];
  const seenKeys = new Set<string>();

  // Accepted entries sort first to take precedence during deduplication
  const sortedParsed = [...parsed].sort((a, b) => {
    const isAcceptedA = a.journeyStatusId === 4 || a.journeyStatus === "accepted" || a.bidStatus === "selected";
    const isAcceptedB = b.journeyStatusId === 4 || b.journeyStatus === "accepted" || b.bidStatus === "selected";
    if (isAcceptedA && !isAcceptedB) return -1;
    if (!isAcceptedA && isAcceptedB) return 1;
    return 0;
  });

  for (const item of sortedParsed) {
    const key =
      item.companyBidRequestUniqueId ||
      item.driverBidUniqueId ||
      item.userUniqueId ||
      (item.phoneNumber ? `phone-${item.phoneNumber}` : "") ||
      (item.fullName ? `name-${item.fullName.trim().toLowerCase()}` : "") ||
      item.driverRequestUniqueId;

    if (key && seenKeys.has(key)) {
      continue;
    }
    if (key) {
      seenKeys.add(key);
      if (item.phoneNumber) seenKeys.add(`phone-${item.phoneNumber}`);
      if (item.fullName) seenKeys.add(`name-${item.fullName.trim().toLowerCase()}`);
    }
    deduped.push(item);
  }

  return deduped;
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

  // Pre-index batches from batchesData so step 1 rows can inherit numeric batchId,
  // batch totals, and bids/proposals
  const rawBatchList = (batchesData as any)?.data;
  const batchUniqueIdToBatch = new Map<string, any>();
  const batchIdToBatch = new Map<string, any>();
  if (Array.isArray(rawBatchList)) {
    for (const b of rawBatchList) {
      if (!b) continue;
      const uid = String(
        b.shipperRequestBatchUniqueId ||
        b.batchUniqueId ||
        (b as any).batch_unique_id ||
        (b as any).uniqueId ||
        ""
      ).trim();
      if (uid) {
        batchUniqueIdToBatch.set(uid, b);
      }
      if (b.batchId != null) {
        batchIdToBatch.set(String(b.batchId), b);
      }
    }
  }

  // 1. Process standard individual and group shipper requests
  if (Array.isArray(rawList)) {
    baseList = rawList.map((item, idx) => {
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

      const entryObj =
        (item as any).queue?.entry ||
        (req as any).queue?.entry ||
        (item as any).entry ||
        (req as any).entry ||
        (item as any).driverQueue?.entry ||
        (req as any).driverQueue?.entry ||
        (item as any).driverQueue ||
        (req as any).driverQueue ||
        (item as any).queue ||
        (req as any).queue ||
        (item as any).queueEntry ||
        (req as any).queueEntry ||
        (item as any).journey?.entry ||
        (req as any).journey?.entry ||
        (item as any).journey?.driverQueue?.entry ||
        (req as any).journey?.driverQueue?.entry ||
        (Array.isArray((item as any).decisions) && (item as any).decisions.find((d: any) => d?.entry)?.entry) ||
        (Array.isArray((req as any).decisions) && (req as any).decisions.find((d: any) => d?.entry)?.entry) ||
        (Array.isArray(item.driverRequests) && (item as any).driverRequests.find((d: any) => d?.entry)?.entry) ||
        (Array.isArray((req as any).driverRequests) && (req as any).driverRequests.find((d: any) => d?.entry)?.entry) ||
        (Array.isArray(rawDriverRequests) && rawDriverRequests.find((d: any) => d?.entry)?.entry) ||
        (Array.isArray(rawDecisions) && rawDecisions.find((d: any) => d?.entry)?.entry) ||
        null;

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

      const resolvedQueueNumber =
        entryObj?.queueNumber ??
        entryObj?.queue_number ??
        entryObj?.queueNo ??
        (item as any).queue?.entry?.queueNumber ??
        (req as any).queue?.entry?.queueNumber ??
        (item as any).queue?.queueNumber ??
        (req as any).queue?.queueNumber ??
        req.queueNumber ??
        (item as any).queueNumber ??
        req.queue_number ??
        (item as any).queue_number ??
        req.queueNo ??
        (item as any).queueNo ??
        (item as any).queuePosition ??
        (req as any).queuePosition ??
        (req as any).driverQueue?.queueNumber ??
        (item as any).driverQueue?.queueNumber ??
        rawDriverQn ??
        null;

      const resolvedLoadingOrderNumber =
        entryObj?.loadingOrderNumber ??
        entryObj?.loading_order_number ??
        entryObj?.loadingOrderNo ??
        entryObj?.loadingOrderId ??
        entryObj?.loadingNumber ??
        (item as any).queue?.entry?.loadingOrderNumber ??
        (req as any).queue?.entry?.loadingOrderNumber ??
        (item as any).queue?.loadingOrderNumber ??
        (req as any).queue?.loadingOrderNumber ??
        req.loadingOrderNumber ??
        (item as any).loadingOrderNumber ??
        req.loading_order_number ??
        (item as any).loading_order_number ??
        req.loadingOrderNo ??
        (item as any).loadingOrderNo ??
        req.loadingOrderId ??
        (item as any).loadingOrderId ??
        req.loadingNumber ??
        (item as any).loadingNumber ??
        req.loading_number ??
        (item as any).loading_number ??
        req.loadingOrder ??
        (item as any).loadingOrder ??
        req.loading_order ??
        (item as any).loading_order ??
        (req as any).driverQueue?.loadingOrderNumber ??
        (item as any).driverQueue?.loadingOrderNumber ??
        rawDriverLo ??
        null;

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

        const driverEntry = d.entry || matchingDecision?.entry || entryObj || null;

        return {
          ...d,
          driverRequestId: d.driverRequestId,
          driverRequestUniqueId: d.driverRequestUniqueId || d.bidUniqueId || d.userUniqueId,
          // Accept key for PUT /api/company/bids/:companyBidRequestUniqueId/status.
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

      const batchBids = matchedBatch ? parseBatchBids(matchedBatch, t) : [];
      let finalDriverRequests = driverRequests;

      if (mode === "Group" || String(rawMode).toLowerCase().includes("company")) {
        if (batchBids.length > 0) {
          finalDriverRequests = batchBids;
        } else if (finalDriverRequests.length === 0) {
          const itemBids = parseBatchBids(item as any, t);
          if (itemBids.length > 0) {
            finalDriverRequests = itemBids;
          }
        }
      } else if (finalDriverRequests.length === 0 && batchBids.length > 0) {
        finalDriverRequests = batchBids;
      }

      if (
        finalDriverRequests.length === 0 &&
        (resolvedJourneyStatusId === 4 ||
          (resolvedJourneyStatusId != null && resolvedJourneyStatusId >= 5 && resolvedJourneyStatusId <= 9) ||
          resolvedJourneyStatusId === 14 ||
          String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "accepted" ||
          String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "acceptedbyshipper")
      ) {
        const companyOrDriverName =
          matchedBatch?.targetCompanyName ||
          (req as any).targetCompanyName ||
          (item as any).targetCompanyName ||
          (req as any).companyName ||
          (item as any).companyName ||
          (req as any).driverName ||
          (item as any).driverName ||
          (req as any).fullName ||
          (item as any).fullName ||
          (mode === "Group"
            ? (t ? t("orders.acceptedCompany", "Accepted Transport Company") : "Accepted Transport Company")
            : (t ? t("orders.acceptedDriver", "Accepted Driver") : "Accepted Driver"));

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

        const targetUid =
          (req as any).targetCompanyUniqueId ||
          (item as any).targetCompanyUniqueId ||
          matchedBatch?.targetCompanyUniqueId ||
          resolvedBatchUniqueId ||
          resolvedShipperRequestUniqueId ||
          "accepted-bid";

        finalDriverRequests = [
          {
            driverRequestId: 1,
            driverRequestUniqueId: safeBidId || targetUid,
            companyBidRequestUniqueId: safeBidId,
            driverBidUniqueId: safeBidId,
            fullName: companyOrDriverName,
            phoneNumber:
              (req as any).targetCompanyPhone ||
              (item as any).targetCompanyPhone ||
              matchedBatch?.shipperPhone ||
              null,
            journeyStatusId: resolvedJourneyStatusId ?? 4,
            journeyStatus: "accepted",
            bidStatus: "selected",
            offerCost: (mode === "Group" && matchedBatchTotalCost) ? matchedBatchTotalCost : costNum,
            vehicleTypeName: vehicleTypeName,
          },
        ];
      } else if (
        finalDriverRequests.length === 0 &&
        (resolvedJourneyStatusId === 3 ||
          String(req.journeyStatus || (item as any).journeyStatus || req.status || (item as any).status || "").toLowerCase() === "acceptedbydriver")
      ) {
        const companyOrDriverName =
          matchedBatch?.targetCompanyName ||
          (req as any).targetCompanyName ||
          (item as any).targetCompanyName ||
          (req as any).companyName ||
          (item as any).companyName ||
          (req as any).driverName ||
          (item as any).driverName ||
          (req as any).fullName ||
          (item as any).fullName ||
          (mode === "Group"
            ? (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal")
            : (t ? t("orders.waitingDriver", "Driver") : "Driver"));

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

        const targetUid =
          (req as any).targetCompanyUniqueId ||
          (item as any).targetCompanyUniqueId ||
          matchedBatch?.targetCompanyUniqueId ||
          resolvedBatchUniqueId ||
          resolvedShipperRequestUniqueId ||
          "driver-offer";

        finalDriverRequests = [
          {
            driverRequestId: 1,
            driverRequestUniqueId: safeBidId || targetUid,
            companyBidRequestUniqueId: safeBidId,
            driverBidUniqueId: safeBidId,
            fullName: companyOrDriverName,
            phoneNumber:
              (req as any).targetCompanyPhone ||
              (item as any).targetCompanyPhone ||
              matchedBatch?.shipperPhone ||
              null,
            journeyStatusId: 3,
            journeyStatus: "acceptedByDriver",
            bidStatus: "pending",
            offerCost: (mode === "Group" && matchedBatchTotalCost) ? matchedBatchTotalCost : costNum,
            vehicleTypeName: vehicleTypeName,
          },
        ];
      } else if (
        finalDriverRequests.length === 0 &&
        ((req as any).targetCompanyName ||
          matchedBatch?.targetCompanyName ||
          (req as any).targetCompanyUniqueId ||
          matchedBatch?.targetCompanyUniqueId)
      ) {
        const companyOrDriverName =
          matchedBatch?.targetCompanyName ||
          (req as any).targetCompanyName ||
          (item as any).targetCompanyName ||
          (req as any).companyName ||
          (item as any).companyName ||
          (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal");

        const compId =
          (req as any).targetCompanyUniqueId ||
          (item as any).targetCompanyUniqueId ||
          matchedBatch?.targetCompanyUniqueId;

        const targetUid =
          compId ||
          "company-target";

        const rawBidId =
          matchedBatch?.companyBidRequestUniqueId ??
          matchedBatch?.bidUniqueId ??
          (req as any).companyBidRequestUniqueId ??
          (item as any).companyBidRequestUniqueId ??
          undefined;

        const safeBidId = rawBidId && rawBidId !== compId ? rawBidId : null;

        const isSubmitted =
          (req as any).status === "submitted" ||
          (req as any).journeyStatus === "submitted" ||
          (item as any).status === "submitted" ||
          (item as any).journeyStatus === "submitted" ||
          matchedBatch?.status === "submitted" ||
          matchedBatch?.journeyStatus === "submitted" ||
          resolvedJourneyStatusId === 1 ||
          String((req as any).status || "").toLowerCase().includes("submit") ||
          String(matchedBatch?.status || "").toLowerCase().includes("submit");

        const resolvedStatusId = isSubmitted ? 1 : 2;
        const resolvedJourneyStatus = isSubmitted ? "submitted" : "requested";
        const resolvedBidStatus = isSubmitted ? "submitted" : "requested";
        const effectiveBidId = safeBidId || `company-proposal-${(req as any).batchId || matchedBatch?.batchId || 1}`;

        finalDriverRequests = [
          {
            driverRequestId: 1,
            driverRequestUniqueId: effectiveBidId,
            companyBidRequestUniqueId: safeBidId,
            driverBidUniqueId: safeBidId,
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
        // batchUniqueId lets step 2 dedup against UUID-keyed batch records
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
        rawItem: item,
      };
    });
  }

  // 2. Process company target batches from /shipperRequestBatch
  if (Array.isArray(rawBatchList)) {
    // Build dedup sets from both numeric batchId AND UUID batchUniqueId captured in step 1.
    // Company_target rows from getShipperRequest4allOrSingleUser carry the batch reference as
    // shipperRequest.shipperRequestBatchUniqueId (UUID), not as a numeric batchId, so we must
    // check both to avoid creating duplicate synthetic truck rows over real ones.
    const existingBatchIds = new Set(
      baseList.map((o) => (o.batchId != null ? String(o.batchId) : "")).filter(Boolean)
    );
    const existingBatchUniqueIds = new Set(
      baseList
        .map((o) => ((o as any).batchUniqueId ? String((o as any).batchUniqueId) : ""))
        .filter(Boolean)
    );

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
        batch.batchId ??
        1;

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
        batch.batchId ??
        1;

      // Parse bids / driverRequests from batch
      let driverRequests: any[] = parseBatchBids(batch, t);

      if (
        driverRequests.length === 0 &&
        ((batch.bidSummary?.total || 0) > 0 || (batch.bidSummary?.submitted || 0) > 0)
      ) {
        const count = batch.bidSummary?.submitted || batch.bidSummary?.total || 1;
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

          baseList.push({
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
            rawItem: batch,
          });
        }
      } else {
        const batchUniqueId = bUniqueIdStr || `batch-${batch.batchId}`;
        baseList.push({
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
          rawItem: batch,
        });
      }
    }
  }

  return baseList
    .filter((o) => !deletedIds.has(o.id))
    .map((o) => editedOrders[o.id] || o);
}
