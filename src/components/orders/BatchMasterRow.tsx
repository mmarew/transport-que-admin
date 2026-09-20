import type React from "react";
import { Fragment } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem, OrderBatchGroup } from "./OrdersTypes";
import {
  formatShortName,
  formatTrimmedRoute,
  getConnectedJourneyStatus,
} from "./OrdersTypes";
import { renderVehicleType } from "./OrderPrimitives";

export interface BatchMasterRowProps {
  group: OrderBatchGroup;
  isExpanded: boolean;
  toggleBatch: (batchKey: string) => void;
  expandedLocationId: string | null;
  toggleLocation: (id: string, e: React.MouseEvent) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function BatchMasterRow({
  group,
  isExpanded,
  toggleBatch,
  expandedLocationId,
  toggleLocation,
  onEdit,
  onDelete,
  onViewRequests,
}: BatchMasterRowProps) {
  const { t } = useTranslation();
  const isExpandedLoc = expandedLocationId === group.batchKey;

  return (
    <tr
      className={`orders-row orders-batch-master-row ${
        isExpanded ? "orders-batch-master-row--open" : ""
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
        className={`td-location ${isExpandedLoc ? "td-location--expanded" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isExpandedLoc ? (
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
                toggleLocation(group.batchKey, e as unknown as React.MouseEvent);
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

              if (totalBids > 0) {
                return (
                  <button
                    type="button"
                    className="orders-btn-bids orders-btn-bids--active"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewRequests(group.orders[0]);
                    }}
                    title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                    aria-label={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                  >
                    <Gavel size={13} />
                    <span>{t("orders.bids", "Bids")}</span>
                    <span className="orders-bids-count">{totalBids}</span>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  className="orders-badge-waiting"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewRequests(group.orders[0]);
                  }}
                  title={t(
                    "orders.waitingForBidsTooltip",
                    "Waiting for driver proposals. Click to check bids."
                  )}
                  aria-label={t(
                    "orders.waitingForBidsTooltip",
                    "Waiting for driver proposals. Click to check bids."
                  )}
                >
                  <Clock size={11} />
                  <span>
                    {group.totalVehicles > 1
                      ? t("orders.batchWaitingPart", "{{waiting}} Waiting", {
                          waiting: group.totalVehicles,
                        })
                      : t("orders.waiting", "Waiting")}
                  </span>
                </button>
              );
            }

            return (
              <button
                type="button"
                className="orders-badge-waiting"
                title={t("orders.waitingForDriver", "Waiting for Driver")}
                aria-label={t("orders.waitingForDriver", "Waiting for Driver")}
              >
                <Clock size={11} />
                <span>
                  {group.totalVehicles > 1
                    ? t("orders.batchWaitingPart", "{{waiting}} Waiting", {
                        waiting: group.totalVehicles,
                      })
                    : t("orders.waiting", "Waiting")}
                </span>
              </button>
            );
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
  );
}

export default BatchMasterRow;
