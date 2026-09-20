import { useTranslation } from "react-i18next";
import {
  Package,
  Pencil,
  Trash2,
  Truck,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import type { OrderDisplayItem } from "../OrdersTypes";
import { getConnectedJourneyStatus } from "../OrdersTypes";
import { OrderMobileRoute } from "./OrderMobileRoute";

export interface SingleOrderMobileCardProps {
  order: OrderDisplayItem;
  isLocationExpanded: boolean;
  onToggleLocation: () => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

/**
 * SingleOrderMobileCard renders an individual non-batched order card on mobile.
 */
export function SingleOrderMobileCard({
  order,
  isLocationExpanded,
  onToggleLocation,
  onEdit,
  onDelete,
  onViewRequests,
}: SingleOrderMobileCardProps) {
  const { t } = useTranslation();
  const journey = getConnectedJourneyStatus(order);

  return (
    <div className="orders-m-card">
      {/* Row 1: Shipper Name, Type badge, and Cost */}
      <div className="orders-m-header">
        <div className="orders-m-shipper-wrap">
          <span className="orders-m-shipper">{order.shipper}</span>
          <div className="orders-m-badges">
            <span className="orders-id-badge" title={order.displayId}>
              {order.displayId}
            </span>
            <span className="orders-m-type-badge">
              {order.type === "Group"
                ? t("orders.modeGroup", "Group")
                : t("orders.modeIndividual", "Individual")}
            </span>
            {order.isBiddingApproved && !journey.isConnected && (
              <span className="orders-badge-bidding">
                <Tag size={10} />
                {t("orders.openBidding", "Open for Bidding")}
              </span>
            )}
          </div>
        </div>
        <div className="orders-m-cost">
          <span className="orders-m-cost-val">
            {order.cost.toLocaleString()}
          </span>
          <span className="orders-m-cost-cur">ETB</span>
        </div>
      </div>

      {/* Row 2: Location Route */}
      <OrderMobileRoute
        origin={order.origin}
        destination={order.destination}
        isExpanded={isLocationExpanded}
        onToggle={onToggleLocation}
      />

      {/* Row 3: Meta tags + Actions */}
      <div className="orders-m-footer">
        <div className="orders-m-tags">
          <span className="orders-m-tag item">
            <Package size={11} />
            {order.item}
          </span>
          {order.quintal > 0 && (
            <span className="orders-m-tag quintal">
              {order.quintal} Qtl
            </span>
          )}
          <span className="orders-m-tag vehicle">
            <Truck size={11} />
            {order.vehicleType.replace(/\s*\(.*\)/, "")}
          </span>
        </div>

        <div className="orders-m-actions">
          {journey.isConnected ? (
            <button
              type="button"
              className={`orders-m-btn-status orders-m-btn-status--${journey.type}`}
              onClick={() => onViewRequests?.(order)}
              title={journey.label}
            >
              <span>{journey.label}</span>
            </button>
          ) : onViewRequests &&
            order.isBiddingApproved &&
            order.driverRequests &&
            order.driverRequests.length > 0 ? (
            <button
              type="button"
              className="orders-m-btn-requests orders-m-btn-requests--active"
              onClick={() => onViewRequests(order)}
              title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
            >
              <Gavel size={12} />
              <span>
                {t("orders.bids", "Bids")} ({order.driverRequests.length})
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="orders-m-badge-waiting orders-badge-waiting"
              onClick={() => {
                if (onViewRequests && order.isBiddingApproved) {
                  onViewRequests(order);
                }
              }}
              title={
                order.isBiddingApproved
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
            onClick={() => onEdit(order)}
            title={t("orders.editOrderTitle", "Edit Order")}
          >
            <Pencil size={12} />
            <span>{t("common.edit", "Edit")}</span>
          </button>
          <button
            type="button"
            className="orders-m-btn-delete"
            onClick={() => onDelete(order)}
            title={t("orders.deleteOrderTitle", "Delete Order")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SingleOrderMobileCard;
