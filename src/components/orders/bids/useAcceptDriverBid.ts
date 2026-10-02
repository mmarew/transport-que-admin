import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAcceptDriverRequestMutation } from "@/lib/redux/api";
import parseError from "@/utils/parseError";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";
import { asRecord, findUUIDIn } from "./orderIdLookup";

/**
 * Accept one bid for an order.
 *
 * The bid rows this modal renders come from GET /api/queue/bidding/order/:id/bids,
 * so every id needed to accept is already on the row — see mapDriverBidToRow.
 * Nothing is inferred here.
 *
 * This previously scraped six candidate values off the order and the row,
 * cross-matched them against order.decisions, and fell back to
 * "if there is exactly one decision, it must belong to this driver". Under a
 * concurrent bid that resolves to the wrong driver with no error surfaced, and
 * it silently accepted an unrelated decision when the ids were absent. A bid
 * that cannot be identified now fails loudly instead of guessing.
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

    // The order id has to be a real UUID — the endpoint is keyed on it.
    const shipperRequestUniqueId = findUUIDIn(
      "shipperRequestUniqueId",
      order,
      order.rawItem,
      asRecord(order.rawItem).shipperRequest,
      rawDriver,
    );

    const driverRequestUniqueId = findUUIDIn(
      "driverRequestUniqueId",
      driver,
      rawDriver,
    );

    if (!shipperRequestUniqueId || !driverRequestUniqueId) {
      toast.error(
        t(
          "orders.bidCannotBeAccepted",
          "This bid cannot be accepted: it is missing the order or driver request id. Reload the bids and try again.",
        ),
      );
      return;
    }

    const journeyDecisionUniqueId = findUUIDIn(
      "journeyDecisionUniqueId",
      driver,
      rawDriver,
    );

    const driverKey =
      driver.userUniqueId ||
      (typeof rawDriver.driverUserUniqueId === "string"
        ? rawDriver.driverUserUniqueId
        : undefined) ||
      driver.phoneNumber ||
      driver.driverBidUniqueId ||
      String(driver.driverRequestId || driverRequestUniqueId);

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId,
        shipperRequestUniqueId,
        driverUserUniqueId: driver.userUniqueId,
        driverRequestId: driver.driverRequestId,
        driverRequestUniqueId,
        journeyDecisionUniqueId,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        t("orders.driverRequestAccepted", "Driver request accepted successfully"),
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