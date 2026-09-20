import { useTranslation } from "react-i18next";
import { Package, Truck, MapPin } from "lucide-react";
import type { OrderDisplayItem } from "../OrdersTypes";

export interface OrderSummaryCardProps {
  order: OrderDisplayItem;
}

/**
 * OrderSummaryCard displays shipper details, item/quintal, cost, vehicle type,
 * and origin/destination route.
 */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="dbm-order-card">
      <div className="dbm-order-row">
        <div className="dbm-order-col">
          <span className="dbm-order-label">
            {t("orders.table.shipper", "Shipper")}
          </span>
          <span className="dbm-order-val dbm-order-shipper">
            {order.shipper}
            {order.phone && (
              <span className="dbm-order-phone"> ({order.phone})</span>
            )}
          </span>
        </div>
        <div className="dbm-order-col">
          <span className="dbm-order-label">
            {t("orders.targetCost", "Target Cost")}
          </span>
          <span className="dbm-order-val dbm-order-cost">
            {order.cost.toLocaleString()}{" "}
            <small className="dbm-order-cur">ETB</small>
          </span>
        </div>
      </div>

      <div className="dbm-order-row dbm-order-row--sub">
        <div className="dbm-order-col">
          <span className="dbm-order-label">
            <Package size={12} /> {t("orders.table.item", "Item")}
          </span>
          <span className="dbm-order-val">
            {order.item} • {order.quintal} Qtl
          </span>
        </div>
        <div className="dbm-order-col">
          <span className="dbm-order-label">
            <Truck size={12} /> {t("orders.table.vehicleType", "Vehicle Type")}
          </span>
          <span className="dbm-order-val">{order.vehicleType}</span>
        </div>
      </div>

      <div className="dbm-route-box">
        <div className="dbm-route-point">
          <MapPin size={13} className="dbm-pin-origin" />
          <span>
            <strong>{t("orders.from", "From")}:</strong> {order.origin}
          </span>
        </div>
        <div className="dbm-route-point">
          <MapPin size={13} className="dbm-pin-dest" />
          <span>
            <strong>{t("orders.to", "To")}:</strong> {order.destination}
          </span>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;
