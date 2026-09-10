import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Package, Pencil, Trash2, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractCity } from "../../utils/formatters";
import type { OrderDisplayItem } from "./OrdersTypes";

interface OrdersMobileCardsProps {
  orders: OrderDisplayItem[];
  activeTab: "ongoing" | "complete";
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
}

export function OrdersMobileCards({
  orders,
  activeTab,
  onEdit,
  onDelete,
}: OrdersMobileCardsProps) {
  const { t } = useTranslation();
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const toggleLocation = (id: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="orders-mobile-card-list">
      {orders.length === 0 ? (
        <div className="orders-empty-state orders-mobile-empty">
          <Package size={36} />
          <p>
            {activeTab === "ongoing"
              ? t("orders.emptyOngoing", "No ongoing orders at the moment.")
              : t("orders.emptyComplete", "No completed orders found.")}
          </p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="orders-m-card">
            {/* Row 1: Shipper Name, Type badge, and Cost */}
            <div className="orders-m-header">
              <div className="orders-m-shipper-wrap">
                <span className="orders-m-shipper">{order.shipper}</span>
                <span className="orders-m-type-badge">
                  {order.type === "Group"
                    ? t("orders.modeGroup", "Group")
                    : t("orders.modeIndividual", "Individual")}
                </span>
              </div>
              <div className="orders-m-cost">
                <span className="orders-m-cost-val">{order.cost.toLocaleString()}</span>
                <span className="orders-m-cost-cur">ETB</span>
              </div>
            </div>

            {/* Row 2: Location (Trimmed by default, click for whole location) */}
            {expandedLocations.has(order.id) ? (
              <div
                className="orders-m-route orders-m-route--expanded"
                onClick={() => toggleLocation(order.id)}
                title={t("orders.clickToCollapse", "Click to collapse")}
                role="button"
                tabIndex={0}
              >
                <div className="orders-m-loc-row">
                  <span className="orders-loc-dot orders-loc-dot--origin" />
                  <span className="orders-m-loc-text">
                    <strong>{t("orders.from", "From")}:</strong> {order.origin}
                  </span>
                </div>
                <div className="orders-m-loc-row">
                  <span className="orders-loc-dot orders-loc-dot--dest" />
                  <span className="orders-m-loc-text">
                    <strong>{t("orders.to", "To")}:</strong> {order.destination}
                  </span>
                </div>
                <span className="orders-loc-collapse-hint">
                  <ChevronUp size={11} /> {t("orders.collapse", "Collapse")}
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="orders-m-route orders-m-route--trimmed"
                onClick={() => toggleLocation(order.id)}
                title={t("orders.clickForFullLocation", "Click to view full location")}
              >
                <span className="orders-m-city">{extractCity(order.origin)}</span>
                <ArrowRight size={12} className="orders-m-arrow" />
                <span className="orders-m-city">{extractCity(order.destination)}</span>
                <ChevronDown size={11} className="orders-m-loc-chevron" />
              </button>
            )}

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
        ))
      )}
    </div>
  );
}
