import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Package, Pencil, Trash2, Tag, Gavel } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, SortColumn } from "./OrdersTypes";
import { formatShortName, formatTrimmedRoute } from "./OrdersTypes";

interface OrdersTableProps {
  orders: OrderDisplayItem[];
  sortCol: SortColumn;
  activeTab: "ongoing" | "complete";
  currentPage?: number;
  onSort: (col: SortColumn) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrdersTable({
  orders,
  sortCol,
  activeTab,
  currentPage: _currentPage,
  onSort,
  onEdit,
  onDelete,
  onViewRequests,
}: OrdersTableProps) {
  const { t } = useTranslation();
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedLocationId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(".orders-loc-box--expanded") ||
        target?.closest(".orders-loc-btn--trimmed")
      ) {
        return;
      }
      setExpandedLocationId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedLocationId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedLocationId]);

  const toggleLocation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLocationId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="orders-table-card">
      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th onClick={() => onSort("id")} className="th-sortable th-num">
                <span className="th-content">
                  {t("orders.table.requestBatchId", "Request / Batch ID")}
                  <ChevronDown size={14} className={sortCol === "id" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("shipper")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.shipper", "Shipper")}
                  <ChevronDown size={14} className={sortCol === "shipper" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("type")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.type", "Type")}
                  <ChevronDown size={14} className={sortCol === "type" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("vehicleType")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.vehicleType", "Vehicle Type")}
                  <ChevronDown size={14} className={sortCol === "vehicleType" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("item")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.item", "Item")}
                  <ChevronDown size={14} className={sortCol === "item" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("location")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.location", "Location")}
                  <ChevronDown size={14} className={sortCol === "location" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("quintal")} className="th-sortable th-quintal">
                <span className="th-content">
                  {t("orders.table.quintal", "Quintal")}
                  <ChevronDown size={14} className={sortCol === "quintal" ? "active" : ""} />
                </span>
              </th>
              <th onClick={() => onSort("cost")} className="th-sortable">
                <span className="th-content">
                  {t("orders.table.cost", "Cost")}
                  <ChevronDown size={14} className={sortCol === "cost" ? "active" : ""} />
                </span>
              </th>
              <th className="th-action">{t("orders.table.action", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="orders-empty-cell">
                  <div className="orders-empty-state">
                    <Package size={36} />
                    <p>
                      {activeTab === "ongoing"
                        ? t("orders.emptyOngoing", "No ongoing orders at the moment.")
                        : t("orders.emptyComplete", "No completed orders found.")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                return (
                  <tr key={order.id} className="orders-row">
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
                        {order.isBiddingApproved && (
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
                    <td className="td-vehicletype">{order.vehicleType}</td>
                    <td className="td-item">{order.item}</td>
                    <td className={`td-location ${expandedLocationId === order.id ? "td-location--expanded" : ""}`}>
                      {expandedLocationId === order.id ? (
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
                              toggleLocation(order.id, e as any);
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
                        {onViewRequests && order.isBiddingApproved && (
                          <button
                            type="button"
                            className={`orders-btn-bids ${
                              order.driverRequests && order.driverRequests.length > 0
                                ? "orders-btn-bids--active"
                                : ""
                            }`}
                            onClick={() => onViewRequests(order)}
                            title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                            aria-label={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                          >
                            <Gavel size={13} />
                            <span>{t("orders.bids", "Bids")}</span>
                            {order.driverRequests && order.driverRequests.length > 0 && (
                              <span className="orders-bids-count">
                                {order.driverRequests.length}
                              </span>
                            )}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
