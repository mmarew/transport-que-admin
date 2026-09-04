import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { CreateOrderModal } from "../../components/queue/CreateOrderModal";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
} from "../../lib/redux/api";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { normalizeOrgList } from "../../utils/formatters";
import { OrdersTable } from "../../components/orders/OrdersTable";
import { OrdersMobileCards } from "../../components/orders/OrdersMobileCards";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersEditModal } from "../../components/orders/OrdersEditModal";
import { OrdersDeleteModal } from "../../components/orders/OrdersDeleteModal";
import type {
  OrderDisplayItem,
  ShipperRequestPayloadItem,
  SortColumn,
} from "../../components/orders/OrdersTypes";
import { PAGE_SIZE } from "../../components/orders/OrdersTypes";
import { extractCity } from "../../utils/formatters";
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
    { skip: !activeOrg?.queueOrganizationUniqueId }
  );

  // State
  const [activeTab, setActiveTab] = useState<"ongoing" | "complete">("ongoing");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<SortColumn>("shipper");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderDisplayItem>>({});

  // Derive orders from backend data
  const orders = useMemo<OrderDisplayItem[]>(() => {
    const rawList = backendOrdersData?.data as unknown as ShipperRequestPayloadItem[] | undefined;
    let baseList: OrderDisplayItem[] = [];

    if (Array.isArray(rawList)) {
      baseList = rawList.map((item, idx) => {
        const req = item.shipperRequest || {};
        const costNum = Number(String(req.shippingCost || "").replace(/[^0-9.]/g, "")) || 25000;
        const quintalNum = Number(String(req.shippableItemQtyInQuintal || "").replace(/[^0-9.]/g, "")) || 5;
        const mode = (req.requestMode || "").toLowerCase().includes("group") ? "Group" : "Individual";
        const isComplete = Boolean(
          req.isCompleted ||
          req.journeyStatusId === 9 ||
          req.journeyStatusId === 6 ||
          String(req.status || "").toLowerCase() === "completed" ||
          String(req.status || "").toLowerCase() === "delivered" ||
          String(req.requestStatus || "").toLowerCase() === "completed"
        );

        return {
          id: req.shipperRequestUniqueId || `real-${idx}`,
          shipper: req.fullName || "Valued Shipper",
          type: mode,
          vehicleType: req.vehicleTypeName || "Heavy Truck",
          item: req.shippableItemName || "General Cargo",
          origin: req.originPlace || "Terminal",
          destination: req.destinationPlace || "Destination",
          quintal: quintalNum,
          cost: costNum,
          status: isComplete ? "complete" : "ongoing",
          phone: req.phoneNumber || "",
          createdAt: req.shipperRequestCreatedAt || "",
        };
      });
    }

    return baseList
      .filter((o) => !deletedIds.has(o.id))
      .map((o) => editedOrders[o.id] || o);
  }, [backendOrdersData, deletedIds, editedOrders]);

  // Sort & filter
  const processedOrders = useMemo(() => {
    const filtered = orders.filter((o) => o.status === activeTab);
    return [...filtered].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortCol) {
        case "shipper":   valA = a.shipper.toLowerCase();                         valB = b.shipper.toLowerCase();                         break;
        case "type":      valA = a.type;                                           valB = b.type;                                           break;
        case "vehicleType": valA = a.vehicleType.toLowerCase();                   valB = b.vehicleType.toLowerCase();                     break;
        case "item":      valA = a.item.toLowerCase();                            valB = b.item.toLowerCase();                            break;
        case "location":  valA = `${a.origin} ${a.destination}`.toLowerCase();    valB = `${b.origin} ${b.destination}`.toLowerCase();    break;
        case "quintal":   valA = a.quintal;                                        valB = b.quintal;                                        break;
        case "cost":      valA = a.cost;                                           valB = b.cost;                                           break;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [orders, activeTab, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(processedOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return processedOrders.slice(start, start + PAGE_SIZE);
  }, [processedOrders, safeCurrentPage]);

  // Handlers
  const handleSort = (col: SortColumn) => {
    setCurrentPage(1);
    if (sortCol === col) setSortAsc((prev) => !prev);
    else { setSortCol(col); setSortAsc(true); }
  };

  const confirmDelete = () => {
    if (!deletingOrder) return;
    setDeletedIds((prev) => new Set([...prev, deletingOrder.id]));
    toast.success(t("orders.orderDeletedSuccess", "Order deleted successfully"));
    setDeletingOrder(null);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const formData = new FormData(e.currentTarget);
    const updatedOrder: OrderDisplayItem = {
      ...editingOrder,
      shipper:     String(formData.get("shipper")     || editingOrder.shipper),
      type:        (formData.get("type") as "Individual" | "Group") || editingOrder.type,
      vehicleType: String(formData.get("vehicleType") || editingOrder.vehicleType),
      item:        String(formData.get("item")        || editingOrder.item),
      origin:      String(formData.get("origin")      || editingOrder.origin),
      destination: String(formData.get("destination") || editingOrder.destination),
      quintal:     Number(formData.get("quintal"))    || editingOrder.quintal,
      cost:        Number(formData.get("cost"))       || editingOrder.cost,
      status:      (formData.get("status") as "ongoing" | "complete") || editingOrder.status,
    };
    setEditedOrders((prev) => ({ ...prev, [editingOrder.id]: updatedOrder }));
    toast.success(t("orders.orderUpdatedSuccess", "Order updated successfully"));
    setEditingOrder(null);
  };

  const handleBackToOrganizations = () => {
    setSelectedOrgId("");
    navigate("/dashboard");
  };

  const orgName = activeOrg?.queueOrganizationName || "Cement Factory";
  const orgCity = extractCity(activeOrg?.queueOrganizationAddress) || "Addis Ababa";

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
              <span className="orders-live-badge">
                <span className="orders-live-dot" />
                {t("orders.liveBadge", "Live")}
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
          orders={paginatedOrders}
          sortCol={sortCol}
          activeTab={activeTab}
          currentPage={safeCurrentPage}
          onSort={handleSort}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
        />

        {/* ── Mobile Cards ── */}
        <OrdersMobileCards
          orders={paginatedOrders}
          activeTab={activeTab}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
        />

        {/* ── Pagination ── */}
        <OrdersPagination
          isLoading={isLoadingOrders}
          totalFiltered={processedOrders.length}
          totalShown={paginatedOrders.length}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

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
            onCreated={() => { setShowCreateModal(false); refetchOrders(); }}
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
