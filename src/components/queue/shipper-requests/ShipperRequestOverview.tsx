import { useTranslation } from "react-i18next";
import { MapPin, Tag } from "lucide-react";
import { formatJourneyStatusLabel } from "../../../utils/journeyStatus";
import { toNumber, formatDate } from "../../../utils/formatters";
import type { ShipperRequestDetail } from "../ShipperRequestsModal";

export interface ShipperRequestOverviewProps {
  request: ShipperRequestDetail;
}

export function ShipperRequestOverview({ request }: ShipperRequestOverviewProps) {
  const { t } = useTranslation();
  const cost = toNumber(request.shippingCost);
  const quintal = toNumber(request.shippableItemQtyInQuintal);
  const mode = (request.requestMode || "")
    .toLowerCase()
    .includes("group")
    ? t("orders.modeGroup", "Group")
    : t("orders.modeIndividual", "Individual");
  const statusLabel = formatJourneyStatusLabel(request.journeyStatusId);

  return (
    <>
      <div className="srm-card-top">
        <div className="srm-badges">
          <span className="srm-mode">{mode}</span>
          {request.isBiddingApproved ? (
            <span className="srm-badge-bidding">
              <Tag size={11} />
              {t("orders.openBidding", "Open for Bidding")}
            </span>
          ) : null}
          {request.journeyStatusId ? (
            <span className="srm-status">{statusLabel}</span>
          ) : null}
        </div>
        <div className="srm-cost">
          {cost.toLocaleString()}
          <span className="srm-cost-cur">ETB</span>
        </div>
      </div>

      <div className="srm-grid">
        <div className="srm-row">
          <span className="srm-label">
            {t("orders.table.item", "Item")}
          </span>
          <span className="srm-value">
            {request.shippableItemName ||
              t("orders.defaultGeneralCargo", "General Cargo")}
          </span>
        </div>
        <div className="srm-row">
          <span className="srm-label">
            {t("orders.table.quintal", "Quintal")}
          </span>
          <span className="srm-value">{quintal}</span>
        </div>
        <div className="srm-row">
          <span className="srm-label">
            {t("orders.table.vehicleType", "Vehicle Type")}
          </span>
          <span className="srm-value">
            {request.vehicleTypeName ||
              t("orders.defaultHeavyTruck", "Heavy Truck")}
          </span>
        </div>
        <div className="srm-row">
          <span className="srm-label">
            {t("orders.shippingDate", "Shipping Date")}
          </span>
          <span className="srm-value">
            {formatDate(request.shippingDate)}
          </span>
        </div>
        <div className="srm-row">
          <span className="srm-label">
            {t("orders.deliveryDate", "Delivery Date")}
          </span>
          <span className="srm-value">
            {formatDate(request.deliveryDate)}
          </span>
        </div>
        <div className="srm-row">
          <span className="srm-label">Created</span>
          <span className="srm-value">
            {formatDate(request.shipperRequestCreatedAt)}
          </span>
        </div>
        <div className="srm-row srm-route">
          <span className="srm-label">
            {t("orders.table.location", "Location")}
          </span>
          <span className="srm-value">
            <MapPin size={12} />
            {request.originPlace || ""}
            <span className="srm-arrow">→</span>
            {request.destinationPlace || ""}
          </span>
        </div>
      </div>
    </>
  );
}

export default ShipperRequestOverview;
