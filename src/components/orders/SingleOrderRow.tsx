import type React from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem } from "./OrdersTypes";
import {
  formatShortName,
  formatTrimmedRoute,
  getConnectedJourneyStatus,
} from "./OrdersTypes";
import { renderVehicleType } from "./OrderPrimitives";

export interface SingleOrderRowProps {
  order: OrderDisplayItem;
  expandedLocationId: string | null;
  toggleLocation: (id: string, e: React.MouseEvent) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function SingleOrderRow({
  order,
  expandedLocationId,
  toggleLocation,
  onEdit,
  onDelete,
  onViewRequests,
}: SingleOrderRowProps) {
  const { t } = useTranslation();
  const journey = getConnectedJourneyStatus(order);
  const isExpandedLoc = expandedLocationId === order.id;

  return (
    <tr className="orders-row">
      <td className="td-num" title={order.displayId}>
        <span className="orders-id-badge">{order.displayId}</span>
      </td>
      <td className="td-shipper" title={order.shipper}>
        <span className="orders-shipper-desktop">{order.shipper}</span>
        <span className="orders-shipper-mobile">{formatShortName(order.shipper)}</span>
      </td>
      <td className="td-type">
        <div className="orders-type-badges">
          <span className="orders-type-label">
            {order.type === "Group"
              ? t("orders.modeGroup", "Group")
              : t("orders.modeIndividual", "Individual")}
          </span>
          {order.isBiddingApproved && !journey.isConnected && (
            <span
              className="orders-badge-bidding"
              title={t("orders.openBidding", "Open for Bidding")}
            >
              <Tag size={10} />
              {t("orders.openBidding", "Open for Bidding")}
            </span>
          )}
        </div>
      </td>
      <td className="td-vehicletype" title={order.vehicleType}>
        {renderVehicleType(order.vehicleType)}
      </td>
      <td className="td-item">{order.item}</td>
      <td className={`td-location ${isExpandedLoc ? "td-location--expanded" : ""}`}>
        {isExpandedLoc ? (
          <div
            className="orders-loc-box orders-loc-box--expanded"
            onClick={(e) => toggleLocation(order.id, e)}
            title={t("orders.clickToCollapse", "Click to collapse")}
            role="button"
            tabIndex={0}
            aria-expanded={true}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleLocation(order.id, e as unknown as React.MouseEvent);
              }
            }}
          >
            <div className="orders-loc-full-row">
              <span className="orders-loc-dot orders-loc-dot--origin" />
              <span className="orders-loc-detail">
                <strong>{t("orders.from", "From")}:</strong> {order.origin}
              </span>
            </div>
            <div className="orders-loc-full-row">
              <span className="orders-loc-dot orders-loc-dot--dest" />
              <span className="orders-loc-detail">
                <strong>{t("orders.to", "To")}:</strong> {order.destination}
              </span>
            </div>
            <span className="orders-loc-collapse-hint">
              <ChevronUp size={12} /> {t("orders.collapse", "Collapse")}
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="orders-loc-btn orders-loc-btn--trimmed"
            onClick={(e) => toggleLocation(order.id, e)}
            title={t("orders.clickForFullLocation", "Click to view full location")}
            aria-expanded={false}
          >
            <span className="orders-loc-trimmed-text">
              {formatTrimmedRoute(order.origin, order.destination)}
            </span>
            <ChevronDown size={12} className="orders-loc-chevron" />
          </button>
        )}
      </td>
      <td className="td-quintal">{order.quintal}</td>
      <td className="td-cost">
        <div className="orders-cost-cell">
          <span className="orders-cost-val">
            {order.cost.toLocaleString()}{" "}
            <small className="orders-cost-cur">ETB</small>
          </span>
        </div>
      </td>
      <td className="td-action">
        <div className="orders-actions-group">
          {journey.isConnected ? (
            <button
              type="button"
              className={`orders-btn-status orders-btn-status--${journey.type}`}
              onClick={() => onViewRequests?.(order)}
              title={journey.label}
              aria-label={journey.label}
            >
              <span>{journey.label}</span>
            </button>
          ) : onViewRequests &&
            order.isBiddingApproved &&
            order.driverRequests &&
            order.driverRequests.length > 0 ? (
            <button
              type="button"
              className="orders-btn-bids orders-btn-bids--active"
              onClick={() => onViewRequests(order)}
              title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
              aria-label={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
            >
              <Gavel size={13} />
              <span>{t("orders.bids", "Bids")}</span>
              <span className="orders-bids-count">
                {order.driverRequests.length}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="orders-badge-waiting"
              onClick={() => {
                if (onViewRequests && order.isBiddingApproved) {
                  onViewRequests(order);
                }
              }}
              title={
                order.isBiddingApproved
                  ? t(
                      "orders.waitingForBidsTooltip",
                      "Waiting for driver proposals. Click to check bids."
                    )
                  : t("orders.waitingForDriver", "Waiting for Driver")
              }
              aria-label={
                order.isBiddingApproved
                  ? t(
                      "orders.waitingForBidsTooltip",
                      "Waiting for driver proposals. Click to check bids."
                    )
                  : t("orders.waitingForDriver", "Waiting for Driver")
              }
            >
              <Clock size={11} />
              <span>{t("orders.waiting", "Waiting")}</span>
            </button>
          )}
          <button
            type="button"
            className="orders-action-btn orders-action-btn--edit"
            onClick={() => onEdit(order)}
            title={t("orders.editOrderTitle", "Edit Order")}
            aria-label={t("orders.editOrderTitle", "Edit Order")}
          >
            <Pencil size={17} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="orders-action-btn orders-action-btn--delete"
            onClick={() => onDelete(order)}
            title={t("orders.deleteOrderTitle", "Delete Order")}
            aria-label={t("orders.deleteOrderTitle", "Delete Order")}
          >
            <Trash2 size={17} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default SingleOrderRow;
