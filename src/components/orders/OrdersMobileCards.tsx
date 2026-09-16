import { useState, useMemo, Fragment } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Package,
  Pencil,
  Trash2,
  Truck,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractCity } from "../../utils/formatters";
import type { OrderDisplayItem, OrderBatchGroup } from "./OrdersTypes";
import { getConnectedJourneyStatus, groupOrdersByBatch } from "./OrdersTypes";

interface OrdersMobileCardsProps {
  orders?: OrderDisplayItem[];
  batchGroups?: OrderBatchGroup[];
  activeTab: "ongoing" | "complete";
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrdersMobileCards({
  orders = [],
  batchGroups: passedBatchGroups,
  activeTab,
  onEdit,
  onDelete,
  onViewRequests,
}: OrdersMobileCardsProps) {
  const { t } = useTranslation();
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const batchGroups = useMemo(
    () => passedBatchGroups || groupOrdersByBatch(orders),
    [passedBatchGroups, orders]
  );

  const toggleLocation = (id: string) => {
    setExpandedLocationId((prev) => (prev === id ? null : id));
  };

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

  return (
    <div className="orders-mobile-card-list">
      {batchGroups.length === 0 ? (
        <div className="orders-empty-state orders-mobile-empty">
          <Package size={36} />
          <p>
            {activeTab === "ongoing"
              ? t("orders.emptyOngoing", "No ongoing orders at the moment.")
              : t("orders.emptyComplete", "No completed orders found.")}
          </p>
        </div>
      ) : (
        batchGroups.map((group) => {
          if (!group.isMultiVehicle) {
            const order = group.orders[0];
            return (
              <div key={order.id} className="orders-m-card">
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
                      {order.isBiddingApproved && !getConnectedJourneyStatus(order).isConnected && (
                        <span className="orders-badge-bidding">
                          <Tag size={10} />
                          {t("orders.openBidding", "Open for Bidding")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="orders-m-cost">
                    <span className="orders-m-cost-val">{order.cost.toLocaleString()}</span>
                    <span className="orders-m-cost-cur">ETB</span>
                  </div>
                </div>

                {/* Row 2: Location (Trimmed by default, click for whole location) */}
                {expandedLocationId === order.id ? (
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
                    {(() => {
                      const journey = getConnectedJourneyStatus(order);
                      if (journey.isConnected) {
                        return (
                          <button
                            type="button"
                            className={`orders-m-btn-status orders-m-btn-status--${journey.type}`}
                            onClick={() => onViewRequests?.(order)}
                            title={journey.label}
                          >
                            <span>{journey.label}</span>
                          </button>
                        );
                      }

                      if (onViewRequests && order.isBiddingApproved) {
                        return (
                          <button
                            type="button"
                            className={`orders-m-btn-requests ${
                              order.driverRequests && order.driverRequests.length > 0
                                ? "orders-m-btn-requests--active"
                                : ""
                            }`}
                            onClick={() => onViewRequests(order)}
                            title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                          >
                            <Gavel size={12} />
                            <span>
                              {t("orders.bids", "Bids")}
                              {order.driverRequests && order.driverRequests.length > 0
                                ? ` (${order.driverRequests.length})`
                                : ""}
                            </span>
                          </button>
                        );
                      }

                      return null;
                    })()}
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

          // Multi-vehicle batch card
          const isExpanded = expandedBatches.has(group.batchKey);
          return (
            <div key={group.batchKey} className="orders-m-card orders-m-card--batch">
              {/* Row 1: Shipper Name, Batch ID badge, Trucks count, and Total Cost */}
              <div className="orders-m-header">
                <div className="orders-m-shipper-wrap">
                  <span className="orders-m-shipper">{group.shipper}</span>
                  <div className="orders-m-badges">
                    <span className="orders-id-badge orders-id-badge--batch" title={group.displayId}>
                      {group.displayId}
                    </span>
                    <span className="orders-badge-truck-count">
                      {t("orders.truckCount", "{{count}} Trucks", { count: group.totalVehicles })}
                    </span>
                    <span className="orders-m-type-badge">
                      {group.type === "Group"
                        ? t("orders.modeGroup", "Group")
                        : t("orders.modeIndividual", "Individual")}
                    </span>
                    {group.isBiddingApproved && !group.statusSummary.isConnected && (
                      <span className="orders-badge-bidding">
                        <Tag size={10} />
                        {t("orders.openBidding", "Open for Bidding")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="orders-m-cost">
                  <span className="orders-m-cost-val">{group.totalCost.toLocaleString()}</span>
                  <span className="orders-m-cost-cur">ETB</span>
                </div>
              </div>

              {/* Row 2: Location Route */}
              {expandedLocationId === group.batchKey ? (
                <div
                  className="orders-m-route orders-m-route--expanded"
                  onClick={() => toggleLocation(group.batchKey)}
                  title={t("orders.clickToCollapse", "Click to collapse")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="orders-m-loc-row">
                    <span className="orders-loc-dot orders-loc-dot--origin" />
                    <span className="orders-m-loc-text">
                      <strong>{t("orders.from", "From")}:</strong> {group.origin}
                    </span>
                  </div>
                  <div className="orders-m-loc-row">
                    <span className="orders-loc-dot orders-loc-dot--dest" />
                    <span className="orders-m-loc-text">
                      <strong>{t("orders.to", "To")}:</strong> {group.destination}
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
                  onClick={() => toggleLocation(group.batchKey)}
                  title={t("orders.clickForFullLocation", "Click to view full location")}
                >
                  <span className="orders-m-city">{extractCity(group.origin)}</span>
                  <ArrowRight size={12} className="orders-m-arrow" />
                  <span className="orders-m-city">{extractCity(group.destination)}</span>
                  <ChevronDown size={11} className="orders-m-loc-chevron" />
                </button>
              )}

              {/* Row 3: Meta tags + View Trucks action */}
              <div className="orders-m-footer">
                <div className="orders-m-tags">
                  <span className="orders-m-tag item">
                    <Package size={11} />
                    {group.item}
                  </span>
                  {group.totalQuintal > 0 && (
                    <span className="orders-m-tag quintal">
                      {group.totalQuintal} Qtl
                    </span>
                  )}
                  <span className="orders-m-tag vehicle">
                    <Truck size={11} />
                    {group.vehicleType.replace(/\s*\(.*\)/, "")}
                  </span>
                </div>

                <div className="orders-m-actions">
                  {group.statusSummary.isConnected && (
                    <span
                      className={`orders-m-btn-status orders-m-btn-status--${group.statusSummary.type} ${
                        group.statusSummary.label.includes(" · ")
                          ? "orders-m-btn-status--partial"
                          : ""
                      }`}
                      title={group.statusSummary.label}
                    >
                      {group.statusSummary.label.includes(" · ") ? (
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
                    </span>
                  )}
                  <button
                    type="button"
                    className="orders-m-btn-expand-trucks"
                    onClick={() => toggleBatch(group.batchKey)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={12} />
                        <span>{t("orders.collapseBatch", "Collapse")}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        <span>{t("orders.viewTrucks", "View Trucks")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 4: Expandable Individual Vehicle Cards */}
              {isExpanded && (
                <div className="orders-m-subrows">
                  {group.orders.map((childOrder, childIdx) => {
                    const journey = getConnectedJourneyStatus(childOrder);
                    const childRequestId = childOrder.shipperRequestId || childOrder.id;
                    return (
                      <div key={childOrder.id} className="orders-m-subcard">
                        <div className="orders-m-subcard-header">
                          <div className="orders-m-subcard-title">
                            <span className="orders-subrow-tree" aria-hidden="true">
                              ↳
                            </span>
                            <span className="orders-id-badge orders-id-badge--sub">
                              #{childRequestId}
                            </span>
                            <span className="orders-subcard-truck-tag">
                              {t("orders.truckIndex", "Truck {{num}}", {
                                num: childIdx + 1,
                              })}
                            </span>
                          </div>
                          <div className="orders-m-subcard-meta">
                            <span>{childOrder.quintal} Qtl</span>
                            <span>•</span>
                            <span>{childOrder.cost.toLocaleString()} ETB</span>
                          </div>
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
                              title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                            >
                              <Gavel size={12} />
                              <span>
                                {t("orders.bids", "Bids")} (
                                {childOrder.driverRequests?.length})
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
                                      "Waiting for driver proposals. Click to check bids."
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
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
