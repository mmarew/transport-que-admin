import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { extractJourneyStatusId } from "../../../utils/journeyStatus";
import {
  asRecord,
  extractUUID,
  extractCompanyUUIDs,
  findUUIDInExcluding,
} from "./orderIdLookup";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";
import { mapDriverBidsToRows } from "./mapDriverBids";
import { useGetBidsForOrderQuery, useGetCompanyBidsQuery } from "@/lib/redux/api";

export interface UseDriverBidsDataParams {
  order: OrderDisplayItem;
  initialRequests?: ShipperRequestDriverInfo[];
}

export interface UseDriverBidsDataResult {
  isCompany: boolean;
  driverRequests: ShipperRequestDriverInfo[];
  isLoadingProposals: boolean;
  isDriverAccepted: (driver: ShipperRequestDriverInfo) => boolean;
  driverEntryKey: (driver: ShipperRequestDriverInfo, idx: number) => string;
}

export function useDriverBidsData({
  order,
  initialRequests,
}: UseDriverBidsDataParams): UseDriverBidsDataResult {
  const { t } = useTranslation();

  const targetCompanyUUIDs = useMemo(
    () => extractCompanyUUIDs(order, order.rawItem, asRecord(order.rawItem).shipperRequest),
    [order],
  );

  const isCompanyTargetBatch =
    order.type === "Group" ||
    targetCompanyUUIDs.length > 0 ||
    Boolean(order.targetCompanyUniqueId) ||
    Boolean((order.rawItem as any)?.targetCompanyUniqueId) ||
    String((order.rawItem as any)?.requestMode || "").toLowerCase().includes("company") ||
    String((order.rawItem as any)?.shipperRequest?.requestMode || "").toLowerCase().includes("company");

  // The authoritative list of who actually bid. Exclude company UUIDs so we never query the driver-bid endpoint with a company UUID.
  const shipperRequestUniqueId = useMemo(() => {
    return (
      findUUIDInExcluding(
        [
          "shipperRequestUniqueId",
          "shipper_request_unique_id",
          "shipperRequestBatchUniqueId",
          "batchUniqueId",
          "batch_unique_id",
          "uniqueId",
          "id",
        ],
        targetCompanyUUIDs,
        order,
        order.rawItem,
        asRecord(order.rawItem).shipperRequest,
      ) ||
      (order.batchUniqueId && !targetCompanyUUIDs.includes(order.batchUniqueId)
        ? extractUUID(order.batchUniqueId)
        : undefined) ||
      (order.id && !targetCompanyUUIDs.includes(order.id)
        ? extractUUID(order.id)
        : undefined)
    );
  }, [order, targetCompanyUUIDs]);

  // Individual auction query: only run if there is a shipperRequestUniqueId AND it is NOT a company batch
  const {
    data: bidsData,
    isLoading: isBidsLoading,
    isFetching: isBidsFetching,
  } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: shipperRequestUniqueId ?? "" },
    { skip: !shipperRequestUniqueId || isCompanyTargetBatch },
  );

  const targetCompanyId =
    targetCompanyUUIDs[0] ||
    (order.rawItem as any)?.targetCompanyUniqueId ||
    (order.rawItem as any)?.targetCompany?.uniqueId ||
    undefined;

  const rawBatchId =
    order.batchId != null && String(order.batchId).trim() !== ""
      ? String(order.batchId).trim()
      : (order.rawItem as any)?.batchId != null && String((order.rawItem as any).batchId).trim() !== ""
        ? String((order.rawItem as any).batchId).trim()
        : (order.rawItem as any)?.shipperRequestBatchId != null && String((order.rawItem as any).shipperRequestBatchId).trim() !== ""
          ? String((order.rawItem as any).shipperRequestBatchId).trim()
          : order.displayId
            ? order.displayId.replace(/^[#]/, "").split("/")[0].trim()
            : order.id
              ? (order.id.match(/batch-(\d+)/i)?.[1] ?? undefined)
              : undefined;

  const rawBatchCandidate =
    (order.batchUniqueId && !targetCompanyUUIDs.includes(order.batchUniqueId)
      ? order.batchUniqueId
      : undefined) ||
    (order.rawItem as any)?.batchUniqueId ||
    (order.rawItem as any)?.shipperRequestBatchUniqueId ||
    (order.rawItem as any)?.shipperRequestBatchId ||
    undefined;

  const cleanBatchUUID = rawBatchCandidate ? extractUUID(rawBatchCandidate) : undefined;

  // Company bids query: fetch bids submitted via POST /api/company/bids
  const shouldFetchCompanyBids = Boolean(isCompanyTargetBatch || targetCompanyId || rawBatchId || cleanBatchUUID);
  const {
    data: companyBidsData,
    isLoading: isCompanyBidsLoading,
    isFetching: isCompanyBidsFetching,
  } = useGetCompanyBidsQuery(
    {
      shipperRequestBatchUniqueId: cleanBatchUUID || undefined,
      shipperRequestBatchId: cleanBatchUUID || (rawBatchId ? String(rawBatchId) : undefined),
      batchId: rawBatchId ? String(rawBatchId) : undefined,
    },
    { skip: !shouldFetchCompanyBids },
  );

  const realCompanyBids = useMemo<ShipperRequestDriverInfo[]>(() => {
    const rawList = Array.isArray(companyBidsData?.data) ? companyBidsData.data : [];
    if (rawList.length === 0) return [];

    const matching = rawList.filter((b) => {
      // 1. Numeric / string batchId match
      if (rawBatchId != null) {
        if (b.batchId != null && String(b.batchId) === String(rawBatchId)) return true;
        if (b.shipperRequestBatchId != null && String(b.shipperRequestBatchId) === String(rawBatchId)) return true;
        if ((b as any).batch?.batchId != null && String((b as any).batch.batchId) === String(rawBatchId)) return true;
        if ((b as any).shipperRequestBatch?.batchId != null && String((b as any).shipperRequestBatch.batchId) === String(rawBatchId)) return true;
      }
      // 2. String/UUID batchId match
      if (cleanBatchUUID) {
        if (b.shipperRequestBatchUniqueId === cleanBatchUUID || b.shipperRequestBatchId === cleanBatchUUID) return true;
        if ((b as any).batch?.batchUniqueId === cleanBatchUUID) return true;
        if ((b as any).shipperRequestBatch?.batchUniqueId === cleanBatchUUID) return true;
      }
      if (order.batchUniqueId) {
        if (b.shipperRequestBatchId === order.batchUniqueId || b.shipperRequestBatchUniqueId === order.batchUniqueId) return true;
      }
      if (rawBatchCandidate) {
        if (b.shipperRequestBatchId === rawBatchCandidate || b.shipperRequestBatchUniqueId === rawBatchCandidate) return true;
      }
      return false;
    });

    const bidsToMap = matching;
    if (bidsToMap.length === 0) return [];

    return bidsToMap.map((b, idx) => {
      const rawBidStatus = String(b.bidStatus || (b as any).status || "").toLowerCase();
      const rawStatus = String((b as any).status || "").toLowerCase();
      const isPending =
        rawBidStatus === "submitted" ||
        rawBidStatus === "pending" ||
        rawBidStatus === "requested" ||
        rawStatus === "submitted" ||
        rawStatus === "pending";

      const isAccepted =
        !isPending &&
        (rawBidStatus === "selected" ||
          rawBidStatus === "accepted" ||
          rawBidStatus === "accepted_by_shipper" ||
          rawStatus === "accepted" ||
          (b.journeyStatusId === 4 && rawBidStatus !== "submitted"));

      const bidUid =
        b.companyBidRequestUniqueId ||
        (b as any).bidUniqueId ||
        (b as any).driverBidUniqueId ||
        (b as any).uniqueId ||
        (b as any).id ||
        (b as any).companyBidRequestId ||
        (b as any).companyBid?.companyBidRequestUniqueId;

      const compName =
        b.companyName ||
        (b as any).company?.companyName ||
        (b as any).company?.name ||
        (b as any).submittedByName ||
        (b as any).fullName ||
        order.targetCompanyName ||
        (t ? t("orders.company", "Company") : "Company");

      const phone =
        (b.companyPhone as string) ||
        (b.phoneNumber as string) ||
        (b as any).phone ||
        (b as any).company?.phoneNumber ||
        order.targetCompanyPhone ||
        undefined;

      const offeredCost =
        Number(
          b.proposedTotalCost ??
          b.proposedCostPerVehicle ??
          (b as any).offerCost ??
          (b as any).bidAmount ??
          (b as any).cost
        ) ||
        (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost);

      const effectiveBidUid = bidUid ? String(bidUid) : undefined;

      return {
        driverRequestId: idx + 1,
        driverRequestUniqueId: effectiveBidUid || `company-bid-${idx + 1}`,
        companyBidRequestUniqueId: effectiveBidUid ?? undefined,
        driverBidUniqueId: effectiveBidUid,
        isCompany: true,
        userUniqueId: b.companyUniqueId || (b as any).company?.uniqueId || targetCompanyId || `company-${idx + 1}`,
        fullName: compName,
        phoneNumber: phone,
        journeyStatusId: isAccepted ? 4 : 1,
        journeyStatus: isAccepted ? "accepted" : "submitted",
        bidStatus: isAccepted ? "selected" : "submitted",
        offerCost: offeredCost,
        proposedCost: offeredCost,
        bidAmount: offeredCost,
        vehicleTypeName: b.vehicleTypeName || (b as any).vehicleType || order.vehicleType,
        rawDriver: b,
      };
    });
  }, [companyBidsData, rawBatchId, cleanBatchUUID, rawBatchCandidate, order, targetCompanyId, t]);

  const realBids = useMemo(
    () => {
      const mapped = mapDriverBidsToRows(Array.isArray(bidsData?.data) ? bidsData.data : []);
      return mapped;
    },
    [bidsData],
  );

  const isCompany = isCompanyTargetBatch || realCompanyBids.length > 0;

  const isDriverAccepted = (driver: ShipperRequestDriverInfo) => {
    const bidStatus = String(driver.bidStatus || "").toLowerCase();
    const journeyStatus = String(driver.journeyStatus || "").toLowerCase();
    if (
      bidStatus === "submitted" ||
      bidStatus === "pending" ||
      bidStatus === "requested" ||
      journeyStatus === "submitted" ||
      journeyStatus === "requested"
    ) {
      return false;
    }

    const sid = extractJourneyStatusId(
      driver.journeyStatusId ?? driver.journeyStatus ?? (driver as any).status,
    );
    if (sid === 1 || sid === 2 || sid === 3) {
      return false;
    }
    return (
      (typeof sid === "number" && sid >= 4 && sid <= 9) ||
      sid === 14 ||
      journeyStatus === "acceptedbyshipper" ||
      bidStatus === "selected" ||
      bidStatus === "accepted" ||
      bidStatus === "accepted_by_shipper"
    );
  };

  const driverRequests: ShipperRequestDriverInfo[] = useMemo(() => {
    if (realCompanyBids.length > 0) {
      return realCompanyBids;
    }

    let rawFallbackDrivers =
      initialRequests && initialRequests.length > 0
        ? initialRequests
        : order.driverRequests || [];

    const hasOnlySyntheticPlaceholder =
      rawFallbackDrivers.length === 1 &&
      !rawFallbackDrivers[0].companyBidRequestUniqueId &&
      !rawFallbackDrivers[0].driverBidUniqueId &&
      (rawFallbackDrivers[0].journeyStatus === "requested" || rawFallbackDrivers[0].bidStatus === "requested");

    if (rawFallbackDrivers.length === 0 || hasOnlySyntheticPlaceholder) {
      const raw = asRecord(order.rawItem);
      const rawBatch = asRecord(raw.batch || (order as any).batch);
      const sid = extractJourneyStatusId(
        order.journeyStatusId ?? order.journeyStatus ?? (order as any).status,
      );
      const isAcceptedOrder =
        (typeof sid === "number" && sid >= 4 && sid <= 9) ||
        sid === 14 ||
        order.status === "complete" ||
        String(order.journeyStatus || (order as any).status || "").toLowerCase() === "acceptedbyshipper";

      const bidsArray =
        (Array.isArray(raw.offers) && raw.offers.length > 0 ? raw.offers : null) ||
        (Array.isArray(raw.companyBids) && raw.companyBids.length > 0 ? raw.companyBids : null) ||
        (Array.isArray(raw.companyBidRequests) && raw.companyBidRequests.length > 0 ? raw.companyBidRequests : null) ||
        (Array.isArray(raw.bids) && raw.bids.length > 0 ? raw.bids : null) ||
        (Array.isArray(rawBatch.offers) && rawBatch.offers.length > 0 ? rawBatch.offers : null) ||
        (Array.isArray(rawBatch.companyBids) && rawBatch.companyBids.length > 0 ? rawBatch.companyBids : null) ||
        (Array.isArray(rawBatch.companyBidRequests) && rawBatch.companyBidRequests.length > 0 ? rawBatch.companyBidRequests : null) ||
        (Array.isArray(rawBatch.bids) && rawBatch.bids.length > 0 ? rawBatch.bids : null) ||
        null;

      if (bidsArray) {
        rawFallbackDrivers = bidsArray.map((b: any, bIdx: number) => {
          const rawBidKey =
            b.companyBidRequestUniqueId ||
            b.driverBidUniqueId ||
            b.bidUniqueId ||
            undefined;
          const bidKeyClean =
            rawBidKey && !targetCompanyUUIDs.includes(rawBidKey)
              ? rawBidKey
              : undefined;
          const rawBidStatus = String(b.bidStatus || b.status || "").toLowerCase();
          const isPending =
            rawBidStatus === "submitted" ||
            rawBidStatus === "pending" ||
            rawBidStatus === "requested";

          const isMatchingAcceptedOffer = Boolean(
            raw.acceptedOffer &&
            bidKeyClean &&
            (asRecord(raw.acceptedOffer).companyBidRequestUniqueId === bidKeyClean ||
             asRecord(raw.acceptedOffer).bidUniqueId === bidKeyClean ||
             asRecord(raw.acceptedOffer).userUniqueId === b.userUniqueId)
          );

          const isAccepted =
            !isPending &&
            (rawBidStatus === "selected" ||
              rawBidStatus === "accepted" ||
              rawBidStatus === "accepted_by_shipper" ||
              isMatchingAcceptedOffer);

          return {
            driverRequestId: b.driverRequestId ?? bIdx + 1,
            driverRequestUniqueId: bidKeyClean,
            companyBidRequestUniqueId: bidKeyClean,
            driverBidUniqueId: bidKeyClean,
            isCompany: true,
            userUniqueId: b.userUniqueId || b.companyUniqueId || `company-${bIdx + 1}`,
            fullName:
              b.companyName ||
              b.submittedByName ||
              b.fullName ||
              (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal"),
            phoneNumber: b.companyPhone || b.phoneNumber || b.phone || undefined,
            journeyStatusId: isAccepted ? 4 : (isPending ? 1 : (b.journeyStatusId ?? 1)),
            journeyStatus: isAccepted ? "accepted" : (b.bidStatus || "submitted"),
            bidStatus: isAccepted ? "selected" : (b.bidStatus || "submitted"),
            offerCost:
              Number(
                b.proposedTotalCost ||
                  b.proposedCostPerVehicle ||
                  b.offerCost ||
                  b.bidAmount ||
                  (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
              ) || order.cost,
            vehicleTypeName: b.vehicleTypeName || b.offeredVehicleTypeName || order.vehicleType,
          };
        });
      }

      if (rawFallbackDrivers.length === 0) {
        const hasExplicitTargetCompany = Boolean(
          raw.targetCompanyName ||
          rawBatch.targetCompanyName ||
          raw.targetCompanyUniqueId ||
          rawBatch.targetCompanyUniqueId ||
          asRecord(raw.targetCompany).name ||
          asRecord(rawBatch.targetCompany).name ||
          targetCompanyId,
        );

        const companyName =
          (raw.targetCompanyName as string) ||
          (rawBatch.targetCompanyName as string) ||
          (asRecord(raw.acceptedOffer).companyName as string) ||
          (asRecord(raw.acceptedOffer).fullName as string) ||
          (asRecord(raw.targetCompany).name as string) ||
          (raw.companyName as string) ||
          (raw.driverName as string) ||
          (raw.fullName as string) ||
          (isAcceptedOrder
            ? (isCompany
              ? t("orders.acceptedCompany", "Accepted Transport Company")
              : t("orders.acceptedDriver", "Accepted Driver"))
            : hasExplicitTargetCompany
              ? (isCompany
                ? t("orders.waitingCompany", "Company Proposal")
                : t("orders.waitingDriver", "Driver"))
              : null);

        if (companyName) {
          const rawBidId =
            (asRecord(raw.acceptedOffer).companyBidRequestUniqueId as string) ||
            (raw.companyBidRequestUniqueId as string) ||
            (rawBatch.companyBidRequestUniqueId as string) ||
            undefined;

          const realBidIdClean =
            rawBidId &&
            !targetCompanyUUIDs.includes(rawBidId) &&
            rawBidId !== raw.targetCompanyUniqueId &&
            rawBidId !== rawBatch.targetCompanyUniqueId
              ? rawBidId
              : undefined;

          const targetUid =
            (raw.targetCompanyUniqueId as string) ||
            (rawBatch.targetCompanyUniqueId as string) ||
            targetCompanyId ||
            order.batchUniqueId ||
            order.shipperRequestUniqueId ||
            order.id ||
            "company-proposal";

          const isSubmitted = Boolean(realBidIdClean);

          const resolvedStatusId = isAcceptedOrder
            ? (sid ?? order.journeyStatusId ?? 4)
            : isSubmitted
              ? 1
              : 2;
          const resolvedJourneyStatus = isAcceptedOrder
            ? "accepted"
            : isSubmitted
              ? "submitted"
              : "requested";
          const resolvedBidStatus = isAcceptedOrder
            ? "selected"
            : isSubmitted
              ? "submitted"
              : "requested";

          rawFallbackDrivers = [
            {
              driverRequestId: 1,
              driverRequestUniqueId: realBidIdClean || `company-proposal-${order.id || 1}`,
              companyBidRequestUniqueId: realBidIdClean || undefined,
              driverBidUniqueId: realBidIdClean || undefined,
              isCompany: true,
              userUniqueId: targetUid,
              fullName: companyName,
              phoneNumber:
                (asRecord(raw.acceptedOffer).phoneNumber as string) ||
                (asRecord(raw.acceptedOffer).phone as string) ||
                (raw.targetCompanyPhone as string) ||
                (rawBatch.targetCompanyPhone as string) ||
                order.targetCompanyPhone ||
                undefined,
              journeyStatusId: resolvedStatusId,
              journeyStatus: resolvedJourneyStatus,
              bidStatus: resolvedBidStatus,
              offerCost:
                Number(
                  asRecord(raw.acceptedOffer).offerCost ??
                  asRecord(raw.acceptedOffer).bidAmount ??
                  (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
                ) || (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
              vehicleTypeName: order.vehicleType,
            },
          ];
        }
      }
    }

    // Keep accepted proposals and real bids; only filter out empty synthetic placeholders
    const hasRealProposal = rawFallbackDrivers.some(
      (d) => Boolean(d.companyBidRequestUniqueId || d.driverBidUniqueId) || d.bidStatus === "submitted",
    );
    const filteredFallback = rawFallbackDrivers.filter((d) => {
      if (
        hasRealProposal &&
        (d.journeyStatus === "requested" || d.bidStatus === "requested") &&
        !d.companyBidRequestUniqueId &&
        !d.driverBidUniqueId
      ) {
        return false;
      }
      if (isDriverAccepted(d)) return true;
      if (isCompany) return true;
      if (String(d.driverRequestUniqueId || "").startsWith("bid-")) {
        return Boolean(d.companyBidRequestUniqueId || d.driverBidUniqueId || d.fullName);
      }
      return true;
    });

    // Deduplicate to ensure no company/driver is rendered twice
    const fallbackDrivers: ShipperRequestDriverInfo[] = [];
    const seenFallbackKeys = new Set<string>();
    const sortedFallback = [...filteredFallback].sort((a, b) => {
      const aAcc = isDriverAccepted(a);
      const bAcc = isDriverAccepted(b);
      if (aAcc && !bAcc) return -1;
      if (!aAcc && bAcc) return 1;
      return 0;
    });

    for (const d of sortedFallback) {
      const key =
        d.companyBidRequestUniqueId ||
        d.driverBidUniqueId ||
        d.userUniqueId ||
        (d.phoneNumber ? `phone-${d.phoneNumber}` : "") ||
        (d.fullName ? `name-${d.fullName.trim().toLowerCase()}` : "") ||
        d.driverRequestUniqueId ||
        "";
      if (key && seenFallbackKeys.has(key)) continue;
      if (key) {
        seenFallbackKeys.add(key);
        if (d.phoneNumber) seenFallbackKeys.add(`phone-${d.phoneNumber}`);
        if (d.fullName) seenFallbackKeys.add(`name-${d.fullName.trim().toLowerCase()}`);
      }
      fallbackDrivers.push(d);
    }

    if (realBids.length === 0) return fallbackDrivers;

    const byKey = new Map<string, ShipperRequestDriverInfo>();
    for (const d of fallbackDrivers) {
      const key = d.driverRequestUniqueId || d.userUniqueId || d.phoneNumber || "";
      if (key) byKey.set(key, d);
    }

    return realBids.map((bid) => {
      const key = bid.driverRequestUniqueId || bid.userUniqueId || bid.phoneNumber || "";
      const match = key ? byKey.get(key) : undefined;
      if (!match) return bid;
      return {
        ...bid,
        journeyStatusId: match.journeyStatusId ?? bid.journeyStatusId,
        journeyStatus: match.journeyStatus ?? bid.journeyStatus,
        queueNumber: match.queueNumber ?? (match as any).entry?.queueNumber ?? (bid as any).queueNumber ?? null,
        loadingOrderNumber: match.loadingOrderNumber ?? (match as any).entry?.loadingOrderNumber ?? (bid as any).loadingOrderNumber ?? null,
      };
    });
  }, [realCompanyBids, realBids, initialRequests, order, isCompanyTargetBatch, targetCompanyUUIDs, targetCompanyId, isCompany, t]);

  const isQueryLoading = Boolean(
    (shouldFetchCompanyBids && (isCompanyBidsLoading || (isCompanyBidsFetching && !companyBidsData))) ||
    (!isCompanyTargetBatch && shipperRequestUniqueId && (isBidsLoading || (isBidsFetching && !bidsData)))
  );

  const isLoadingProposals = isQueryLoading && driverRequests.length === 0;

  const driverEntryKey = (driver: ShipperRequestDriverInfo, idx: number) =>
    driver.companyBidRequestUniqueId ||
    driver.driverBidUniqueId ||
    driver.userUniqueId ||
    driver.phoneNumber ||
    String(driver.driverRequestId || driver.driverRequestUniqueId || idx);

  return {
    isCompany,
    driverRequests,
    isLoadingProposals,
    isDriverAccepted,
    driverEntryKey,
  };
}
