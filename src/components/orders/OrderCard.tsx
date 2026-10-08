import React from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, OrderBatchGroup } from "./OrdersTypes";
import {
  formatRoute,
  getVehicleNoun,
  formatWeight,
  formatCost,
  getConnectedJourneyStatus,
} from "./OrdersTypes";

export interface OrderCardProps {
  group: OrderBatchGroup;
  isExpanded?: boolean;
  onToggleExpand?: (batchKey: string) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrderCard({
  group,
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onViewRequests,
}: OrderCardProps) {
  const { t } = useTranslation();

  // Accordion toggle button is present on Group / multi-truck orders (matching picture)
  const isExpandable =
    group.type === "Group" || group.isMultiVehicle || group.orders.length > 1;

  // Format ID ensuring "#" prefix
  const rawId = group.displayId || group.orders[0]?.displayId || `#${group.batchId || group.orders[0]?.id}`;
  const displayId = rawId.startsWith("#") ? rawId : `#${rawId}`;

  // Route: Dessie → Kombolcha
  const routeText = formatRoute(group.origin, group.destination);

  // Phone number (e.g. +251929257890)
  const phone =
    group.phone ||
    group.orders[0]?.phone ||
    group.shipper ||
    "";

  // Calculate waiting count & status badge
  const waitingCount =
    group.waitingCount != null && group.waitingCount > 0
      ? group.waitingCount
      : group.orders.filter((o) => !getConnectedJourneyStatus(o).isConnected).length ||
        group.totalVehicles ||
        group.orders.length ||
        1;

  const vehicleNoun = getVehicleNoun(
    group.vehicleType,
    group.totalVehicles || group.orders.length || 1
  );

  const hasConnectedJourney = group.statusSummary?.isConnected;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only toggle if user didn't click inside interactive elements (buttons, inputs)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    if (isExpandable && onToggleExpand) {
      onToggleExpand(group.batchKey);
    }
  };

  return (
    <div
      className={`order-card ${isExpanded ? "order-card--expanded" : ""}`}
      onClick={handleCardClick}
    >
      {/* ── Top Header Row ── */}
      <div className="order-card-header">
        <div className="order-card-header-left">
          {/* Accordion button for Group / multi-truck orders */}
          {isExpandable ? (
            <button
              type="button"
              className="order-card-chevron-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(group.batchKey);
              }}
              title={
                isExpanded
                  ? t("orders.collapseBatch", "Collapse")
                  : t("orders.expandBatch", "Expand")
              }
              aria-label={
                isExpanded
                  ? t("orders.collapseBatch", "Collapse")
                  : t("orders.expandBatch", "Expand")
              }
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : null}

          <div className="order-card-title-group">
            <span className="order-card-id">{displayId}</span>
            <h3
              className="order-card-route"
              title={`${group.origin} → ${group.destination}`}
            >
              {routeText}
            </h3>
            {phone ? (
              <span className="order-card-phone" title={group.shipper}>
                {phone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="order-card-header-right">
          {/* Waiting / Journey status pill */}
          {hasConnectedJourney ? (
            <button
              type="button"
              className={`order-card-badge-status order-card-badge-status--${group.statusSummary.type}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewRequests?.(group.orders[0]);
              }}
              title={group.statusSummary.label}
            >
              <span className="order-card-status-dot" />
              <span>{group.statusSummary.label}</span>
            </button>
          ) : (
            <button
              type="button"
              className="order-card-badge-waiting"
              onClick={(e) => {
                e.stopPropagation();
                onViewRequests?.(group.orders[0]);
              }}
              title={
                group.type === "Group"
                  ? t("orders.companyBidsTitle", "Company Bids & Proposals")
                  : t("orders.driverBidsTitle", "Driver Bids & Proposals")
              }
            >
              <span className="order-card-badge-dot" />
              <span>
                {waitingCount} {t("orders.waitingLower", "waiting")}
              </span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <div className="order-card-actions">
            <button
              type="button"
              className="order-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group.orders[0]);
              }}
              title={t("orders.editOrderTitle", "Edit Order")}
              aria-label={t("orders.editOrderTitle", "Edit Order")}
            >
              <Pencil size={15} />
            </button>

            <button
              type="button"
              className="order-card-action-btn order-card-action-btn--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete({ ...group.orders[0], _isBatchMaster: true } as any);
              }}
              title={t("orders.deleteOrderTitle", "Delete Order")}
              aria-label={t("orders.deleteOrderTitle", "Delete Order")}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 6 Data Boxes Grid ── */}
      <div className="order-card-boxes">
        {/* 1. VEHICLE */}
        <div className="order-card-data-box">
          <span className="order-card-data-label">
            {t("orders.card.vehicle", "VEHICLE")}
          </span>
          <span className="order-card-data-value">{vehicleNoun}</span>
        </div>

        {/* 2. TYPE */}
        <div className="order-card-data-box">
          <span className="order-card-data-label">
            {t("orders.card.type", "TYPE")}
          </span>
          <span className="order-card-data-value">
            {group.type === "Group"
              ? t("orders.modeGroup", "Group")
              : t("orders.modeIndividual", "Individual")}
          </span>
        </div>

        {/* 3. ITEM */}
        <div className="order-card-data-box">
          <span className="order-card-data-label">
            {t("orders.card.item", "ITEM")}
          </span>
          <span
            className="order-card-data-value"
            title={group.item}
          >
            {group.item || t("orders.defaultGeneralCargo", "General Cargo")}
          </span>
        </div>

        {/* 4. WEIGHT */}
        <div className="order-card-data-box">
          <span className="order-card-data-label">
            {t("orders.card.weight", "WEIGHT")}
          </span>
          <span className="order-card-data-value">
            {formatWeight(group.totalQuintal)}
          </span>
        </div>

        {/* 5. COST */}
        <div className="order-card-data-box">
          <span className="order-card-data-label">
            {t("orders.card.cost", "COST")}
          </span>
          <span className="order-card-data-value">
            {formatCost(group.totalCost)}
          </span>
        </div>

        {/* 6. VEHICLE TYPE */}
        <div className="order-card-data-box order-card-data-box--vehicle-type">
          <span className="order-card-data-label">
            {t("orders.card.vehicleType", "VEHICLE TYPE")}
          </span>
          <span
            className="order-card-data-value order-card-data-value--vehicle-type"
            title={group.vehicleType}
          >
            {group.vehicleType || t("orders.defaultHeavyTruck", "Heavy Truck")}
          </span>
        </div>
      </div>

      {/* ── Sub-Orders Accordion (for multi-vehicle batch orders) ── */}
      {isExpanded && group.orders.length > 0 && (
        <div className="order-card-suborders">
          <div className="order-card-suborders-header">
            <span className="order-card-suborders-title">
              {t("orders.subOrdersList", "Vehicles & Sub-orders in this Batch")}
            </span>
            <span className="order-card-suborders-count">
              {group.orders.length} {t("orders.vehicles", "Vehicles")}
            </span>
          </div>

          <div className="order-card-suborders-list">
            {group.orders.map((childOrder, childIdx) => {
              const childJourney = getConnectedJourneyStatus(childOrder);
              const batchNum =
                group.batchId ||
                childOrder.batchId ||
                (group.displayId ? group.displayId.replace(/^#/, "") : "1");
              const hasReqId =
                childOrder.shipperRequestId != null &&
                String(childOrder.shipperRequestId).trim() !== "" &&
                !isNaN(Number(childOrder.shipperRequestId));
              const reqId = hasReqId
                ? String(childOrder.shipperRequestId)
                : childOrder.displayId?.includes("/")
                ? childOrder.displayId.replace(/^#/, "").split("/")[1]
                : null;
              const displayTruckId =
                batchNum && reqId
                  ? `#${batchNum}/${reqId}`
                  : childOrder.displayId || `#${batchNum}`;

              const queueId =
                childOrder.queueNumber != null && childOrder.queueNumber !== ""
                  ? childOrder.queueNumber
                  : "—";

              const loadingOrderId =
                childOrder.loadingOrderNumber != null && childOrder.loadingOrderNumber !== ""
                  ? childOrder.loadingOrderNumber
                  : "—";

              return (
                <div key={childOrder.id} className="order-subcard-item">
                  <div className="order-subcard-left">
                    <span className="order-subcard-id">{displayTruckId}</span>
                    {(queueId !== "—" || loadingOrderId !== "—") && (
                      <span className="order-subcard-meta">
                        {queueId !== "—" && (
                          <span>{t("orders.queueNumber", "Queue")}: {queueId}</span>
                        )}
                        {queueId !== "—" && loadingOrderId !== "—" && " · "}
                        {loadingOrderId !== "—" && (
                          <span>{t("orders.loadingOrderNumber", "Loading Order")}: {loadingOrderId}</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="order-subcard-right">
                    {childJourney.isConnected ? (
                      <span className={`order-subcard-status order-subcard-status--${childJourney.type}`}>
                        {childJourney.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="order-subcard-waiting"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewRequests?.(childOrder);
                        }}
                        title={
                          group.type === "Group"
                            ? t("orders.companyBidsTitle", "Company Bids & Proposals")
                            : t("orders.driverBidsTitle", "Driver Bids & Proposals")
                        }
                      >
                        {t("orders.waiting", "Waiting")}
                      </button>
                    )}

                    <div className="order-subcard-actions">
                      <button
                        type="button"
                        className="order-card-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(childOrder);
                        }}
                        title={t("orders.editOrderTitle", "Edit")}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="order-card-action-btn order-card-action-btn--delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(childOrder);
                        }}
                        title={t("orders.deleteOrderTitle", "Delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderCard;
