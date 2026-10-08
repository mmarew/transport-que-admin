import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
  api,
} from "../../lib/redux/api";
import { useAppDispatch } from "../../lib/redux/hooks";
import { useQueueSocket } from "../../hooks/useQueueSocket";
import { useOrdersView } from "../../hooks/useOrdersView";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { normalizeOrgList, extractCity } from "../../utils/formatters";
import { OrdersCardsList } from "../../components/orders/OrdersCardsList";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersModals } from "../../components/orders/OrdersModals";
import type { OrderDisplayItem } from "../../components/orders/OrdersTypes";
import { extractJourneyStatusId } from "../../utils/journeyStatus";
import { mapBackendOrdersToDisplayItems } from "./ordersDataMapper";
import "./OrdersPage.css";

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  // Active organization
  const targetOrgId = searchParams.get("orgId") || selectedOrgId || "";
  // Optional single-batch scope: /orders?orgId=<id>&batch=<shipperRequestBatchUniqueId>
  const targetBatchId = searchParams.get("batch") || "";
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
  const { socketConnected, isLive } = useQueueSocket(activeOrg?.queueOrganizationUniqueId || "");
  const live = isLive || socketConnected;

  // Stable query arguments: use targetOrgId immediately so initial fetch is synchronized with Sidebar and cache-deduplicated
  const orgUniqueId = targetOrgId || activeOrg?.queueOrganizationUniqueId || "";

  const shipperRequestsArgs = useMemo(
    () => ({
      queueOrganizationUniqueId: orgUniqueId,
      target: "all" as const,
      limit: 100,
      // Batch-scoped: ask the backend for this batch's rows only instead of
      // pulling every request for the org.
      ...(targetBatchId ? { shipperRequestBatchUniqueId: targetBatchId } : {}),
    }),
    [orgUniqueId, targetBatchId]
  );

  const shipperBatchesArgs = useMemo(
    () => ({
      queueOrganizationUniqueId: orgUniqueId,
      requestMode: "company_target" as const,
      includeBids: true,
      limit: 100,
    }),
    [orgUniqueId]
  );

  // Backend queries
  const {
    data: backendOrdersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetShipperRequestsQuery(shipperRequestsArgs, {
    skip: !orgUniqueId,
  });

  const {
    data: backendBatchesData,
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useGetShipperRequestBatchesQuery(shipperBatchesArgs, {
    skip: !orgUniqueId,
  });

  const dispatch = useAppDispatch();

  // Helper to reliably extract batch UUID across backend schema variants
  const getBatchUid = React.useCallback((b: any): string => {
    return String(
      b?.shipperRequestBatchUniqueId ||
      b?.batchUniqueId ||
      b?.uniqueId ||
      b?.batch_unique_id ||
      b?.shipper_request_batch_unique_id ||
      ""
    ).trim();
  }, []);

  // Per-batch truck data: company_target rows are NOT returned by the general
  // getShipperRequest4allOrSingleUser call. We must fetch each batch's individual
  // shipper-request rows by passing shipperRequestBatchUniqueId explicitly.
  // We track a trigger counter so refetchAll() forces a fresh fetch too.
  const [batchFetchTrigger, setBatchFetchTrigger] = useState(0);
  const [companyTargetOrdersData, setCompanyTargetOrdersData] = useState<unknown>(undefined);
  const prevBatchUniqueIdsRef = useRef<string>("");

  const batchUids = useMemo(() => {
    if (targetBatchId) return [targetBatchId];
    const batches = Array.isArray(backendBatchesData?.data) ? backendBatchesData!.data : [];
    return Array.from(new Set(batches.map(getBatchUid).filter(Boolean)));
  }, [backendBatchesData?.data, targetBatchId, getBatchUid]);

  const batchUidsKey = useMemo(() => {
    return batchUids.slice().sort().join(",") + "|" + batchFetchTrigger;
  }, [batchUids, batchFetchTrigger]);

  useEffect(() => {
    if (!orgUniqueId || !batchUids.length) {
      setCompanyTargetOrdersData({ data: [] });
      return;
    }

    if (batchUidsKey === prevBatchUniqueIdsRef.current) return;
    prevBatchUniqueIdsRef.current = batchUidsKey;

    let active = true;

    Promise.all(
      batchUids.map((batchUid) =>
        dispatch(
          (api.endpoints as any).getShipperRequests.initiate(
            {
              queueOrganizationUniqueId: orgUniqueId,
              target: "all" as const,
              limit: 100,
              shipperRequestBatchUniqueId: batchUid,
            },
            { subscribe: false }
          )
        )
      )
    ).then((results) => {
      if (!active) return;
      const allRows = results.flatMap((r: any) =>
        Array.isArray(r?.data?.data) ? r.data.data : []
      );
      setCompanyTargetOrdersData({ data: allRows });
    });

    return () => {
      active = false;
    };
  }, [batchUidsKey, batchUids, orgUniqueId, dispatch]);

  // Merge individual orders (individual_target) with per-batch truck rows (company_target)
  const mergedOrdersData = useMemo(() => {
    if (companyTargetOrdersData === undefined) return backendOrdersData;
    const individual: unknown[] = Array.isArray((backendOrdersData as any)?.data)
      ? (backendOrdersData as any).data
      : [];
    const company: unknown[] = Array.isArray((companyTargetOrdersData as any)?.data)
      ? (companyTargetOrdersData as any).data
      : [];
    // Deduplicate by shipperRequestUniqueId to avoid double-counting
    const existingIds = new Set<string>(
      individual
        .map((r: any) => r?.shipperRequest?.shipperRequestUniqueId || (r as any)?.shipperRequestUniqueId)
        .filter(Boolean)
    );
    const newRows = company.filter(
      (r: any) => !existingIds.has(r?.shipperRequest?.shipperRequestUniqueId || (r as any)?.shipperRequestUniqueId)
    );
    return { ...(backendOrdersData as any) ?? {}, data: [...individual, ...newRows] };
  }, [backendOrdersData, companyTargetOrdersData]);

  const lastRefetchTimeRef = useRef(0);
  const refetchAll = React.useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchTimeRef.current < 600) return;
    lastRefetchTimeRef.current = now;
    refetchOrders();
    refetchBatches();
    setBatchFetchTrigger((t) => t + 1);
  }, [refetchOrders, refetchBatches]);

  const handleCloseCreate = React.useCallback(() => setShowCreateModal(false), []);
  const handleOrderCreated = React.useCallback(() => {
    setShowCreateModal(false);
    refetchAll();
  }, [refetchAll]);
  const handleCloseViewing = React.useCallback(() => {
    setViewingRequestsOrder(null);
    // Leave the batch drill-down: clear the ?batch= scope so the list view
    // (and its full-list query) returns to the unfiltered state.
    if (searchParams.get("batch")) {
      const next = new URLSearchParams(searchParams);
      next.delete("batch");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const handleCloseEdit = React.useCallback(() => setEditingOrder(null), []);
  const handleCloseDelete = React.useCallback(() => setDeletingOrder(null), []);

  // Local CRUD overrides
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderDisplayItem>>({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<OrderDisplayItem | null>(null);
  const [viewingRequestsOrder, setViewingRequestsOrder] = useState<OrderDisplayItem | null>(null);

  // When a single batch is selected, keep the batches list in sync: the
  // /shipperRequestBatch call still returns every batch, and the orders mapper
  // re-adds any batch it sees there that isn't already represented. Scoping it
  // client-side guarantees only the selected batch renders.
  const scopedBatchesData = useMemo(() => {
    if (!targetBatchId || !backendBatchesData) return backendBatchesData;
    const list = Array.isArray(backendBatchesData.data)
      ? backendBatchesData.data
      : [];
    const filtered = list.filter((b) => {
      const uid = getBatchUid(b);
      return uid === targetBatchId || String(b?.batchId) === targetBatchId;
    });
    return {
      ...backendBatchesData,
      data: filtered.length > 0 ? filtered : list,
    };
  }, [backendBatchesData, targetBatchId, getBatchUid]);

  // Derive orders from backend data via data mapper.
  // mergedOrdersData combines individual_target rows (from the general query)
  // with company_target per-truck rows (from per-batch queries), giving the
  // mapper accurate per-truck journeyStatusIds instead of a single batch-level one.
  const orders = useMemo<OrderDisplayItem[]>(
    () =>
      mapBackendOrdersToDisplayItems({
        ordersData: mergedOrdersData,
        batchesData: scopedBatchesData,
        deletedIds,
        editedOrders,
        activeOrg,
        targetOrgId,
        t,
      }),
    [mergedOrdersData, scopedBatchesData, deletedIds, editedOrders, activeOrg, targetOrgId, t]
  );

  // Extracted orders view pipeline (tabs, filters, sorts, pagination)
  const phoneFilter = searchParams.get("phone") || "";
  const {
    activeTab,
    setActiveTab,
    safeCurrentPage,
    setCurrentPage,
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

  // Real required-vehicle count for the bids modal. `OrderDisplayItem.totalVehicles`
  // is undefined for step-1 shipper-request rows (the mapper never sets it), so the
  // modal previously fell back to a hardcoded 3. The batch group knows the true count
  // (4 rows sharing the batch id -> group.totalVehicles), which is the backend data.
  const viewingBatchGroup = useMemo(() => {
    if (!currentViewingOrder) return undefined;
    return allBatches.find((g) =>
      g.orders.some((o) => o.id === currentViewingOrder.id)
    );
  }, [currentViewingOrder, allBatches]);

  const viewingTotalVehicles =
    viewingBatchGroup?.totalVehicles ?? currentViewingOrder?.totalVehicles;

  // Numerator: count of all trucks in this batch group that are accepted by the shipper
  // (status >= 4, heading to load, loaded, etc.). Status 3 is "Accepted by Driver", awaiting shipper acceptance.
  const viewingAcceptedVehicles = useMemo(() => {
    const isTruckShipperAccepted = (o: OrderDisplayItem) => {
      const sid = (o.journeyStatusId ?? o.journeyStatus) != null
        ? extractJourneyStatusId(o.journeyStatusId ?? o.journeyStatus)
        : undefined;
      return typeof sid === "number" && ((sid >= 4 && sid <= 9) || sid === 14);
    };

    if (!viewingBatchGroup) {
      if (!currentViewingOrder) return 0;
      return isTruckShipperAccepted(currentViewingOrder) ? 1 : 0;
    }
    const connectedCount = viewingBatchGroup.orders.filter(isTruckShipperAccepted).length;
    return Math.max(viewingBatchGroup.acceptedCount ?? 0, connectedCount);
  }, [viewingBatchGroup, currentViewingOrder]);

  // Pull driverRequests from the current viewing order or sibling orders in the batch
  const viewingDriverRequests = useMemo(() => {
    if (currentViewingOrder?.driverRequests && currentViewingOrder.driverRequests.length > 0) {
      return currentViewingOrder.driverRequests;
    }
    if (viewingBatchGroup) {
      for (const sibling of viewingBatchGroup.orders) {
        if (sibling.driverRequests && sibling.driverRequests.length > 0) {
          return sibling.driverRequests;
        }
      }
    }
    return currentViewingOrder?.driverRequests || [];
  }, [currentViewingOrder, viewingBatchGroup]);

  // Enrich order with batch-level totals when viewing a group batch
  const effectiveViewingOrder = useMemo(() => {
    if (!currentViewingOrder) return null;
    if (currentViewingOrder.type === "Group" && viewingBatchGroup) {
      return {
        ...currentViewingOrder,
        batchTotalCost: currentViewingOrder.batchTotalCost ?? viewingBatchGroup.totalCost,
        batchTotalQuintal: currentViewingOrder.batchTotalQuintal ?? viewingBatchGroup.totalQuintal,
        totalVehicles: viewingTotalVehicles ?? currentViewingOrder.totalVehicles,
      };
    }
    return currentViewingOrder;
  }, [currentViewingOrder, viewingBatchGroup, viewingTotalVehicles]);

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
                className={`orders-live-badge ${live ? "orders-live-badge--connected" : "orders-live-badge--syncing"}`}
                title={
                  live
                    ? t("orders.socketLiveTooltip", "Real-time WebSocket connected")
                    : t("orders.socketSyncingTooltip", "Syncing live updates (auto-refreshing)")
                }
              >
                <span className={`orders-live-dot ${live ? "" : "orders-live-dot--syncing"}`} />
                {live ? t("orders.liveBadge", "Live") : t("orders.syncingBadge", "Syncing")}
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

        {/* ── Orders Cards List (Card Design from mockup) ── */}
        <OrdersCardsList
          batchGroups={currentBatches}
          orders={paginatedOrders}
          activeTab={activeTab}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={(order) => {
            setViewingRequestsOrder(order);
            // Scope the page to the order's batch so OrdersPage switches to the
            // batch-scoped API (shipperRequestBatchUniqueId) instead of pulling
            // every request in the org.
            const uid =
              order.batchUniqueId ||
              (order as any).shipperRequestBatchUniqueId ||
              (order as any).batchUniqueId;
            if (uid) {
              const next = new URLSearchParams(searchParams);
              next.set("orgId", targetOrgId || orgUniqueId);
              next.set("batch", uid);
              setSearchParams(next, { replace: true });
            }
          }}
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
          currentViewingOrder={effectiveViewingOrder}
          driverRequests={viewingDriverRequests}
          activeOrg={activeOrg}
          onCloseViewing={handleCloseViewing}
          onRefresh={refetchAll}
          viewingTotalVehicles={viewingTotalVehicles}
          viewingAcceptedVehicles={viewingAcceptedVehicles}
          showCreateModal={showCreateModal}
          onCloseCreate={handleCloseCreate}
          onOrderCreated={handleOrderCreated}
          editingOrder={editingOrder}
          onCloseEdit={handleCloseEdit}
          onSaveEdit={handleSaveEdit}
          deletingOrder={deletingOrder}
          onCloseDelete={handleCloseDelete}
          onConfirmDelete={confirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}

export default OrdersPage;
