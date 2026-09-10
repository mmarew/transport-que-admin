import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, SortColumn } from "./OrdersTypes";
import { PAGE_SIZE, formatShortName, formatTrimmedRoute } from "./OrdersTypes";


interface OrdersTableProps {
  orders: OrderDisplayItem[];
  sortCol: SortColumn;
  activeTab: "ongoing" | "complete";
  currentPage: number;
  onSort: (col: SortColumn) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
}

export function OrdersTable({
  orders,
  sortCol,
  activeTab,
  currentPage,
  onSort,
  onEdit,
  onDelete,
}: OrdersTableProps) {
  const { t } = useTranslation();
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const toggleLocation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="orders-table-card">
      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th className="th-num">#</th>
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
              <th onClick={() => onSort("quintal")} className="th-sortable">
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
              orders.map((order, idx) => {
                const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr key={order.id} className="orders-row">
                    <td className="td-num">{rowNum}</td>
                    <td className="td-shipper" title={order.shipper}>
                      <span className="orders-shipper-desktop">{order.shipper}</span>
                      <span className="orders-shipper-mobile">{formatShortName(order.shipper)}</span>
                    </td>
                    <td className="td-type">
                      {order.type === "Group"
                        ? t("orders.modeGroup", "Group")
                        : t("orders.modeIndividual", "Individual")}
                    </td>
                    <td className="td-vehicletype">{order.vehicleType}</td>
                    <td className="td-item">{order.item}</td>
                    <td className={`td-location ${expandedLocations.has(order.id) ? "td-location--expanded" : ""}`}>
                      {expandedLocations.has(order.id) ? (
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
                    <td className="td-cost">{order.cost.toLocaleString()}</td>
                    <td className="td-action">
                      <div className="orders-actions-group">
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
