import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAcceptDriverRequestMutation } from "@/lib/redux/api";
import parseError from "@/utils/parseError";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";

const isUUID = (val?: unknown): val is string =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val.trim(),
  );

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
    const rawDriver = driver as any;
    const driverKey =
      driver.userUniqueId ||
      rawDriver.driverUserUniqueId ||
      driver.phoneNumber ||
      rawDriver.driverPhoneNumber ||
      String(driver.driverRequestId || driver.driverRequestUniqueId || "");
    if (!driverKey) return;

    const candidateReqIds = [
      order.id,
      (order as any).shipperRequestUniqueId,
      (order.rawItem as any)?.shipperRequestUniqueId,
      (order.rawItem as any)?.shipperRequest?.shipperRequestUniqueId,
      (order.rawItem as any)?.shipper_request_unique_id,
      rawDriver.shipperRequestUniqueId,
      rawDriver.shipper_request_unique_id,
      driver.driverRequestUniqueId,
    ];
    const resolvedShipperRequestUniqueId =
      candidateReqIds.find(isUUID) || order.id;

    const candidateOrgIds = [
      order.queueOrganizationUniqueId,
      queueOrganizationUniqueId,
      (order.rawItem as any)?.queueOrganizationUniqueId,
      (order.rawItem as any)?.shipperRequest?.queueOrganizationUniqueId,
      (order.rawItem as any)?.queue_organization_unique_id,
      rawDriver.queueOrganizationUniqueId,
    ];
    const resolvedQueueOrgId =
      candidateOrgIds.find(isUUID) ||
      order.queueOrganizationUniqueId ||
      queueOrganizationUniqueId ||
      "";

    const candidateVehicleTypeIds = [
      order.vehicleTypeUniqueId,
      (order.rawItem as any)?.vehicleTypeUniqueId,
      (order.rawItem as any)?.shipperRequest?.vehicleTypeUniqueId,
      (order.rawItem as any)?.vehicle_type_unique_id,
      rawDriver.vehicleTypeUniqueId,
    ];
    const resolvedVehicleTypeId =
      candidateVehicleTypeIds.find(isUUID) ||
      order.vehicleTypeUniqueId ||
      undefined;

    const orderDecisions: any[] =
      order.decisions || (order.rawItem as any)?.decisions || [];
    const matchingDecision =
      orderDecisions.find(
        (dec: any) =>
          (dec.driverRequestId != null &&
            dec.driverRequestId === driver.driverRequestId) ||
          (dec.driverRequestUniqueId &&
            dec.driverRequestUniqueId === driver.driverRequestUniqueId) ||
          (dec.driverUserUniqueId &&
            dec.driverUserUniqueId === driver.userUniqueId),
      ) || (orderDecisions.length === 1 ? orderDecisions[0] : null);

    const resolvedJourneyDecisionUniqueId =
      driver.journeyDecisionUniqueId ||
      rawDriver.journeyDecisionUniqueId ||
      matchingDecision?.journeyDecisionUniqueId ||
      undefined;

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId: resolvedQueueOrgId,
        shipperRequestUniqueId: resolvedShipperRequestUniqueId,
        driverPhoneNumber:
          driver.phoneNumber || rawDriver.driverPhoneNumber || undefined,
        driverUserUniqueId:
          driver.userUniqueId || rawDriver.driverUserUniqueId || undefined,
        driverRequestId:
          driver.driverRequestId || rawDriver.driverRequestId || undefined,
        driverRequestUniqueId:
          driver.driverRequestUniqueId ||
          rawDriver.driverRequestUniqueId ||
          undefined,
        journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
        queueUniqueId:
          rawDriver.queueUniqueId ||
          rawDriver.driverQueueUniqueId ||
          undefined,
        vehicleTypeUniqueId: resolvedVehicleTypeId,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        t(
          "orders.driverRequestAccepted",
          "Driver request accepted successfully",
        ),
      );
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
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
