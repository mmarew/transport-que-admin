import type { ShipperRequestDriverInfo } from "../../../components/orders/OrdersTypes";

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
  else if (Array.isArray(batch.proposals) && batch.proposals.length > 0) rawBids = batch.proposals;
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
      b.company?.companyName ??
      b.company?.name ??
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
      b.company?.phoneNumber ??
      b.company?.phone ??
      b.driverPhoneNumber ??
      batch.targetCompanyPhone ??
      null;

    const rawBidStatus = String(b.bidStatus || b.status || "").toLowerCase();
    const hasCompanyProposal = Boolean(
      b.proposedTotalCost != null ||
      b.proposedCostPerVehicle != null ||
      b.offerCost != null ||
      b.bidAmount != null ||
      b.proposedCost != null ||
      b.numberOfVehiclesOffered != null
    );

    const isRequested =
      rawBidStatus === "requested" ||
      rawBidStatus === "awaiting" ||
      b.journeyStatusId === 2 ||
      (!hasCompanyProposal && rawBidStatus !== "submitted" && rawBidStatus !== "accepted");

    const isPending =
      !isRequested &&
      (rawBidStatus === "submitted" ||
        rawBidStatus === "pending" ||
        (hasCompanyProposal && rawBidStatus !== "rejected" && rawBidStatus !== "cancelled"));

    const isAccepted =
      !isRequested &&
      !isPending &&
      (b.status === "accepted" ||
        b.bidStatus === "selected" ||
        b.bidStatus === "accepted" ||
        b.bidStatus === "accepted_by_shipper" ||
        (b.journeyStatusId === 4 && rawBidStatus !== "submitted") ||
        (batch.acceptedOffer && b === batch.acceptedOffer) ||
        (batch.journeyStatusId === 4 && rawBids.length === 1 && !isPending));

    const cost = hasCompanyProposal
      ? Number(
          b.proposedTotalCost ??
          b.proposedCostPerVehicle ??
          b.offerCost ??
          b.bidAmount ??
          b.proposedCost ??
          b.cost
        ) || null
      : null;

    return {
      driverRequestId: b.driverRequestId ?? b.bidId ?? bIdx + 1,
      driverRequestUniqueId: bidUid,
      companyBidRequestUniqueId: isRealBidId ? String(rawBidUid) : null,
      driverBidUniqueId: isRealBidId ? String(rawBidUid) : null,
      isCompany: true,
      userUniqueId: b.userUniqueId ?? b.bidderUserUniqueId ?? b.companyUniqueId ?? `company-${bIdx + 1}`,
      journeyDecisionUniqueId: b.journeyDecisionUniqueId ?? null,
      fullName: compName,
      phoneNumber: phone,
      journeyStatusId: isAccepted ? 4 : isRequested ? 2 : (isPending ? 1 : (b.journeyStatusId ?? 2)),
      journeyStatus: isAccepted ? "accepted" : isRequested ? "requested" : (b.journeyStatus || "submitted"),
      bidStatus: isAccepted ? "selected" : isRequested ? "requested" : (b.bidStatus || "submitted"),
      shipperRequestUniqueId: b.shipperRequestUniqueId ?? (bUniqueIdStr || batch.batchUniqueId),
      offerCost: cost,
      proposedCost: cost,
      bidAmount: cost,
      vehicleTypeName: b.vehicleTypeName ?? b.offeredVehicleTypeName ?? batch.vehicleTypeName ?? null,
      plateNumber:
        b.licensePlate ??
        b.license_plate ??
        b.plateNumber ??
        b.plate_number ??
        b.vehiclePlateNumber ??
        b.vehicle_plate_number ??
        b.vehiclePlate ??
        b.vehicle_plate ??
        b.plate ??
        b.vehicleOfDriver?.licensePlate ??
        b.vehicleOfDriver?.license_plate ??
        b.vehicleOfDriver?.plateNumber ??
        b.vehicle?.licensePlate ??
        b.vehicle?.plateNumber ??
        batch.licensePlate ??
        batch.license_plate ??
        batch.plateNumber ??
        batch.plate_number ??
        null,
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

  const hasTargetCompany = Boolean(
    batch.targetCompanyName ||
    batch.targetCompany?.name ||
    batch.targetCompanyUniqueId ||
    batch.targetCompany?.uniqueId,
  );

  if (
    batch.acceptedOffer ||
    hasTargetCompany ||
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
      offer.name ??
      (isActuallyAccepted
        ? (t ? t("orders.acceptedCompany", "Accepted Transport Company") : "Accepted Transport Company")
        : (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal"));
    const phone =
      offer.companyPhone ??
      offer.phoneNumber ??
      offer.phone ??
      batch.targetCompanyPhone ??
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
    } else if (!hasAccepted && parsed.length === 0) {
      const hasOfferCost = Boolean(
        offer.proposedTotalCost != null ||
        offer.proposedCostPerVehicle != null ||
        offer.offerCost != null ||
        offer.bidAmount != null ||
        offer.numberOfVehiclesOffered != null
      );
      const rawOfferStatus = String(offer.bidStatus || offer.status || "").toLowerCase();
      const isSubmitted =
        rawOfferStatus !== "requested" &&
        rawOfferStatus !== "awaiting" &&
        (rawOfferStatus === "submitted" ||
          rawOfferStatus === "offered" ||
          hasOfferCost);

      const resolvedStatusId = isActuallyAccepted ? 4 : isSubmitted ? 1 : 2;
      const resolvedJourneyStatus = isActuallyAccepted ? "accepted" : isSubmitted ? "submitted" : "requested";
      const resolvedBidStatus = isActuallyAccepted ? "selected" : isSubmitted ? "submitted" : "requested";
      const effectiveBidId = realBidId || `company-proposal-${batch.batchId || 1}`;

      parsed.unshift({
        driverRequestId: 1,
        driverRequestUniqueId: effectiveBidId,
        companyBidRequestUniqueId: realBidId || null,
        driverBidUniqueId: realBidId || null,
        isCompany: true,
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
        plateNumber:
          offer.licensePlate ??
          offer.license_plate ??
          offer.plateNumber ??
          offer.plate_number ??
          offer.vehiclePlateNumber ??
          offer.vehicle_plate_number ??
          offer.vehiclePlate ??
          offer.vehicle_plate ??
          offer.plate ??
          offer.vehicleOfDriver?.licensePlate ??
          offer.vehicleOfDriver?.license_plate ??
          offer.vehicle?.licensePlate ??
          batch.licensePlate ??
          batch.license_plate ??
          batch.plateNumber ??
          batch.plate_number ??
          null,
        latitude: null,
        longitude: null,
        currentPlace: null,
        distanceKm: null,
        rawDriver: offer,
        rawItem: batch,
      });
    }
  }

  // If parsed is still empty for an explicit company target batch, add a pending proposal placeholder with real batch details
  if (
    parsed.length === 0 &&
    hasTargetCompany &&
    (batch.requestMode === "company_target" ||
      String(batch.requestMode || "").toLowerCase().includes("company"))
  ) {
    const compName =
      batch.targetCompanyName ??
      batch.targetCompany?.name ??
      batch.targetCompany?.companyName ??
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
    const rawBatchBidStatus = String(batch.bidStatus || batch.status || "").toLowerCase();
    const hasBatchCompanyProposal = Boolean(
      batch.proposedTotalCost != null ||
      batch.proposedCostPerVehicle != null ||
      batch.numberOfVehiclesOffered != null
    );
    const isSubmitted =
      rawBatchBidStatus !== "requested" &&
      rawBatchBidStatus !== "awaiting" &&
      (rawBatchBidStatus === "submitted" || rawBatchBidStatus === "offered" || hasBatchCompanyProposal);

    const resolvedStatusId = isSubmitted ? 1 : 2;
    const resolvedJourneyStatus = isSubmitted ? "submitted" : "requested";
    const resolvedBidStatus = isSubmitted ? "submitted" : "requested";
    const effectiveBidId = realBidId || `company-proposal-${batch.batchId || 1}`;

    parsed.push({
      driverRequestId: 1,
      driverRequestUniqueId: effectiveBidId,
      companyBidRequestUniqueId: realBidId || null,
      driverBidUniqueId: realBidId || null,
      isCompany: true,
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
      plateNumber:
        batch.licensePlate ??
        batch.license_plate ??
        batch.plateNumber ??
        batch.plate_number ??
        batch.vehiclePlateNumber ??
        batch.vehiclePlate ??
        null,
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
