import { useTranslation } from "react-i18next";
import { Gavel, Clock, Pencil, Trash2 } from "lucide-react";
import type { OrderDisplayItem } from "../OrdersTypes";
import { getConnectedJourneyStatus } from "../OrdersTypes";

export interface BatchSubCardProps {
  childOrder: OrderDisplayItem;
  childIdx: number;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

/**
 * BatchSubCard renders an individual child truck vehicle card within a batch.
 */
export function BatchSubCard({
  childOrder,
  childIdx,
  onEdit,
  onDelete,
  onViewRequests,
}: BatchSubCardProps) {
  const { t } = useTranslation();
  const journey = getConnectedJourneyStatus(childOrder);
  const childRequestId = childOrder.shipperRequestId || childOrder.id;

  return (
    <div className="orders-m-subcard">
      <div className="orders-m-subcard-header">
        <div className="orders-m-subcard-title">
          <span className="orders-subrow-tree" aria-hidden="true">
            ↳
          </span>
          <span className="orders-id-badge orders-id-badge--sub">
            #{childRequestId}
          </span>
          <span className="orders-subcard-truck-tag">
            {t("orders.truckIndex", "Truck {{num}}", {
              num: childIdx + 1,
            })}
          </span>
        </div>
        <div className="orders-m-subcard-meta">
          <span>{childOrder.quintal} Qtl</span>
          <span>•</span>
          <span>{childOrder.cost.toLocaleString()} ETB</span>
        </div>
      </div>

      <div className="orders-m-subcard-actions">
        {journey.isConnected ? (
          <button
            type="button"
            className={`orders-m-btn-status orders-m-btn-status--${journey.type}`}
            onClick={() => onViewRequests?.(childOrder)}
            title={journey.label}
          >
            <span>{journey.label}</span>
          </button>
        ) : onViewRequests &&
          childOrder.isBiddingApproved &&
          (childOrder.driverRequests?.length || 0) > 0 ? (
          <button
            type="button"
            className="orders-m-btn-requests orders-m-btn-requests--active"
            onClick={() => onViewRequests(childOrder)}
            title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
          >
            <Gavel size={12} />
            <span>
              {t("orders.bids", "Bids")} ({childOrder.driverRequests?.length})
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="orders-m-badge-waiting orders-badge-waiting"
            onClick={() => {
              if (onViewRequests && childOrder.isBiddingApproved) {
                onViewRequests(childOrder);
              }
            }}
            title={
              childOrder.isBiddingApproved
                ? t(
                    "orders.waitingForBidsTooltip",
                    "Waiting for driver proposals. Click to check bids.",
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
          className="orders-m-btn-edit"
          onClick={() => onEdit(childOrder)}
          title={t("orders.editOrderTitle", "Edit Order")}
        >
          <Pencil size={12} />
          <span>{t("common.edit", "Edit")}</span>
        </button>
        <button
          type="button"
          className="orders-m-btn-delete"
          onClick={() => onDelete(childOrder)}
          title={t("orders.deleteOrderTitle", "Delete Order")}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default BatchSubCard;
