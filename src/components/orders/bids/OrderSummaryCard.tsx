import { useTranslation } from "react-i18next";
import { formatTrimmedRoute, type OrderDisplayItem } from "../OrdersTypes";

export interface OrderSummaryCardProps {
  order: OrderDisplayItem;
}

/**
 * OrderSummaryCard displays shipper details, item/quintal, cost, vehicle type,
 * and origin/destination route in a 2-column grid matching the design.
 */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const { t } = useTranslation();

  const shipperDisplay = order.phone || order.shipper || "-";
  const quantityDisplay = order.quintal ? `${order.quintal} quintal` : "-";
  const itemDisplay = order.item || "-";
  const costDisplay = `${order.cost.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
  const routeDisplay = formatTrimmedRoute(order.origin, order.destination);
  const fullRouteTitle =
    order.origin && order.destination
      ? `${order.origin} → ${order.destination}`
      : order.origin || order.destination || undefined;
  const vehicleDisplay = order.vehicleType || "-";

  return (
    <div className="dbm-order-card">
      <div className="dbm-summary-grid">
        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.table.shipper", "SHIPPER")}
          </span>
          <span className="dbm-summary-value">{shipperDisplay}</span>
        </div>
        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.targetCost", "TARGET COST")}
          </span>
          <span className="dbm-summary-value dbm-summary-cost">{costDisplay}</span>
        </div>

        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.quantity", "QUANTITY")}
          </span>
          <span className="dbm-summary-value">{quantityDisplay}</span>
        </div>
        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.from", "FROM")}
          </span>
          <span className="dbm-summary-value" title={fullRouteTitle}>{routeDisplay}</span>
        </div>

        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.table.item", "ITEM")}
          </span>
          <span className="dbm-summary-value">{itemDisplay}</span>
        </div>
        <div className="dbm-summary-item">
          <span className="dbm-summary-label">
            {t("orders.table.vehicleType", "VEHICLE TYPE")}
          </span>
          <span className="dbm-summary-value">{vehicleDisplay}</span>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;
