import React from "react";
import {
  Package,
  Pencil,
  Trash2,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem } from "./OrdersTypes";
import { formatTrimmedRoute } from "./OrdersTypes";

export function renderVehicleType(vehicleType: string) {
  const match = vehicleType.match(/^(.*?)\s*(\(.*?\))$/);
  if (match) {
    return (
      <div className="orders-vehicle-cell">
        <span className="orders-vehicle-name">{match[1]}</span>
        <span className="orders-vehicle-sub">{match[2]}</span>
      </div>
    );
  }
  return <span className="orders-vehicle-name">{vehicleType}</span>;
}

export function OrderIdBadge({
  displayId,
  isBatch = false,
  isSub = false,
}: {
  displayId: string;
  isBatch?: boolean;
  isSub?: boolean;
}) {
  const subClass = isSub ? "orders-id-badge--sub" : "";
  const batchClass = isBatch ? "orders-id-badge--batch" : "";

  return (
    <span className={`orders-id-badge ${batchClass} ${subClass}`}>
      {isBatch && <Tag size={12} className="orders-batch-icon" />}
      #{displayId}
    </span>
  );
}

export function RouteExpandable({
  id,
  origin,
  destination,
  isExpanded,
  onToggle,
}: {
  id: string;
  origin: string;
  destination: string;
  isExpanded: boolean;
  onToggle: (id: string, e: React.MouseEvent) => void;
}) {
  const trimmed = formatTrimmedRoute(origin, destination);

  return (
    <div className="orders-loc-cell-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        className="orders-loc-btn orders-loc-btn--trimmed"
        onClick={(e) => onToggle(id, e)}
        title={`${origin} → ${destination}`}
      >
        <span className="orders-loc-trimmed-text">{trimmed}</span>
      </button>

      {isExpanded && (
        <div className="orders-loc-box orders-loc-box--expanded">
          <div className="orders-loc-item orders-loc-origin">
            <span className="orders-loc-dot orders-loc-dot--origin" />
            <span className="orders-loc-text">{origin}</span>
          </div>
          <div className="orders-loc-arrow-row">
            <ArrowRight size={13} className="orders-loc-arrow" />
          </div>
          <div className="orders-loc-item orders-loc-dest">
            <span className="orders-loc-dot orders-loc-dot--dest" />
            <span className="orders-loc-text">{destination}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrderEmptyState({
  activeTab,
}: {
  activeTab: "ongoing" | "complete";
}) {
  const { t } = useTranslation();
  return (
    <div className="orders-empty-state">
      <Package size={40} />
      <p>
        {activeTab === "ongoing"
          ? t("orders.emptyOngoing", "No ongoing orders at the moment.")
          : t("orders.emptyComplete", "No completed orders found.")}
      </p>
    </div>
  );
}

export function OrderActionCluster({
  order,
  onEdit,
  onDelete,
}: {
  order: OrderDisplayItem;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="orders-actions-group">
      <button
        type="button"
        className="orders-btn-icon orders-btn-edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(order);
        }}
        title={t("orders.editOrderTitle", "Edit Order")}
        aria-label={t("orders.editOrderTitle", "Edit Order")}
      >
        <Pencil size={17} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="orders-btn-icon orders-btn-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(order);
        }}
        title={t("orders.deleteOrderTitle", "Delete Order")}
        aria-label={t("orders.deleteOrderTitle", "Delete Order")}
      >
        <Trash2 size={17} strokeWidth={2} />
      </button>
    </div>
  );
}
