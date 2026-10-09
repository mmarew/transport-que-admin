import { useTranslation } from "react-i18next";
import { Phone, Truck, MapPin } from "lucide-react";
import {
  formatJourneyStatusLabel,
  extractJourneyStatusId,
} from "@/utils/journeyStatus";
import {
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "@/utils/formatters";
import { trimAddress, type OrderDisplayItem, type ShipperRequestDriverInfo } from "../OrdersTypes";
import { asRecord } from "./orderIdLookup";
import { BidOfferComparison } from "./BidOfferComparison";
import { BidActionButtons } from "./BidActionButtons";

export interface BidRowProps {
  driver: ShipperRequestDriverInfo;
  order: OrderDisplayItem;
  isAccepted: boolean;
  hasAnyAcceptedDriver: boolean;
  isAccepting: boolean;
  isAnyAccepting: boolean;
  isCompany?: boolean;
  onAccept: (driver: ShipperRequestDriverInfo) => void;
}

function getDriverInitials(name?: string | null): string {
  if (!name) return "DR";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * BidRow renders an individual proposal item with distance, offer cost,
 * and acceptance action buttons.
 */
export function BidRow({
  driver,
  order,
  isAccepted,
  hasAnyAcceptedDriver,
  isAccepting,
  isAnyAccepting,
  isCompany,
  onAccept,
}: BidRowProps) {
  const { t } = useTranslation();

  const statusId = extractJourneyStatusId(
    driver.journeyStatusId ?? driver.journeyStatus ?? (driver as any).status,
  );
  const isDriverAccepted = statusId === 3;
  const isShipperAccepted =
    typeof statusId === "number" && statusId >= 4 && statusId <= 9;
  const isDriverRequested =
    statusId === 2 ||
    ((driver.journeyStatus === "requested" || driver.bidStatus === "requested") && statusId !== 1);

  const rawOrder = asRecord((order as any).rawItem || order);
  const rawShipperReq = asRecord(rawOrder.shipperRequest);
  const rawDriver = asRecord(driver);
  const rawDriverEntry = asRecord((driver as any).entry);

  const resolvedBatchId =
    rawDriver.batchId ??
    rawDriver.shipperRequestBatchId ??
    asRecord(rawDriver.shipperRequest).batchId ??
    rawDriverEntry.batchId ??
    order.batchId ??
    (order.displayId ? order.displayId.replace(/^#/, "").split("/")[0] : null) ??
    rawShipperReq.batchId ??
    rawOrder.batchId ??
    null;

  const resolvedShipperRequestId =
    rawDriver.shipperRequestId ??
    asRecord(rawDriver.shipperRequest).shipperRequestId ??
    rawDriverEntry.shipperRequestId ??
    order.shipperRequestId ??
    (order.displayId && order.displayId.includes("/")
      ? order.displayId.replace(/^#/, "").split("/")[1]
      : null) ??
    rawShipperReq.shipperRequestId ??
    rawOrder.shipperRequestId ??
    null;

  const orderIdentifier =
    resolvedBatchId != null && resolvedShipperRequestId != null
      ? `#${resolvedBatchId}/${resolvedShipperRequestId}`
      : resolvedBatchId != null
        ? `#${resolvedBatchId}`
        : resolvedShipperRequestId != null
          ? `#${resolvedShipperRequestId}`
          : order.displayId || null;

  const directCost = extractOfferCost(driver, (order as any).rawItem || order);
  const driverOfferVal =
    driver.offerCost != null && Number(driver.offerCost) > 0
      ? Number(driver.offerCost)
      : driver.proposedCost != null && Number(driver.proposedCost) > 0
        ? Number(driver.proposedCost)
        : driver.bidAmount != null && Number(driver.bidAmount) > 0
          ? Number(driver.bidAmount)
          : directCost;

  const hasDriverOffer = Boolean(
    (driverOfferVal != null && driverOfferVal > 0) ||
      isDriverAccepted ||
      isShipperAccepted,
  );

  const offerVal = Number(
    driverOfferVal != null && driverOfferVal > 0 ? driverOfferVal : order.cost,
  );

  const driverDist =
    driver.distanceKm ??
    calculateDistanceKm(
      order.originLatitude,
      order.originLongitude,
      driver.latitude,
      driver.longitude,
    );

  const driverLoc =
    driver.currentPlace ||
    (driver.latitude && driver.longitude
      ? lookupLocationFromCoordinates(driver.latitude, driver.longitude)
      : null);

  const displayName =
    driver.fullName ||
    (isCompany
      ? t("orders.waitingCompany", "Company")
      : t("orders.waitingDriver", "Driver"));

  return (
    <div
      className={`dbm-bid-item ${isAccepted ? "dbm-bid-item--accepted" : ""}`}
    >
      <div className="dbm-driver-main-info">
        <div className="dbm-driver-avatar">
          {getDriverInitials(driver.fullName)}
        </div>

        <div className="dbm-driver-details">
          <div className="dbm-driver-header">
            <span
              className="dbm-driver-name"
              title={displayName}
            >
              {displayName}
            </span>
            {statusId != null && (
              <span className={`dbm-status-badge status-${statusId}`}>
                {formatJourneyStatusLabel(statusId)}
              </span>
            )}
          </div>

          <div className="dbm-driver-meta">
            {driver.phoneNumber && (
              <a
                href={`tel:${driver.phoneNumber}`}
                className="dbm-driver-phone"
                title={driver.phoneNumber}
              >
                <Phone size={12} />
                {driver.phoneNumber}
              </a>
            )}
            <span className="dbm-driver-veh">
              <Truck size={12} />
              {driver.vehicleTypeName || order.vehicleType}
              {driver.plateNumber && ` • ${driver.plateNumber}`}
            </span>

            {orderIdentifier && (
              <span className="dbm-driver-batch-tag">
                {orderIdentifier}
              </span>
            )}

            {(driverLoc || driverDist != null) && (
              <span
                className="dbm-driver-location-tag"
                title={
                  driverDist != null
                    ? `${driverLoc ? driverLoc + " • " : ""}${driverDist} km from pickup`
                    : driverLoc || ""
                }
              >
                <MapPin size={12} className="dbm-loc-pin" />
                {driverLoc && <span className="dbm-loc-name">{trimAddress(driverLoc)}</span>}
                {driverDist != null && (
                  <span className="dbm-dist-badge">
                    {driverDist} km {t("orders.fromPickup", "from pickup")}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Driver Offer and Actions */}
      <div className="dbm-bid-right-group">
        <BidOfferComparison
          offerVal={offerVal}
          hasDriverOffer={hasDriverOffer}
          isCompany={isCompany}
        />

        <BidActionButtons
          driver={driver}
          isAccepted={isAccepted}
          hasAnyAcceptedDriver={hasAnyAcceptedDriver}
          isDriverRequested={isDriverRequested}
          isDriverAccepted={isDriverAccepted}
          isAccepting={isAccepting}
          isAnyAccepting={isAnyAccepting}
          isCompany={isCompany}
          onAccept={onAccept}
        />
      </div>
    </div>
  );
}

export default BidRow;
