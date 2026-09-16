import { useState, useEffect, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Pencil,
  Trash2,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, OrderBatchGroup, SortColumn } from "./OrdersTypes";
import {
  formatShortName,
  formatTrimmedRoute,
  getConnectedJourneyStatus,
  groupOrdersByBatch,
} from "./OrdersTypes";

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

function renderVehicleType(vehicleType: string) {
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
    [passedBatchGroups, orders]
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
                          {order.isBiddingApproved && !getConnectedJourneyStatus(order).isConnected && (
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
                      <td className="td-vehicletype" title={order.vehicleType}>
                        {renderVehicleType(order.vehicleType)}
                      </td>
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
                          {(() => {
                            const journey = getConnectedJourneyStatus(order);
                            if (journey.isConnected) {
                              return (
                                <button
                                  type="button"
                                  className={`orders-btn-status orders-btn-status--${journey.type}`}
                                  onClick={() => onViewRequests?.(order)}
                                  title={journey.label}
                                  aria-label={journey.label}
                                >
                                  <span>{journey.label}</span>
                                </button>
                              );
                            }

                            if (onViewRequests && order.isBiddingApproved) {
                              return (
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
                              );
                            }

                            return null;
                          })()}
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
                }

                // Multi-vehicle batch group
                const isExpanded = expandedBatches.has(group.batchKey);
                return (
                  <Fragment key={group.batchKey}>
                    {/* Master Row */}
                    <tr
                      className={`orders-row orders-batch-row--master ${
                        isExpanded ? "orders-batch-row--expanded" : ""
                      }`}
                      onClick={() => toggleBatch(group.batchKey)}
                    >
                      <td className="td-num" title={group.displayId}>
                        <div className="orders-batch-id-wrapper">
                          <button
                            type="button"
                            className="orders-batch-expand-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBatch(group.batchKey);
                            }}
                            title={
                              isExpanded
                                ? t("orders.collapseBatch", "Collapse")
                                : t("orders.expandBatch", "Expand batch")
                            }
                            aria-label={
                              isExpanded
                                ? t("orders.collapseBatch", "Collapse")
                                : t("orders.expandBatch", "Expand batch")
                            }
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <span className="orders-id-badge orders-id-badge--batch">
                            {group.displayId}
                          </span>
                          <span className="orders-badge-truck-count">
                            {t("orders.truckCount", "{{count}} Trucks", {
                              count: group.totalVehicles,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="td-shipper" title={group.shipper}>
                        <span className="orders-shipper-desktop">{group.shipper}</span>
                        <span className="orders-shipper-mobile">{formatShortName(group.shipper)}</span>
                      </td>
                      <td className="td-type">
                        <div className="orders-type-badges">
                          <span className="orders-type-label">
                            {group.type === "Group"
                              ? t("orders.modeGroup", "Group")
                              : t("orders.modeIndividual", "Individual")}
                          </span>
                          {group.isBiddingApproved && !group.statusSummary.isConnected && (
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
                      <td className="td-vehicletype" title={group.vehicleType}>
                        {renderVehicleType(group.vehicleType)}
                      </td>
                      <td className="td-item">{group.item}</td>
                      <td
                        className={`td-location ${
                          expandedLocationId === group.batchKey ? "td-location--expanded" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {expandedLocationId === group.batchKey ? (
                          <div
                            className="orders-loc-box orders-loc-box--expanded"
                            onClick={(e) => toggleLocation(group.batchKey, e)}
                            title={t("orders.clickToCollapse", "Click to collapse")}
                            role="button"
                            tabIndex={0}
                            aria-expanded={true}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleLocation(group.batchKey, e as any);
                              }
                            }}
                          >
                            <div className="orders-loc-full-row">
                              <span className="orders-loc-dot orders-loc-dot--origin" />
                              <span className="orders-loc-detail">
                                <strong>{t("orders.from", "From")}:</strong> {group.origin}
                              </span>
                            </div>
                            <div className="orders-loc-full-row">
                              <span className="orders-loc-dot orders-loc-dot--dest" />
                              <span className="orders-loc-detail">
                                <strong>{t("orders.to", "To")}:</strong> {group.destination}
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
                            onClick={(e) => toggleLocation(group.batchKey, e)}
                            title={t("orders.clickForFullLocation", "Click to view full location")}
                            aria-expanded={false}
                          >
                            <span className="orders-loc-trimmed-text">
                              {formatTrimmedRoute(group.origin, group.destination)}
                            </span>
                            <ChevronDown size={12} className="orders-loc-chevron" />
                          </button>
                        )}
                      </td>
                      <td className="td-quintal">{group.totalQuintal}</td>
                      <td className="td-cost">
                        <div className="orders-cost-cell">
                          <span className="orders-cost-val">
                            {group.totalCost.toLocaleString()}{" "}
                            <small className="orders-cost-cur">ETB</small>
                          </span>
                        </div>
                      </td>
                      <td className="td-action">
                        <div className="orders-actions-group">
                          {(() => {
                            if (group.statusSummary.isConnected) {
                              const acceptedOrder =
                                group.orders.find((o) => getConnectedJourneyStatus(o).isConnected) ||
                                group.orders[0];
                              const isPartial = group.statusSummary.label.includes(" · ");
                              return (
                                <button
                                  type="button"
                                  className={`orders-btn-status orders-btn-status--${group.statusSummary.type} ${
                                    isPartial ? "orders-btn-status--partial" : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewRequests?.(acceptedOrder);
                                  }}
                                  title={group.statusSummary.label}
                                  aria-label={group.statusSummary.label}
                                >
                                  {isPartial ? (
                                    <>
                                      {group.statusSummary.label.split(" · ").map((part, idx) => (
                                        <Fragment key={idx}>
                                          {idx > 0 && <span className="orders-status-divider">·</span>}
                                          <span
                                            className={
                                              part.includes("Waiting")
                                                ? "orders-status-waiting-part"
                                                : "orders-status-active-part"
                                            }
                                          >
                                            {part}
                                          </span>
                                        </Fragment>
                                      ))}
                                    </>
                                  ) : (
                                    <span>{group.statusSummary.label}</span>
                                  )}
                                </button>
                              );
                            }

                            if (onViewRequests && group.isBiddingApproved) {
                              const uniqueBidIds = new Set<string | number>();
                              let totalBids = 0;
                              for (const o of group.orders) {
                                for (const r of (o.driverRequests || [])) {
                                  const rId = r.driverRequestUniqueId || r.driverRequestId || r.userUniqueId;
                                  if (rId) {
                                    if (!uniqueBidIds.has(rId)) {
                                      uniqueBidIds.add(rId);
                                      totalBids++;
                                    }
                                  } else {
                                    totalBids++;
                                  }
                                }
                              }
                              return (
                                <button
                                  type="button"
                                  className={`orders-btn-bids ${
                                    totalBids > 0 ? "orders-btn-bids--active" : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewRequests(group.orders[0]);
                                  }}
                                  title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                                  aria-label={t(
                                    "orders.driverBidsTitle",
                                    "Driver Bids & Proposals"
                                  )}
                                >
                                  <Gavel size={13} />
                                  <span>{t("orders.bids", "Bids")}</span>
                                  {totalBids > 0 && (
                                    <span className="orders-bids-count">{totalBids}</span>
                                  )}
                                </button>
                              );
                            }

                            return null;
                          })()}
                          <button
                            type="button"
                            className="orders-action-btn orders-action-btn--edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(group.orders[0]);
                            }}
                            title={t("orders.editOrderTitle", "Edit Order")}
                            aria-label={t("orders.editOrderTitle", "Edit Order")}
                          >
                            <Pencil size={17} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className="orders-action-btn orders-action-btn--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete({ ...group.orders[0], _isBatchMaster: true } as any);
                            }}
                            title={t("orders.deleteOrderTitle", "Delete Order")}
                            aria-label={t("orders.deleteOrderTitle", "Delete Order")}
                          >
                            <Trash2 size={17} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Child Sub-Rows */}
                    {isExpanded &&
                      group.orders.map((childOrder, childIdx) => {
                        const journey = getConnectedJourneyStatus(childOrder);
                        const childRequestId = childOrder.shipperRequestId || childOrder.id;
                        return (
                          <tr
                            key={childOrder.id}
                            className="orders-row orders-batch-subrow"
                          >
                            <td className="td-num td-subrow-num" title={childOrder.displayId}>
                              <div className="orders-subrow-id-wrap">
                                <span className="orders-subrow-tree" aria-hidden="true">
                                  ↳
                                </span>
                                <span className="orders-id-badge orders-id-badge--sub">
                                  #{childRequestId}
                                </span>
                                <span className="orders-subrow-truck-label">
                                  {t("orders.truckIndex", "Truck {{num}}", {
                                    num: childIdx + 1,
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="td-shipper td-subrow-cell" title={childOrder.shipper}>
                              <span className="orders-subrow-text">
                                {formatShortName(childOrder.shipper)}
                              </span>
                            </td>
                            <td className="td-type td-subrow-cell">
                              <span className="orders-subrow-text">
                                {childOrder.type === "Group"
                                  ? t("orders.modeGroup", "Group")
                                  : t("orders.modeIndividual", "Individual")}
                              </span>
                            </td>
                            <td
                              className="td-vehicletype td-subrow-cell"
                              title={childOrder.vehicleType}
                            >
                              {renderVehicleType(childOrder.vehicleType)}
                            </td>
                            <td className="td-item td-subrow-cell">{childOrder.item}</td>
                            <td className="td-location td-subrow-cell">
                              <span className="orders-subrow-route">
                                {formatTrimmedRoute(childOrder.origin, childOrder.destination)}
                              </span>
                            </td>
                            <td className="td-quintal td-subrow-cell">{childOrder.quintal}</td>
                            <td className="td-cost td-subrow-cell">
                              <div className="orders-cost-cell">
                                <span className="orders-cost-val">
                                  {childOrder.cost.toLocaleString()}{" "}
                                  <small className="orders-cost-cur">ETB</small>
                                </span>
                              </div>
                            </td>
                            <td className="td-action">
                              <div className="orders-actions-group">
                                {journey.isConnected ? (
                                  <button
                                    type="button"
                                    className={`orders-btn-status orders-btn-status--${journey.type}`}
                                    onClick={() => onViewRequests?.(childOrder)}
                                    title={journey.label}
                                    aria-label={journey.label}
                                  >
                                    <span>{journey.label}</span>
                                  </button>
                                ) : onViewRequests &&
                                  childOrder.isBiddingApproved &&
                                  (childOrder.driverRequests?.length || 0) > 0 ? (
                                  <button
                                    type="button"
                                    className="orders-btn-bids orders-btn-bids--active"
                                    onClick={() => onViewRequests(childOrder)}
                                    title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                                    aria-label={t(
                                      "orders.driverBidsTitle",
                                      "Driver Bids & Proposals"
                                    )}
                                  >
                                    <Gavel size={13} />
                                    <span>{t("orders.bids", "Bids")}</span>
                                    <span className="orders-bids-count">
                                      {childOrder.driverRequests?.length}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="orders-badge-waiting"
                                    onClick={() => {
                                      if (onViewRequests && childOrder.isBiddingApproved) {
                                        onViewRequests(childOrder);
                                      }
                                    }}
                                    title={
                                      childOrder.isBiddingApproved
                                        ? t("orders.waitingForBidsTooltip", "Waiting for driver proposals. Click to check bids.")
                                        : t("orders.waitingForDriver", "Waiting for Driver")
                                    }
                                  >
                                    <Clock size={11} />
                                    <span>{t("orders.waiting", "Waiting")}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="orders-action-btn orders-action-btn--edit"
                                  onClick={() => onEdit(childOrder)}
                                  title={t("orders.editOrderTitle", "Edit Order")}
                                  aria-label={t("orders.editOrderTitle", "Edit Order")}
                                >
                                  <Pencil size={17} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  className="orders-action-btn orders-action-btn--delete"
                                  onClick={() => onDelete(childOrder)}
                                  title={t("orders.deleteOrderTitle", "Delete Order")}
                                  aria-label={t("orders.deleteOrderTitle", "Delete Order")}
                                >
                                  <Trash2 size={17} strokeWidth={2} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
