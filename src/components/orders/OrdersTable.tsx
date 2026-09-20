import type React from "react";
import { useState, useEffect, useMemo, Fragment } from "react";
import { ChevronDown, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, OrderBatchGroup, SortColumn } from "./OrdersTypes";
import { groupOrdersByBatch } from "./OrdersTypes";
import { SingleOrderRow } from "./SingleOrderRow";
import { BatchMasterRow } from "./BatchMasterRow";
import { BatchSubRow } from "./BatchSubRow";

interface OrdersTableProps {
  orders?: OrderDisplayItem[];
  batchGroups?: OrderBatchGroup[];
  sortCol: SortColumn;
  activeTab: "ongoing" | "complete";
  currentPage?: number;
  onSort: (col: SortColumn) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrdersTable({
  orders = [],
  batchGroups: passedBatchGroups,
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
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const batchGroups = useMemo(
    () => passedBatchGroups || groupOrdersByBatch(orders),
    [passedBatchGroups, orders],
  );

  const toggleBatch = (batchKey: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchKey)) {
        next.delete(batchKey);
      } else {
        next.add(batchKey);
      }
      return next;
    });
  };

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
                  {t("orders.table.requestBatchId", "Batch / Request ID")}
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
            {batchGroups.length === 0 ? (
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
              batchGroups.map((group) => {
                if (!group.isMultiVehicle) {
                  const order = group.orders[0];
                  return (
                    <SingleOrderRow
                      key={order.id}
                      order={order}
                      expandedLocationId={expandedLocationId}
                      toggleLocation={toggleLocation}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onViewRequests={onViewRequests}
                    />
                  );
                }

                const isExpanded = expandedBatches.has(group.batchKey);

                return (
                  <Fragment key={group.batchKey}>
                    <BatchMasterRow
                      group={group}
                      isExpanded={isExpanded}
                      toggleBatch={toggleBatch}
                      expandedLocationId={expandedLocationId}
                      toggleLocation={toggleLocation}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onViewRequests={onViewRequests}
                    />

                    {isExpanded &&
                      group.orders.map((childOrder, childIdx) => (
                        <BatchSubRow
                          key={childOrder.id}
                          childOrder={childOrder}
                          childIdx={childIdx}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onViewRequests={onViewRequests}
                        />
                      ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrdersTable;
