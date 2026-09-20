import { useState, useMemo } from "react";
import type {
  OrderDisplayItem,
  SortColumn,
  OrderBatchGroup,
} from "../components/orders/OrdersTypes";
import {
  groupOrdersByBatch,
  getConnectedJourneyStatus,
  PAGE_SIZE,
} from "../components/orders/OrdersTypes";

export interface UseOrdersViewOptions {
  orders: OrderDisplayItem[];
  phoneFilter?: string;
}

export function useOrdersView({
  orders,
  phoneFilter = "",
}: UseOrdersViewOptions) {
  const [activeTab, setActiveTab] = useState<"ongoing" | "complete">("ongoing");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<SortColumn>("shipper");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // 1. Filter orders strictly by activeTab:
  // - "ongoing": only orders where journey is NOT completed
  // - "complete": only orders where journey IS completed
  const tabOrders = useMemo(() => {
    if (activeTab === "complete") {
      return orders.filter((o) => getConnectedJourneyStatus(o).type === "completed");
    } else {
      return orders.filter((o) => getConnectedJourneyStatus(o).type !== "completed");
    }
  }, [orders, activeTab]);

  // 2. Group tab-specific orders by batch
  const allBatchGroups = useMemo(() => groupOrdersByBatch(tabOrders), [tabOrders]);

  // 3. Filter batch groups by search parameters (e.g. phone) and sort
  const allBatches = useMemo(() => {
    const filtered = allBatchGroups.filter((group) => {
      if (phoneFilter && !group.orders.some((o) => o.phone === phoneFilter)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortCol) {
        case "id":
          valA = (a.displayId || "").toLowerCase();
          valB = (b.displayId || "").toLowerCase();
          break;
        case "shipper":
          valA = a.shipper.toLowerCase();
          valB = b.shipper.toLowerCase();
          break;
        case "type":
          valA = a.type;
          valB = b.type;
          break;
        case "vehicleType":
          valA = a.vehicleType.toLowerCase();
          valB = b.vehicleType.toLowerCase();
          break;
        case "item":
          valA = a.item.toLowerCase();
          valB = b.item.toLowerCase();
          break;
        case "location":
          valA = `${a.origin} ${a.destination}`.toLowerCase();
          valB = `${b.origin} ${b.destination}`.toLowerCase();
          break;
        case "quintal":
          valA = a.totalQuintal;
          valB = b.totalQuintal;
          break;
        case "cost":
          valA = a.totalCost;
          valB = b.totalCost;
          break;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [allBatchGroups, sortCol, sortAsc, phoneFilter]);

  const totalPages = Math.max(1, Math.ceil(allBatches.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const currentBatches: OrderBatchGroup[] = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return allBatches.slice(start, start + PAGE_SIZE);
  }, [allBatches, safeCurrentPage]);

  const paginatedOrders: OrderDisplayItem[] = useMemo(() => {
    return currentBatches.flatMap((b) => b.orders);
  }, [currentBatches]);

  const handleSort = (col: SortColumn) => {
    setCurrentPage(1);
    if (sortCol === col) setSortAsc((prev) => !prev);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleTabChange = (tab: "ongoing" | "complete") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return {
    activeTab,
    setActiveTab: handleTabChange,
    currentPage,
    safeCurrentPage,
    setCurrentPage,
    sortCol,
    sortAsc,
    handleSort,
    allBatches,
    currentBatches,
    paginatedOrders,
    totalPages,
  };
}

export default useOrdersView;
