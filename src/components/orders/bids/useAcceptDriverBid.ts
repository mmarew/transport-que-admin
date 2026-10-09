import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAcceptDriverRequestMutation } from "@/lib/redux/api";
import parseError from "@/utils/parseError";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";
import {
  asRecord,
  findUUIDIn,
  findIdIn,
  findFirstValidId,
  isUUID,
  extractUUID,
  extractCompanyUUIDs,
  findUUIDInExcluding,
} from "./orderIdLookup";

const BID_ID_KEYS = [
  "companyBidRequestUniqueId",
  "driverBidUniqueId",
  "company_bid_request_unique_id",
  "driver_bid_unique_id",
  "driverBidRequestUniqueId",
  "bidUniqueId",
  "bid_unique_id",
  "companyBidUniqueId",
  "company_bid_unique_id",
  "driverBidId",
  "bidId",
];

const SHIPPER_REQ_ID_KEYS = [
  "shipperRequestUniqueId",
  "shipper_request_unique_id",
  "uniqueId",
  "id",
];

const DRIVER_REQ_ID_KEYS = [
  "driverRequestUniqueId",
  "driver_request_unique_id",
  "driverRequestId",
  "driver_request_id",
  "bidUniqueId",
  "userUniqueId",
  "driverUserUniqueId",
];

const JOURNEY_DECISION_KEYS = [
  "journeyDecisionUniqueId",
  "journey_decision_unique_id",
];

/**
 * Accept one bid or driver proposal for an order.
 *
 * Supports both:
 * 1. Authoritative bid rows (companyBidRequestUniqueId / driverBidUniqueId)
 *    sent to PUT /api/company/bids/:companyBidRequestUniqueId/status.
 * 2. Driver proposals / offers on shipper requests (driverRequestUniqueId)
 *    sent to PUT /api/shipper/acceptDriverOffer.
 */
export function useAcceptDriverBid(
  order: OrderDisplayItem,
  queueOrganizationUniqueId: string,
  onOrderUpdated?: () => void,
) {
  const { t } = useTranslation();
  const [acceptDriverMutation] = useAcceptDriverRequestMutation();
  const [acceptingDriverId, setAcceptingDriverId] = useState<string | null>(null);
  const [acceptedDriverIds, setAcceptedDriverIds] = useState<Set<string>>(
    new Set(),
  );

  const handleAcceptDriver = async (driver: ShipperRequestDriverInfo) => {
    const rawDriver = asRecord(driver);

    // 0. Extract all company UUIDs to avoid treating them as bids or order UUIDs
    const companyUUIDs = extractCompanyUUIDs(
      order,
      order.rawItem,
      asRecord(order.rawItem).shipperRequest,
      driver,
      rawDriver,
    );

    // 1. Resolve bid id (preferred for auction / company bids)
    const companyBidRequestUniqueId =
      findUUIDInExcluding(
        BID_ID_KEYS,
        companyUUIDs,
        driver,
        rawDriver,
        asRecord(rawDriver.companyBidRequest),
        asRecord(rawDriver.companyBid),
      );

    // 2. Resolve shipper request id (clean 36-char GUID without client suffixes and excluding company UUIDs)
    const shipperRequestUniqueId =
      findUUIDInExcluding(
        SHIPPER_REQ_ID_KEYS,
        companyUUIDs,
        order,
        order.rawItem,
        asRecord(order.rawItem).shipperRequest,
        driver,
        rawDriver,
      ) ||
      (order.batchUniqueId && !companyUUIDs.includes(order.batchUniqueId)
        ? extractUUID(order.batchUniqueId)
        : undefined) ||
      (order.id && !companyUUIDs.includes(order.id)
        ? extractUUID(order.id)
        : undefined);

    // 3. Resolve driver request id
    const driverRequestUniqueId =
      findUUIDInExcluding(DRIVER_REQ_ID_KEYS, companyUUIDs, driver, rawDriver) ||
      findIdIn(DRIVER_REQ_ID_KEYS, driver, rawDriver) ||
      driverRequestUniqueIdFallback(driver, rawDriver) ||
      undefined;

    // 4. Resolve journey decision id
    const orderDecisions = Array.isArray(order.decisions)
      ? order.decisions
      : Array.isArray(asRecord(order.rawItem).decisions)
        ? (asRecord(order.rawItem).decisions as any[])
        : [];
    const matchingDecision =
      orderDecisions.find(
        (dec: any) =>
          (dec.driverRequestId != null && dec.driverRequestId === driver.driverRequestId) ||
          (dec.driverRequestUniqueId && dec.driverRequestUniqueId === driver.driverRequestUniqueId) ||
          (dec.driverUserUniqueId && dec.driverUserUniqueId === driver.userUniqueId),
      ) || (orderDecisions.length === 1 ? orderDecisions[0] : null);

    const journeyDecisionUniqueId =
      findUUIDIn(JOURNEY_DECISION_KEYS, driver, rawDriver, matchingDecision) ||
      findIdIn(JOURNEY_DECISION_KEYS, driver, rawDriver, matchingDecision);

    // 5. Resolve queue organization id
    const resolvedQueueOrgId =
      queueOrganizationUniqueId ||
      order.queueOrganizationUniqueId ||
      findFirstValidId("queueOrganizationUniqueId", order, order.rawItem, asRecord(order.rawItem).shipperRequest, driver, rawDriver) ||
      "";

    if (
      driver.bidStatus === "requested" ||
      driver.journeyStatus === "requested" ||
      driver.journeyStatusId === 2
    ) {
      toast.error(
        t(
          "orders.companyAwaitingResponse",
          "This company has been requested but has not submitted a bid or accepted yet.",
        ),
      );
      return;
    }

    const rawEffectiveBidId =
      companyBidRequestUniqueId ||
      (driver.companyBidRequestUniqueId && !companyUUIDs.includes(driver.companyBidRequestUniqueId)
        ? extractUUID(driver.companyBidRequestUniqueId)
        : undefined) ||
      (driver.driverBidUniqueId && !companyUUIDs.includes(driver.driverBidUniqueId)
        ? extractUUID(driver.driverBidUniqueId)
        : undefined) ||
      (driver.bidUniqueId && !companyUUIDs.includes(driver.bidUniqueId)
        ? extractUUID(driver.bidUniqueId)
        : undefined);

    const effectiveBidId =
      rawEffectiveBidId && !companyUUIDs.includes(rawEffectiveBidId)
        ? rawEffectiveBidId
        : undefined;

    const isCompanyOrder =
      order.type === "Group" ||
      Boolean(order.targetCompanyUniqueId || asRecord(order.rawItem).targetCompanyUniqueId) ||
      Boolean(companyUUIDs.length > 0) ||
      Boolean(driver.isCompany || rawDriver.isCompany);

    // If this is a company order, it MUST have a real bid id from the company
    if (isCompanyOrder && !effectiveBidId) {
      toast.error(
        t(
          "orders.bidCannotBeAccepted",
          "This bid cannot be accepted: it is missing the bid id. Reload the bids and try again.",
        ),
      );
      return;
    }

    // Validate: must have either a bid id (for auction/company bids)
    // or valid driver request IDs including journeyDecisionUniqueId (for direct shipper offers)
    const hasBidId = Boolean(effectiveBidId);
    const hasDriverRequest = Boolean(
      isUUID(shipperRequestUniqueId) &&
      isUUID(driverRequestUniqueId) &&
      isUUID(journeyDecisionUniqueId)
    );

    if (!hasBidId && !hasDriverRequest) {
      toast.error(
        t(
          "orders.bidCannotBeAccepted",
          "This bid cannot be accepted: it is missing the bid id. Reload the bids and try again.",
        ),
      );
      return;
    }

    const driverKey =
      driver.userUniqueId ||
      (typeof rawDriver.driverUserUniqueId === "string"
        ? rawDriver.driverUserUniqueId
        : undefined) ||
      driver.phoneNumber ||
      driver.driverBidUniqueId ||
      companyBidRequestUniqueId ||
      String(driver.driverRequestId || driverRequestUniqueIdFallback(driver, rawDriver));

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId: resolvedQueueOrgId,
        companyBidRequestUniqueId: effectiveBidId,
        bidStatus: "accepted_by_shipper",
        shipperRequestUniqueId,
        driverRequestUniqueId,
        driverRequestId: driver.driverRequestId ?? (rawDriver.driverRequestId as any),
        driverPhoneNumber: driver.phoneNumber ?? (rawDriver.driverPhoneNumber as any),
        driverUserUniqueId: driver.userUniqueId ?? (rawDriver.driverUserUniqueId as any),
        journeyDecisionUniqueId,
        vehicleTypeUniqueId: order.vehicleTypeUniqueId ?? (rawDriver.vehicleTypeUniqueId as any),
        queueUniqueId: (rawDriver.queueUniqueId ?? rawDriver.driverQueueUniqueId) as any,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        isCompanyOrder
          ? t("orders.companyRequestAccepted", "Company request accepted successfully")
          : t("orders.driverRequestAccepted", "Driver request accepted successfully"),
      );
      onOrderUpdated?.();
    } catch (err: unknown) {
      toast.error(parseError(err));
    } finally {
      setAcceptingDriverId(null);
    }
  };

  return {
    acceptingDriverId,
    acceptedDriverIds,
    handleAcceptDriver,
  };
}

function driverRequestUniqueIdFallback(
  driver: ShipperRequestDriverInfo,
  rawDriver: Record<string, unknown>,
): string {
  const id =
    driver.driverRequestUniqueId ||
    (typeof rawDriver.driverRequestUniqueId === "string"
      ? rawDriver.driverRequestUniqueId
      : driver.driverRequestId) ||
    "";
  return String(id || "");
}