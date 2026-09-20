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
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "../OrdersTypes";
import { BidOfferComparison } from "./BidOfferComparison";
import { BidActionButtons } from "./BidActionButtons";

export interface BidRowProps {
  driver: ShipperRequestDriverInfo;
  order: OrderDisplayItem;
  isAccepted: boolean;
  hasAnyAcceptedDriver: boolean;
  isAccepting: boolean;
  isAnyAccepting: boolean;
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
 * BidRow renders an individual driver proposal item with distance, offer cost,
 * and acceptance action buttons.
 */
export function BidRow({
  driver,
  order,
  isAccepted,
  hasAnyAcceptedDriver,
  isAccepting,
  isAnyAccepting,
  onAccept,
}: BidRowProps) {
  const { t } = useTranslation();

  const statusId = extractJourneyStatusId(
    driver.journeyStatusId ?? driver.journeyStatus ?? (driver as any).status,
  );
  const isDriverAccepted = statusId === 3;
  const isShipperAccepted =
    typeof statusId === "number" && statusId >= 4 && statusId <= 9;
  const isDriverRequested = statusId === 2;

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

  return (
    <div
      className={`dbm-bid-item ${isAccepted ? "dbm-bid-item--accepted" : ""}`}
    >
      <div className="dbm-driver-avatar">
        {getDriverInitials(driver.fullName)}
      </div>

      <div className="dbm-driver-details">
        <div className="dbm-driver-header">
          <span className="dbm-driver-name">
            {driver.fullName || t("orders.waitingDriver", "Driver")}
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
              {driverLoc && <span className="dbm-loc-name">{driverLoc}</span>}
              {driverDist != null && (
                <span className="dbm-dist-badge">
                  {driverDist} km {t("orders.fromPickup", "from pickup")}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Driver Offer Cost and Comparison */}
      <BidOfferComparison
        offerVal={offerVal}
        orderCost={order.cost}
        hasDriverOffer={hasDriverOffer}
      />

      <BidActionButtons
        driver={driver}
        isAccepted={isAccepted}
        hasAnyAcceptedDriver={hasAnyAcceptedDriver}
        isDriverRequested={isDriverRequested}
        isDriverAccepted={isDriverAccepted}
        isAccepting={isAccepting}
        isAnyAccepting={isAnyAccepting}
        onAccept={onAccept}
      />
    </div>
  );
}

export default BidRow;
