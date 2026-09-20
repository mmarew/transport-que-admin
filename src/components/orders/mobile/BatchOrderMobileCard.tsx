import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Tag,
  Gavel,
  Clock,
} from "lucide-react";
import { extractCity } from "@/utils/formatters";
import type { OrderBatchGroup, OrderDisplayItem } from "../OrdersTypes";
import { BatchSubCard } from "./BatchSubCard";

export interface BatchOrderMobileCardProps {
  group: OrderBatchGroup;
  isLocationExpanded: boolean;
  onToggleLocation: () => void;
  isExpanded: boolean;
  onToggleBatch: () => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

/**
 * BatchOrderMobileCard renders multi-vehicle batch orders on mobile with expandable sub-cards.
 */
export function BatchOrderMobileCard({
  group,
  isLocationExpanded,
  onToggleLocation,
  isExpanded,
  onToggleBatch,
  onEdit,
  onDelete,
  onViewRequests,
}: BatchOrderMobileCardProps) {
  const { t } = useTranslation();

  return (
    <div className="orders-m-card orders-m-card--batch">
      {/* Row 1: Shipper Name, Batch ID badge, Trucks count, and Total Cost */}
      <div className="orders-m-header">
        <div className="orders-m-shipper-wrap">
          <span className="orders-m-shipper">{group.shipper}</span>
          <div className="orders-m-badges">
            <span
              className="orders-id-badge orders-id-badge--batch"
              title={group.displayId}
            >
              {group.displayId}
            </span>
            <span className="orders-badge-truck-count">
              {t("orders.truckCount", "{{count}} Trucks", {
                count: group.totalVehicles,
              })}
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
          <span className="orders-m-cost-val">
            {group.totalCost.toLocaleString()}
          </span>
          <span className="orders-m-cost-cur">ETB</span>
        </div>
      </div>

      {/* Row 2: Location Route */}
      {isLocationExpanded ? (
        <div
          className="orders-m-route orders-m-route--expanded"
          onClick={onToggleLocation}
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
          onClick={onToggleLocation}
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
          {group.statusSummary.isConnected ? (
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
                      {idx > 0 && (
                        <span className="orders-status-divider">·</span>
                      )}
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
          ) : (() => {
            const uniqueBidIds = new Set<string | number>();
            let totalBids = 0;
            for (const o of group.orders) {
              for (const r of o.driverRequests || []) {
                const rId =
                  r.driverRequestUniqueId ||
                  r.driverRequestId ||
                  r.userUniqueId;
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
                  className="orders-m-btn-requests orders-m-btn-requests--active"
                  onClick={() => onViewRequests?.(group.orders[0])}
                  title={t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                >
                  <Gavel size={12} />
                  <span>
                    {t("orders.bids", "Bids")} ({totalBids})
                  </span>
                </button>
              );
            }
            return (
              <span className="orders-m-badge-waiting orders-badge-waiting">
                <Clock size={11} />
                <span>
                  {group.totalVehicles > 1
                    ? t("orders.batchWaitingPart", "{{waiting}} Waiting", {
                        waiting: group.totalVehicles,
                      })
                    : t("orders.waiting", "Waiting")}
                </span>
              </span>
            );
          })()}
          <button
            type="button"
            className="orders-m-btn-expand-trucks"
            onClick={onToggleBatch}
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
          {group.orders.map((childOrder, childIdx) => (
            <BatchSubCard
              key={childOrder.id}
              childOrder={childOrder}
              childIdx={childIdx}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewRequests={onViewRequests}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BatchOrderMobileCard;
