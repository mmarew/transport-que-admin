import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractJourneyStatusId } from "../../utils/journeyStatus";
import {
  asRecord,
  extractUUID,
  extractCompanyUUIDs,
  findUUIDInExcluding,
} from "./bids/orderIdLookup";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "./OrdersTypes";
import { Modal } from "../ui/Modal";
import { OrderSummaryCard } from "./bids/OrderSummaryCard";
import { BidsToolbar, type BidsSortOption } from "./bids/BidsToolbar";
import { BidEmptyState } from "./bids/BidEmptyState";
import { BidRow } from "./bids/BidRow";
import { useDriverBidsFilter } from "./bids/useDriverBidsFilter";
import { useAcceptDriverBid } from "./bids/useAcceptDriverBid";
import { mapDriverBidsToRows } from "./bids/mapDriverBids";
import { useGetBidsForOrderQuery, useGetCompanyBidsQuery } from "@/lib/redux/api";
import "./DriverBidsModal.css";

interface DriverBidsModalProps {
  order: OrderDisplayItem;
  queueOrganizationUniqueId: string;
  driverRequests?: ShipperRequestDriverInfo[];
  /** Required vehicles for this batch, from the backend (batch group count).
   *  `order.totalVehicles` is unset for shipper-request rows, so without this
   *  the counter fell back to a hardcoded 3. */
  totalVehicles?: number;
  /** Trucks already committed to the batch, from the backend batch-group count
   *  (accepted + active). The bids-board rows carry no journey status, so the
   *  header counter would otherwise read 0/4 while the card says 3 Accepted. */
  acceptedVehicles?: number;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function DriverBidsModal({
  order,
  queueOrganizationUniqueId,
  driverRequests: initialRequests,
  totalVehicles,
  acceptedVehicles,
  onClose,
  onOrderUpdated,
}: DriverBidsModalProps) {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<BidsSortOption>("nearest");
  const [displayLimit, setDisplayLimit] = useState<number>(25);

  const isCompany =
    order.type === "Group" ||
    String((order.rawItem as any)?.requestMode || "").toLowerCase().includes("company") ||
    String((order.rawItem as any)?.shipperRequest?.requestMode || "").toLowerCase().includes("company");

  const targetCompanyUUIDs = useMemo(
    () => extractCompanyUUIDs(order, order.rawItem, asRecord(order.rawItem).shipperRequest),
    [order],
  );

  const isCompanyTargetBatch =
    isCompany ||
    targetCompanyUUIDs.length > 0 ||
    Boolean(order.targetCompanyUniqueId) ||
    Boolean((order.rawItem as any)?.targetCompanyUniqueId);

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
  const { data: bidsData } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: shipperRequestUniqueId ?? "" },
    { skip: !shipperRequestUniqueId || isCompanyTargetBatch },
  );

  const targetCompanyId =
    targetCompanyUUIDs[0] ||
    (order.rawItem as any)?.targetCompanyUniqueId ||
    (order.rawItem as any)?.targetCompany?.uniqueId ||
    undefined;

  const batchUniqueId =
    (order.batchUniqueId && !targetCompanyUUIDs.includes(order.batchUniqueId)
      ? extractUUID(order.batchUniqueId)
      : undefined) ||
    (order.rawItem as any)?.batchUniqueId ||
    (order.rawItem as any)?.shipperRequestBatchUniqueId ||
    (order.rawItem as any)?.shipperRequestBatchId ||
    undefined;

  // Company bids query: fetch bids submitted via POST /api/company/bids
  const shouldFetchCompanyBids = Boolean(isCompanyTargetBatch || targetCompanyId);
  const { data: companyBidsData } = useGetCompanyBidsQuery(
    {
      companyUniqueId: targetCompanyId,
      target: "submitted",
    },
    { skip: !shouldFetchCompanyBids },
  );

  const realCompanyBids = useMemo<ShipperRequestDriverInfo[]>(() => {
    const rawList = Array.isArray(companyBidsData?.data) ? companyBidsData.data : [];
    if (rawList.length === 0) return [];

    const orderNum = String(order.id || "").replace(/\D/g, "");
    const matching = rawList.filter((b) => {
      // 1. Numeric batchId match (e.g. Order #4 matches batchId 4)
      if (order.batchId != null && b.batchId != null && String(order.batchId) === String(b.batchId)) return true;
      if (orderNum && b.batchId != null && String(b.batchId) === orderNum) return true;
      // 2. String/UUID batchId match
      if (batchUniqueId && (b.shipperRequestBatchId === batchUniqueId || b.shipperRequestBatchUniqueId === batchUniqueId)) return true;
      if (order.batchUniqueId && (b.shipperRequestBatchId === order.batchUniqueId || b.shipperRequestBatchUniqueId === order.batchUniqueId)) return true;
      // 3. If there is only one company target and batch ID is not specified on bid, accept it
      if (!b.batchId && !b.shipperRequestBatchId) return true;
      return false;
    });

    const bidsToMap = matching.length > 0 ? matching : rawList;

    return bidsToMap.map((b, idx) => {
      const isAccepted =
        b.bidStatus === "selected" ||
        b.bidStatus === "accepted" ||
        b.bidStatus === "accepted_by_shipper" ||
        b.journeyStatusId === 4;

      const bidUid = b.companyBidRequestUniqueId;

      return {
        driverRequestId: idx + 1,
        driverRequestUniqueId: bidUid,
        companyBidRequestUniqueId: bidUid,
        driverBidUniqueId: bidUid,
        isCompany: true,
        userUniqueId: b.companyUniqueId || targetCompanyId || `company-${idx + 1}`,
        fullName:
          b.companyName ||
          order.targetCompanyName ||
          (t ? t("orders.waitingCompany", "Company Proposal") : "Company Proposal"),
        phoneNumber:
          (b.companyPhone as string) ||
          (b.phoneNumber as string) ||
          order.targetCompanyPhone ||
          undefined,
        journeyStatusId: isAccepted ? 4 : (b.journeyStatusId ?? 1),
        journeyStatus: isAccepted ? "accepted" : (b.bidStatus || "submitted"),
        bidStatus: isAccepted ? "selected" : (b.bidStatus || "submitted"),
        offerCost:
          Number(b.proposedTotalCost ?? b.proposedCostPerVehicle) ||
          (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
        proposedCost:
          Number(b.proposedTotalCost ?? b.proposedCostPerVehicle) ||
          (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
        bidAmount:
          Number(b.proposedTotalCost ?? b.proposedCostPerVehicle) ||
          (order.type === "Group" && order.batchTotalCost ? order.batchTotalCost : order.cost),
        vehicleTypeName: b.vehicleTypeName || order.vehicleType,
        rawDriver: b,
      };
    });
  }, [companyBidsData, batchUniqueId, targetCompanyId, order, t]);

  const realBids = useMemo(
    () => {
      const mapped = mapDriverBidsToRows(Array.isArray(bidsData?.data) ? bidsData.data : []);
      if (mapped.length > 0) console.log("Real bids mapped:", mapped);
      return mapped;
    },
    [bidsData],
  );

  // The bids endpoint is authoritative for who actually bid, but a DriverBid
  // row carries no journey status (the DriverBid payload has none). The
  // shipper/batch payload rows do, so join the journey back onto the bid row.
  // Otherwise a driver who is already Loading (status 6) reads as an open bid
  // and the accepted counter under-reports (e.g. 0/5 while one truck loads).
  const isDriverAccepted = (driver: ShipperRequestDriverInfo) => {
    const sid = extractJourneyStatusId(
      driver.journeyStatusId ?? driver.journeyStatus ?? (driver as any).status,
    );
    // Status 3 is "Accepted by Driver" — the driver accepted/made an offer,
    // but the shipper has NOT accepted the offer yet. It must NOT be marked accepted!
    if (sid === 3) {
      return false;
    }
    return (
      (typeof sid === "number" && sid >= 4 && sid <= 9) ||
      sid === 14 ||
      driver.journeyStatus === "acceptedByShipper" ||
      driver.bidStatus === "selected" ||
      driver.bidStatus === "accepted"
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

    if (rawFallbackDrivers.length === 0) {
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
          const bidKey = bidKeyClean || `bid-${bIdx + 1}`;
          const isAccepted =
            b.bidStatus === "selected" ||
            b.bidStatus === "accepted" ||
            b.bidStatus === "accepted_by_shipper" ||
            b.journeyStatusId === 4 ||
            isAcceptedOrder;
          return {
            driverRequestId: b.driverRequestId ?? bIdx + 1,
            driverRequestUniqueId: bidKey,
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
            journeyStatusId: isAccepted ? 4 : (b.journeyStatusId ?? 1),
            journeyStatus: isAccepted ? "accepted" : (b.journeyStatus || "submitted"),
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
        const companyName =
          (raw.targetCompanyName as string) ||
          (rawBatch.targetCompanyName as string) ||
          (asRecord(raw.acceptedOffer).companyName as string) ||
          (asRecord(raw.acceptedOffer).fullName as string) ||
          (asRecord(raw.targetCompany).name as string) ||
          (raw.companyName as string) ||
          (raw.driverName as string) ||
          (raw.fullName as string) ||
          (isCompany
            ? (isAcceptedOrder
              ? t("orders.acceptedCompany", "Accepted Transport Company")
              : t("orders.waitingCompany", "Company Proposal"))
            : (isAcceptedOrder ? t("orders.acceptedDriver", "Accepted Driver") : null));

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

          const isSubmitted =
            Boolean(realBidIdClean) ||
            raw.bidStatus === "submitted" ||
            rawBatch.bidStatus === "submitted";

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
    const filteredFallback = rawFallbackDrivers.filter((d) => {
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
  }, [realCompanyBids, realBids, initialRequests, order, isCompany, targetCompanyUUIDs, targetCompanyId, t]);

  const requiredVehicles = totalVehicles ?? order.totalVehicles;

  const driverEntryKey = (driver: ShipperRequestDriverInfo, idx: number) =>
    driver.userUniqueId ||
    driver.phoneNumber ||
    String(driver.driverRequestId || driver.driverRequestUniqueId || idx);

  const { acceptingDriverId, acceptedDriverIds, handleAcceptDriver } =
    useAcceptDriverBid(order, queueOrganizationUniqueId, onOrderUpdated);

  const acceptedKeys = new Set<string | number>(acceptedDriverIds);
  driverRequests.forEach((d, idx) => {
    if (isDriverAccepted(d)) acceptedKeys.add(driverEntryKey(d, idx));
  });
  const orderSid = extractJourneyStatusId(
    order.journeyStatusId ?? order.journeyStatus ?? (order as any).status,
  );
  const isOrderShipperAccepted =
    typeof orderSid === "number" && ((orderSid >= 4 && orderSid <= 9) || orderSid === 14);

  const acceptedCount =
    acceptedVehicles != null && acceptedVehicles > 0
      ? Math.max(acceptedVehicles, acceptedKeys.size)
      : acceptedKeys.size > 0
      ? acceptedKeys.size
      : isOrderShipperAccepted
      ? requiredVehicles || 1
      : 0;

  const { filteredAndSortedDrivers, visibleDrivers, hasAnyAcceptedDriver } =
    useDriverBidsFilter({
      driverRequests,
      order,
      searchTerm,
      sortBy,
      displayLimit,
      acceptedDriverIds,
    });

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="orders"
      containerClassName="dbm-modal-content"
      hideCloseButton={true}
    >
      {/* Header */}
      <div className="dbm-header">
        <div className="dbm-title-area">
          <h3 id="dbm-title" className="dbm-title">
            {isCompany
              ? t("orders.companyBidsTitle", "Company Bids & Proposals")
              : t("orders.driverBidsTitle", "Driver Bids & Proposals")}
          </h3>
          <p className="dbm-subtitle">
            {isCompany
              ? t(
                  "orders.companyBidsSubtitle",
                  "Review proposals from transport companies and accept one for this order.",
                )
              : t(
                  "orders.driverBidsSubtitle",
                  "Review proposals from drivers and accept one for this order.",
                )}
          </p>
        </div>
        <button
          type="button"
          className="dbm-close-btn"
          onClick={onClose}
          aria-label={t("common.close", "Close")}
        >
          <X size={20} />
        </button>
      </div>

      {/* Bids List Section with Order Summary */}
      <div className="dbm-body">
        {/* Order Summary Banner */}
        <OrderSummaryCard order={order} />

        <div className="dbm-section-header">
          <h4 className="dbm-section-title">
            {isCompany
              ? t("orders.companyRequests", "Company Requests")
              : t("orders.driverRequests", "Driver Requests")}
          </h4>
          <span className="dbm-section-counter">
            {acceptedCount}
            {requiredVehicles ? `/${requiredVehicles}` : ""}
          </span>
        </div>


        {driverRequests.length > 0 && (
          <BidsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            displayLimit={displayLimit}
            onDisplayLimitChange={setDisplayLimit}
            shownCount={visibleDrivers.length}
            totalFiltered={filteredAndSortedDrivers.length}
            onShowAll={() => setDisplayLimit(0)}
            isCompany={isCompany}
          />
        )}

        {driverRequests.length === 0 || visibleDrivers.length === 0 ? (
          <BidEmptyState
            hasAnyBids={driverRequests.length > 0}
            onClearSearch={() => setSearchTerm("")}
            isCompany={isCompany}
          />
        ) : (
          <div className="dbm-bids-list">
            {visibleDrivers.map((driver, idx) => {
              const driverKey = driverEntryKey(driver, idx);
              return (
                <BidRow
                  key={driverKey}
                  driver={driver}
                  order={order}
                  isAccepted={isDriverAccepted(driver)}
                  hasAnyAcceptedDriver={hasAnyAcceptedDriver}
                  isAccepting={acceptingDriverId === driverKey}
                  isAnyAccepting={acceptingDriverId !== null}
                  isCompany={isCompany}
                  onAccept={handleAcceptDriver}
                />
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DriverBidsModal;
