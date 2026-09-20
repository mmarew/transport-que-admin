import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
} from "../../lib/redux/api";
import { useQueueSocket } from "../../hooks/useQueueSocket";
import { useOrdersView } from "../../hooks/useOrdersView";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { normalizeOrgList, extractCity } from "../../utils/formatters";
import { OrdersTable } from "../../components/orders/OrdersTable";
import { OrdersMobileCards } from "../../components/orders/OrdersMobileCards";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersModals } from "../../components/orders/OrdersModals";
import type { OrderDisplayItem } from "../../components/orders/OrdersTypes";
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

  // Live WebSocket subscription for orders
  const { socketConnected } = useQueueSocket(activeOrg?.queueOrganizationUniqueId || "");

  // Backend queries
  const {
    data: backendOrdersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetShipperRequestsQuery(
    {
      queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "",
      target: "all",
      limit: 100,
    },
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

  const refetchAll = () => {
    refetchOrders();
    refetchBatches();
  };

  // Local CRUD overrides
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderDisplayItem>>({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<OrderDisplayItem | null>(null);
  const [viewingRequestsOrder, setViewingRequestsOrder] = useState<OrderDisplayItem | null>(null);

  // Derive orders from backend data via data mapper
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

  // Extracted orders view pipeline (tabs, filters, sorts, pagination)
  const phoneFilter = searchParams.get("phone") || "";
  const {
    activeTab,
    setActiveTab,
    safeCurrentPage,
    setCurrentPage,
    sortCol,
    handleSort,
    allBatches,
    currentBatches,
    paginatedOrders,
    totalPages,
  } = useOrdersView({ orders, phoneFilter });

  // Handlers
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
            onClick={() => setActiveTab("ongoing")}
          >
            {t("orders.ongoingTab", "Ongoing")}
          </button>
          <button
            type="button"
            className={`orders-tab-pill ${activeTab === "complete" ? "active" : ""}`}
            onClick={() => setActiveTab("complete")}
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

        {/* ── All Modals Orchestration ── */}
        <OrdersModals
          currentViewingOrder={currentViewingOrder}
          activeOrg={activeOrg}
          onCloseViewing={() => setViewingRequestsOrder(null)}
          onRefresh={refetchAll}
          showCreateModal={showCreateModal}
          onCloseCreate={() => setShowCreateModal(false)}
          onOrderCreated={refetchAll}
          editingOrder={editingOrder}
          onCloseEdit={() => setEditingOrder(null)}
          onSaveEdit={handleSaveEdit}
          deletingOrder={deletingOrder}
          onCloseDelete={() => setDeletingOrder(null)}
          onConfirmDelete={confirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}

export default OrdersPage;
