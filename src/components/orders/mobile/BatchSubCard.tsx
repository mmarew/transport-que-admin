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
            {childOrder.displayId || `#${childRequestId}`}
          </span>
        </div>
        {(() => {
          const queueId =
            childOrder.queueNumber != null && childOrder.queueNumber !== ""
              ? childOrder.queueNumber
              : "—";

          const loadingOrderId =
            childOrder.loadingOrderNumber != null && childOrder.loadingOrderNumber !== ""
              ? childOrder.loadingOrderNumber
              : "—";

          return (
            <div className="orders-m-subcard-meta">
              <span>
                {t("orders.queueNumber", "Queue")}: {queueId}
              </span>
              <span>•</span>
              <span>
                {t("orders.loadingOrderNumber", "Loading Order")}: {loadingOrderId}
              </span>
            </div>
          );
        })()}
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
            title={
              childOrder.type === "Group"
                ? t("orders.companyBidsTitle", "Company Bids & Proposals")
                : t("orders.driverBidsTitle", "Driver Bids & Proposals")
            }
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
