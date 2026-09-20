import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import type { OrderDisplayItem, OrderBatchGroup } from "./OrdersTypes";
import { groupOrdersByBatch } from "./OrdersTypes";
import { SingleOrderMobileCard } from "./mobile/SingleOrderMobileCard";
import { BatchOrderMobileCard } from "./mobile/BatchOrderMobileCard";

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
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(
    null,
  );
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    new Set(),
  );

  const batchGroups = useMemo(
    () => passedBatchGroups || groupOrdersByBatch(orders),
    [passedBatchGroups, orders],
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
              <SingleOrderMobileCard
                key={order.id}
                order={order}
                isLocationExpanded={expandedLocationId === order.id}
                onToggleLocation={() => toggleLocation(order.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewRequests={onViewRequests}
              />
            );
          }

          return (
            <BatchOrderMobileCard
              key={group.batchKey}
              group={group}
              isLocationExpanded={expandedLocationId === group.batchKey}
              onToggleLocation={() => toggleLocation(group.batchKey)}
              isExpanded={expandedBatches.has(group.batchKey)}
              onToggleBatch={() => toggleBatch(group.batchKey)}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewRequests={onViewRequests}
            />
          );
        })
      )}
    </div>
  );
}

export default OrdersMobileCards;
