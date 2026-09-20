import { Pencil, Trash2, Gavel, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem } from "./OrdersTypes";
import {
  formatShortName,
  formatTrimmedRoute,
  getConnectedJourneyStatus,
} from "./OrdersTypes";
import { renderVehicleType } from "./OrderPrimitives";

export interface BatchSubRowProps {
  childOrder: OrderDisplayItem;
  childIdx: number;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function BatchSubRow({
  childOrder,
  childIdx,
  onEdit,
  onDelete,
  onViewRequests,
}: BatchSubRowProps) {
  const { t } = useTranslation();
  const journey = getConnectedJourneyStatus(childOrder);
  const childRequestId = childOrder.shipperRequestId || childOrder.id;

  return (
    <tr className="orders-row orders-batch-subrow">
      <td className="td-num td-subrow-num" title={childOrder.displayId}>
        <div className="orders-subrow-id-wrap">
          <span className="orders-subrow-tree" aria-hidden="true">
            ↳
          </span>
          <span className="orders-id-badge orders-id-badge--sub">
            #{childRequestId}
          </span>
          <span className="orders-subrow-truck-label">
            {t("orders.truckIndex", "Truck {{num}}", {
              num: childIdx + 1,
            })}
          </span>
        </div>
      </td>
      <td className="td-shipper td-subrow-cell" title={childOrder.shipper}>
        <span className="orders-subrow-text">
          {formatShortName(childOrder.shipper)}
        </span>
      </td>
      <td className="td-type td-subrow-cell">
        <span className="orders-subrow-text">
          {childOrder.type === "Group"
            ? t("orders.modeGroup", "Group")
            : t("orders.modeIndividual", "Individual")}
        </span>
      </td>
      <td className="td-vehicletype td-subrow-cell" title={childOrder.vehicleType}>
        {renderVehicleType(childOrder.vehicleType)}
      </td>
      <td className="td-item td-subrow-cell">{childOrder.item}</td>
      <td className="td-location td-subrow-cell">
        <span className="orders-subrow-route">
          {formatTrimmedRoute(childOrder.origin, childOrder.destination)}
        </span>
      </td>
      <td className="td-quintal td-subrow-cell">{childOrder.quintal}</td>
      <td className="td-cost td-subrow-cell">
        <div className="orders-cost-cell">
          <span className="orders-cost-val">
            {childOrder.cost.toLocaleString()}{" "}
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
              onClick={() => onViewRequests?.(childOrder)}
              title={journey.label}
              aria-label={journey.label}
            >
              <span>{journey.label}</span>
            </button>
          ) : onViewRequests &&
            childOrder.isBiddingApproved &&
            (childOrder.driverRequests?.length || 0) > 0 ? (
            <button
              type="button"
              className="orders-btn-bids orders-btn-bids--active"
              onClick={() => onViewRequests(childOrder)}
              title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
              aria-label={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
            >
              <Gavel size={13} />
              <span>{t("orders.bids", "Bids")}</span>
              <span className="orders-bids-count">
                {childOrder.driverRequests?.length}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="orders-badge-waiting"
              onClick={() => {
                if (onViewRequests && childOrder.isBiddingApproved) {
                  onViewRequests(childOrder);
                }
              }}
              title={
                childOrder.isBiddingApproved
                  ? t(
                      "orders.waitingForBidsTooltip",
                      "Waiting for driver proposals. Click to check bids."
                    )
                  : t("orders.waitingForDriver", "Waiting for Driver")
              }
              aria-label={
                childOrder.isBiddingApproved
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
            onClick={() => onEdit(childOrder)}
            title={t("orders.editOrderTitle", "Edit Order")}
            aria-label={t("orders.editOrderTitle", "Edit Order")}
          >
            <Pencil size={17} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="orders-action-btn orders-action-btn--delete"
            onClick={() => onDelete(childOrder)}
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

export default BatchSubRow;
