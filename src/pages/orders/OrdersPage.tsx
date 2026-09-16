import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { CreateOrderModal } from "../../components/queue/CreateOrderModal";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
} from "../../lib/redux/api";
import {
  connectSocket,
  subscribeToQueue,
  unsubscribeFromQueue,
} from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { normalizeOrgList, extractCity } from "../../utils/formatters";
import { OrdersTable } from "../../components/orders/OrdersTable";
import { OrdersMobileCards } from "../../components/orders/OrdersMobileCards";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersEditModal } from "../../components/orders/OrdersEditModal";
import { OrdersDeleteModal } from "../../components/orders/OrdersDeleteModal";
import { DriverBidsModal } from "../../components/orders/DriverBidsModal";
import { groupOrdersByBatch, getConnectedJourneyStatus } from "../../components/orders/OrdersTypes";
import type {
  OrderDisplayItem,
  SortColumn,
} from "../../components/orders/OrdersTypes";
import { PAGE_SIZE } from "../../components/orders/OrdersTypes";
import { mapBackendOrdersToDisplayItems } from "./ordersDataMapper";
import "./OrdersPage.css";

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  // Active organization
  const targetOrgId = searchParams.get("orgId") || selectedOrgId || "";
  const { data: orgListData } = useListQueueOrganizationsQuery();
  const orgList = useMemo(() => normalizeOrgList(orgListData), [orgListData]);

  const activeOrg = useMemo(() => {
    if (!targetOrgId) return orgList[0]?.organization || null;
    return (
      orgList.find(
        (item) => item.organization?.queueOrganizationUniqueId === targetOrgId
      )?.organization ||
      orgList[0]?.organization ||
      null
    );
  }, [orgList, targetOrgId]);

  // Backend data
  const {
    data: backendOrdersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "", target: "all", limit: 100 },
    {
      skip: !activeOrg?.queueOrganizationUniqueId,
      refetchOnReconnect: true,
      refetchOnFocus: true,
      pollingInterval: 5000,
    }
  );

  const {
    data: backendBatchesData,
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useGetShipperRequestBatchesQuery(
    {
      queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "",
      requestMode: "company_target",
      includeBids: true,
      limit: 100,
    },
    {
      skip: !activeOrg?.queueOrganizationUniqueId,
      refetchOnReconnect: true,
      refetchOnFocus: true,
      pollingInterval: 5000,
    }
  );

  const socketConnected = useQueueAdminStore((s) => s.socketConnected);

  // State
  const [activeTab, setActiveTab] = useState<"ongoing" | "complete">("ongoing");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<SortColumn>("shipper");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<OrderDisplayItem | null>(null);
  const [viewingRequestsOrder, setViewingRequestsOrder] = useState<OrderDisplayItem | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderDisplayItem>>({});

  // Live WebSocket subscription for orders (real-time updates via RTK Query tag invalidation)
  useEffect(() => {
    const orgId = activeOrg?.queueOrganizationUniqueId;
    if (!orgId) return;

    connectSocket();
    subscribeToQueue(orgId);

    return () => {
      unsubscribeFromQueue(orgId);
    };
  }, [activeOrg?.queueOrganizationUniqueId]);

  // Derive orders from backend data
  // Derive orders from backend data (mapped via modular data mapper)
  const orders = useMemo<OrderDisplayItem[]>(
    () =>
      mapBackendOrdersToDisplayItems({
        ordersData: backendOrdersData,
        batchesData: backendBatchesData,
        deletedIds,
        editedOrders,
        activeOrg,
        targetOrgId,
        t,
      }),
    [backendOrdersData, backendBatchesData, deletedIds, editedOrders, activeOrg, targetOrgId, t]
  );

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

  // 2. Group tab-specific orders by batch so multi-truck batches appear as unified groups in their respective tab
  const allBatchGroups = useMemo(() => groupOrdersByBatch(tabOrders), [tabOrders]);

  // 3. Filter batch groups by search parameters (e.g. phone)
  const allBatches = useMemo(() => {
    const phoneFilter = searchParams.get("phone") || "";

    const filtered = allBatchGroups.filter((group) => {
      if (phoneFilter && !group.orders.some((o) => o.phone === phoneFilter)) {
        return false;
      }
      return true;
    });

    // Sort batch groups
    return [...filtered].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortCol) {
        case "id": valA = (a.displayId || "").toLowerCase(); valB = (b.displayId || "").toLowerCase(); break;
        case "shipper": valA = a.shipper.toLowerCase(); valB = b.shipper.toLowerCase(); break;
        case "type": valA = a.type; valB = b.type; break;
        case "vehicleType": valA = a.vehicleType.toLowerCase(); valB = b.vehicleType.toLowerCase(); break;
        case "item": valA = a.item.toLowerCase(); valB = b.item.toLowerCase(); break;
        case "location": valA = `${a.origin} ${a.destination}`.toLowerCase(); valB = `${b.origin} ${b.destination}`.toLowerCase(); break;
        case "quintal": valA = a.totalQuintal; valB = b.totalQuintal; break;
        case "cost": valA = a.totalCost; valB = b.totalCost; break;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [allBatchGroups, activeTab, sortCol, sortAsc, searchParams]);

  const totalPages = Math.max(1, Math.ceil(allBatches.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentBatches = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return allBatches.slice(start, start + PAGE_SIZE);
  }, [allBatches, safeCurrentPage]);
  const paginatedOrders = useMemo(() => {
    return currentBatches.flatMap((b) => b.orders);
  }, [currentBatches]);

  // Handlers
  const handleSort = (col: SortColumn) => {
    setCurrentPage(1);
    if (sortCol === col) setSortAsc((prev) => !prev);
    else { setSortCol(col); setSortAsc(true); }
  };

  const confirmDelete = () => {
    if (!deletingOrder) return;
    if ((deletingOrder as any)._isBatchMaster && deletingOrder.batchId) {
      const batchIds = orders
        .filter((o) => o.batchId === deletingOrder.batchId)
        .map((o) => o.id);
      setDeletedIds((prev) => new Set([...prev, ...batchIds, deletingOrder.id]));
    } else {
      setDeletedIds((prev) => new Set([...prev, deletingOrder.id]));
    }
    toast.success(t("orders.orderDeletedSuccess", "Order deleted successfully"));
    setDeletingOrder(null);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const formData = new FormData(e.currentTarget);
    const updatedOrder: OrderDisplayItem = {
      ...editingOrder,
      shipper: String(formData.get("shipper") || editingOrder.shipper),
      type: (formData.get("type") as "Individual" | "Group") || editingOrder.type,
      vehicleType: String(formData.get("vehicleType") || editingOrder.vehicleType),
      item: String(formData.get("item") || editingOrder.item),
      origin: String(formData.get("origin") || editingOrder.origin),
      destination: String(formData.get("destination") || editingOrder.destination),
      quintal: Number(formData.get("quintal")) || editingOrder.quintal,
      cost: Number(formData.get("cost")) || editingOrder.cost,
      status: (formData.get("status") as "ongoing" | "complete") || editingOrder.status,
    };
    setEditedOrders((prev) => ({ ...prev, [editingOrder.id]: updatedOrder }));
    toast.success(t("orders.orderUpdatedSuccess", "Order updated successfully"));
    setEditingOrder(null);
  };

  const handleBackToOrganizations = () => {
    setSelectedOrgId("");
    navigate("/dashboard");
  };

  const orgName = activeOrg?.queueOrganizationName || t("orders.defaultOrgName");
  const orgCity = extractCity(activeOrg?.queueOrganizationAddress) || "Addis Ababa";

  const currentViewingOrder = useMemo(() => {
    if (!viewingRequestsOrder) return null;
    return orders.find((o) => o.id === viewingRequestsOrder.id) || viewingRequestsOrder;
  }, [orders, viewingRequestsOrder]);

  return (
    <DashboardLayout activeTab="orders">
      <div className="orders-page-container">
        {/* ── Back link ── */}
        <button
          type="button"
          className="orders-back-link"
          onClick={handleBackToOrganizations}
        >
          <ArrowLeft size={16} />
          <span>{t("orders.backToOrganizations", "Back to Organizations")}</span>
        </button>

        {/* ── Header ── */}
        <div className="orders-header-row">
          <div className="orders-header-left">
            <div className="orders-title-wrap">
              <h1 className="orders-title">{t("orders.pageTitle", "Orders")}</h1>
              <span
                className={`orders-live-badge ${socketConnected ? "orders-live-badge--connected" : "orders-live-badge--syncing"}`}
                title={
                  socketConnected
                    ? t("orders.socketLiveTooltip", "Real-time WebSocket connected")
                    : t("orders.socketSyncingTooltip", "Syncing live updates (auto-refreshing)")
                }
              >
                <span className={`orders-live-dot ${socketConnected ? "" : "orders-live-dot--syncing"}`} />
                {socketConnected ? t("orders.liveBadge", "Live") : t("orders.syncingBadge", "Syncing")}
              </span>
            </div>
            <p className="orders-subtitle">{`${orgName} — ${orgCity}`}</p>
          </div>
          <div className="orders-header-actions">
            <button
              type="button"
              className="orders-btn-new"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t("orders.newOrderBtn", "New Order")}</span>
            </button>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="orders-tabs">
          <button
            type="button"
            className={`orders-tab-pill ${activeTab === "ongoing" ? "active" : ""}`}
            onClick={() => { setActiveTab("ongoing"); setCurrentPage(1); }}
          >
            {t("orders.ongoingTab", "Ongoing")}
          </button>
          <button
            type="button"
            className={`orders-tab-pill ${activeTab === "complete" ? "active" : ""}`}
            onClick={() => { setActiveTab("complete"); setCurrentPage(1); }}
          >
            {t("orders.completeTab", "Complete")}
          </button>
        </div>

        {/* ── Desktop Table ── */}
        <OrdersTable
          batchGroups={currentBatches}
          orders={paginatedOrders}
          sortCol={sortCol}
          activeTab={activeTab}
          currentPage={safeCurrentPage}
          onSort={handleSort}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={setViewingRequestsOrder}
        />

        {/* ── Mobile Cards ── */}
        <OrdersMobileCards
          batchGroups={currentBatches}
          orders={paginatedOrders}
          activeTab={activeTab}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={setViewingRequestsOrder}
        />

        {/* ── Pagination ── */}
        <OrdersPagination
          isLoading={isLoadingOrders || isLoadingBatches}
          totalFiltered={allBatches.length}
          totalShown={paginatedOrders.length}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* ── Driver Bids & Requests Modal ── */}
        {currentViewingOrder && (
          <DriverBidsModal
            order={currentViewingOrder}
            driverRequests={currentViewingOrder.driverRequests || []}
            queueOrganizationUniqueId={
              activeOrg?.queueOrganizationUniqueId ||
              currentViewingOrder.queueOrganizationUniqueId ||
              ""
            }
            onClose={() => {
              setViewingRequestsOrder(null);
              refetchOrders();
              refetchBatches();
            }}
            onOrderUpdated={() => {
              refetchOrders();
              refetchBatches();
            }}
          />
        )}

        {/* ── Create Modal ── */}
        {showCreateModal && (
          <CreateOrderModal
            queueOrganizationUniqueId={activeOrg?.queueOrganizationUniqueId || ""}
            origin={{
              latitude: activeOrg?.latitude != null ? Number(activeOrg.latitude) : null,
              longitude: activeOrg?.longitude != null ? Number(activeOrg.longitude) : null,
              description: activeOrg?.queueOrganizationAddress || "Cement Factory, Addis Ababa",
            }}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              refetchOrders();
              refetchBatches();
            }}
          />
        )}

        {/* ── Edit Modal ── */}
        {editingOrder && (
          <OrdersEditModal
            order={editingOrder}
            onClose={() => setEditingOrder(null)}
            onSave={handleSaveEdit}
          />
        )}

        {/* ── Delete Modal ── */}
        {deletingOrder && (
          <OrdersDeleteModal
            order={deletingOrder}
            onClose={() => setDeletingOrder(null)}
            onConfirm={confirmDelete}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
