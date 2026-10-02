import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import type { OrderDisplayItem, OrderBatchGroup } from "./OrdersTypes";
import { groupOrdersByBatch } from "./OrdersTypes";
import { OrderCard } from "./OrderCard";

export interface OrdersCardsListProps {
  orders?: OrderDisplayItem[];
  batchGroups?: OrderBatchGroup[];
  activeTab: "ongoing" | "complete";
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrdersCardsList({
  orders = [],
  batchGroups: passedBatchGroups,
  activeTab,
  onEdit,
  onDelete,
  onViewRequests,
}: OrdersCardsListProps) {
  const { t } = useTranslation();
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

  if (batchGroups.length === 0) {
    return (
      <div className="orders-cards-empty">
        <Package size={40} className="orders-cards-empty-icon" />
        <p className="orders-cards-empty-text">
          {activeTab === "ongoing"
            ? t("orders.emptyOngoing", "No ongoing orders at the moment.")
            : t("orders.emptyComplete", "No completed orders found.")}
        </p>
      </div>
    );
  }

  return (
    <div className="orders-cards-container">
      {batchGroups.map((group) => (
        <OrderCard
          key={group.batchKey}
          group={group}
          isExpanded={expandedBatches.has(group.batchKey)}
          onToggleExpand={toggleBatch}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewRequests={onViewRequests}
        />
      ))}
    </div>
  );
}

export default OrdersCardsList;
