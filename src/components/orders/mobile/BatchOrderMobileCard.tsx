import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Package, Truck, Tag } from "lucide-react";
import type { OrderBatchGroup, OrderDisplayItem } from "../OrdersTypes";
import { BatchSubCard } from "./BatchSubCard";
import { OrderMobileRoute } from "./OrderMobileRoute";
import { BatchMobileStatus } from "./BatchMobileStatus";

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
      <OrderMobileRoute
        origin={group.origin}
        destination={group.destination}
        isExpanded={isLocationExpanded}
        onToggle={onToggleLocation}
      />

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
          <BatchMobileStatus group={group} onViewRequests={onViewRequests} />
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
