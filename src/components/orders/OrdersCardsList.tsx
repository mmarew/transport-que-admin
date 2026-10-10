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
  expandedBatchId?: string | null;
  loadingBatchUids?: Set<string>;
  onToggleExpand?: (batchKey: string, group?: OrderBatchGroup) => void;
  onEdit: (order: OrderDisplayItem) => void;
  onDelete: (order: OrderDisplayItem) => void;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function OrdersCardsList({
  orders = [],
  batchGroups: passedBatchGroups,
  activeTab,
  expandedBatchId: passedExpandedBatchId,
  loadingBatchUids,
  onToggleExpand: passedOnToggleExpand,
  onEdit,
  onDelete,
  onViewRequests,
}: OrdersCardsListProps) {
  const { t } = useTranslation();
  const [internalExpandedBatchId, setInternalExpandedBatchId] = useState<string | null>(null);

  const isControlled = passedExpandedBatchId !== undefined;
  const currentExpandedBatchId = isControlled ? passedExpandedBatchId : internalExpandedBatchId;

  const batchGroups = useMemo(
    () => passedBatchGroups || groupOrdersByBatch(orders),
    [passedBatchGroups, orders]
  );

  const toggleBatch = (batchKey: string, group: OrderBatchGroup) => {
    if (passedOnToggleExpand) {
      passedOnToggleExpand(batchKey, group);
    } else {
      setInternalExpandedBatchId((prev) => (prev === batchKey ? null : batchKey));
    }
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
      {batchGroups.map((group) => {
        const batchUid =
          group.batchUniqueId ||
          group.orders[0]?.batchUniqueId ||
          (group.orders[0] as any)?.shipperRequestBatchUniqueId ||
          group.batchKey.replace(/^batch-/, "");
        const isLoading = Boolean(loadingBatchUids?.has(batchUid));

        return (
          <OrderCard
            key={group.batchKey}
            group={group}
            isExpanded={currentExpandedBatchId === group.batchKey}
            isLoading={isLoading}
            onToggleExpand={(key) => toggleBatch(key, group)}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewRequests={onViewRequests}
          />
        );
      })}
    </div>
  );
}

export default OrdersCardsList;
