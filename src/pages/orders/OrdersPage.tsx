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
import {
  normalizeOrgList,
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "../../utils/formatters";
import { OrdersTable } from "../../components/orders/OrdersTable";
import { OrdersMobileCards } from "../../components/orders/OrdersMobileCards";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersEditModal } from "../../components/orders/OrdersEditModal";
import { OrdersDeleteModal } from "../../components/orders/OrdersDeleteModal";
import { DriverBidsModal } from "../../components/orders/DriverBidsModal";
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
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "", target: "all", limit: 100 },
    {
      skip: !activeOrg?.queueOrganizationUniqueId,
      pollingInterval: 8000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

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

  // Derive orders from backend data
  const orders = useMemo<OrderDisplayItem[]>(() => {
    const rawList = backendOrdersData?.data as unknown as ShipperRequestPayloadItem[] | undefined;
    let baseList: OrderDisplayItem[] = [];

    if (Array.isArray(rawList)) {
      baseList = rawList.map((item, idx) => {
        const rawReq = (item.shipperRequest && typeof item.shipperRequest === "object" ? item.shipperRequest : null) as any;
        const req = rawReq || (item as any) || {};

        const resolvedShipperRequestUniqueId =
          req.shipperRequestUniqueId ||
          (item as any).shipperRequestUniqueId ||
          (req as any).shipper_request_unique_id ||
          (item as any).shipper_request_unique_id ||
          (req as any).uniqueId ||
          (item as any).uniqueId ||
          `real-${idx}`;

        const resolvedShipperRequestId =
          req.shipperRequestId ??
          (item as any).shipperRequestId ??
          (req as any).shipper_request_id ??
          (item as any).shipper_request_id ??
          null;

        const resolvedBatchId =
          req.batchId ??
          (item as any).batchId ??
          (req as any).batch_id ??
          (item as any).batch_id ??
          (req as any).shipperRequestBatchId ??
          (item as any).shipperRequestBatchId ??
          null;

        const resolvedVehicleTypeUniqueId =
          req.vehicleTypeUniqueId ||
          (item as any).vehicleTypeUniqueId ||
          (req as any).vehicle_type_unique_id ||
          (item as any).vehicle_type_unique_id ||
          undefined;

        const resolvedQueueOrgId =
          req.queueOrganizationUniqueId ||
          (item as any).queueOrganizationUniqueId ||
          (req as any).queue_organization_unique_id ||
          (item as any).queue_organization_unique_id ||
          activeOrg?.queueOrganizationUniqueId ||
          targetOrgId ||
          "";

        const rawCost =
          extractOfferCost(req, item) ??
          req.shippingCost ??
          (item as any).shippingCost ??
          req.cost ??
          (item as any).cost ??
          25000;
        const costNum = Number(String(rawCost).replace(/[^0-9.]/g, "")) || 25000;

        const rawQuintal =
          req.shippableItemQtyInQuintal ??
          (item as any).shippableItemQtyInQuintal ??
          req.quintal ??
          (item as any).quintal ??
          5;
        const quintalNum = Number(String(rawQuintal).replace(/[^0-9.]/g, "")) || 5;

        const rawMode = req.requestMode || (item as any).requestMode || "";
        const mode =
          String(rawMode).toLowerCase().includes("group") ||
          String(rawMode).toLowerCase().includes("company")
            ? "Group"
            : "Individual";

        const hasReqId =
          resolvedShipperRequestId != null &&
          String(resolvedShipperRequestId).trim() !== "" &&
          !isNaN(Number(resolvedShipperRequestId));

        const hasBatchId =
          resolvedBatchId != null &&
          String(resolvedBatchId).trim() !== "" &&
          !isNaN(Number(resolvedBatchId));

        let displayId = "";
        if (hasReqId && hasBatchId) {
          displayId = `#${resolvedShipperRequestId}/${resolvedBatchId}`;
        } else if (hasReqId) {
          displayId = `#${resolvedShipperRequestId}`;
        } else if (hasBatchId) {
          displayId = `#${resolvedBatchId}`;
        } else {
          displayId = `#${idx + 1}`;
        }

        const fullId = displayId;
        const requestIdDisplay = hasReqId ? String(resolvedShipperRequestId) : String(idx + 1);
        const batchIdDisplay = hasBatchId ? String(resolvedBatchId) : null;
        const fullRequestId = String(resolvedShipperRequestId ?? (idx + 1));
        const fullBatchId = hasBatchId ? String(resolvedBatchId) : null;

        const isComplete = Boolean(
          req.isCompleted ||
          (item as any).isCompleted ||
          req.journeyStatusId === 9 ||
          req.journeyStatusId === 6 ||
          (item as any).journeyStatusId === 9 ||
          (item as any).journeyStatusId === 6 ||
          String(req.status || (item as any).status || "").toLowerCase() === "completed" ||
          String(req.status || (item as any).status || "").toLowerCase() === "delivered" ||
          String(req.requestStatus || (item as any).requestStatus || "").toLowerCase() === "completed"
        );

        const rawDecisions: any[] =
          (Array.isArray((item as any).decisions) ? (item as any).decisions : []) ||
          (Array.isArray((req as any).decisions) ? (req as any).decisions : []) ||
          [];

        const rawDriverRequests =
          (Array.isArray(item.driverRequests) && item.driverRequests.length > 0
            ? item.driverRequests
            : null) ||
          (Array.isArray((req as any).driverRequests) &&
          (req as any).driverRequests.length > 0
            ? (req as any).driverRequests
            : null) ||
          rawDecisions ||
          [];

        const isBiddingApproved = Boolean(
          req.isBiddingApproved ||
          (req as any).is_bidding_approved ||
          (req as any).biddingApproved ||
          (item as any).isBiddingApproved ||
          (item as any).is_bidding_approved ||
          (item as any).biddingApproved
        );

        const originLat =
          req.originLatitude ??
          (item as any).originLatitude ??
          (activeOrg?.latitude != null ? activeOrg.latitude : null);
        const originLng =
          req.originLongitude ??
          (item as any).originLongitude ??
          (activeOrg?.longitude != null ? activeOrg.longitude : null);

        const driverRequests = rawDriverRequests.map((d: any) => {
          const dLat = d.latitude ?? d.driverLatitude ?? d.currentLatitude ?? d.lat ?? null;
          const dLng = d.longitude ?? d.driverLongitude ?? d.currentLongitude ?? d.lng ?? null;
          const resolvedLoc =
            d.currentPlace ??
            d.location ??
            d.locationName ??
            d.currentLocation ??
            d.city ??
            d.terminalName ??
            (dLat && dLng ? lookupLocationFromCoordinates(dLat, dLng) : null);
          const dist = calculateDistanceKm(originLat, originLng, dLat, dLng);

          const driverCost = extractOfferCost(d, item);

          const matchingDecision =
            rawDecisions.find(
              (dec: any) =>
                (dec.driverRequestId != null && dec.driverRequestId === d.driverRequestId) ||
                (dec.driverRequestUniqueId && dec.driverRequestUniqueId === d.driverRequestUniqueId) ||
                (dec.driverUserUniqueId && dec.driverUserUniqueId === d.userUniqueId)
            ) || (rawDecisions.length === 1 ? rawDecisions[0] : null);

          const resolvedJourneyDecisionUniqueId =
            d.journeyDecisionUniqueId ||
            matchingDecision?.journeyDecisionUniqueId ||
            null;

          return {
            ...d,
            driverRequestId: d.driverRequestId,
            driverRequestUniqueId: d.driverRequestUniqueId || d.bidUniqueId || d.userUniqueId,
            userUniqueId: d.userUniqueId || d.driverUserUniqueId,
            journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
            fullName: d.fullName ?? d.driverName ?? d.name ?? null,
            phoneNumber: d.phoneNumber ?? d.driverPhoneNumber ?? null,
            journeyStatusId: d.journeyStatusId ?? d.statusId ?? null,
            journeyStatus: d.journeyStatus ?? null,
            shipperRequestUniqueId:
              d.shipperRequestUniqueId ||
              d.shipper_request_unique_id ||
              resolvedShipperRequestUniqueId,
            offerCost:
              driverCost ??
              d.offerCost ??
              d.proposedCost ??
              d.bidAmount ??
              d.proposedCostPerVehicle ??
              d.bidCost ??
              d.biddingCost ??
              d.cost ??
              d.price ??
              null,
            proposedCost:
              driverCost ??
              d.proposedCost ??
              d.proposedCostPerVehicle ??
              d.offerCost ??
              d.bidAmount ??
              null,
            bidAmount:
              driverCost ??
              d.bidAmount ??
              d.proposedCost ??
              d.proposedCostPerVehicle ??
              d.offerCost ??
              null,
            vehicleTypeName: d.vehicleTypeName ?? d.vehicleType ?? null,
            plateNumber: d.plateNumber ?? d.vehiclePlateNumber ?? null,
            latitude: dLat,
            longitude: dLng,
            currentPlace: resolvedLoc,
            distanceKm: dist,
            rawDriver: d,
            rawItem: item,
          };
        });

        const shipperName =
          req.fullName ||
          (item as any).fullName ||
          (req as any).shipperUser?.fullName ||
          (item as any).shipperUser?.fullName ||
          t("orders.defaultValuedShipper");

        const vehicleTypeName =
          req.vehicleTypeName ||
          (item as any).vehicleTypeName ||
          req.vehicleTypeOption ||
          (item as any).vehicleTypeOption ||
          t("orders.defaultHeavyTruck");

        const itemName =
          req.shippableItemName ||
          (item as any).shippableItemName ||
          req.item ||
          (item as any).item ||
          t("orders.defaultGeneralCargo");

        const originPlace =
          req.originPlace ||
          (item as any).originPlace ||
          req.pickupLocationName ||
          (item as any).pickupLocationName ||
          t("orders.defaultTerminal");

        const destPlace =
          req.destinationPlace ||
          (item as any).destinationPlace ||
          req.dropoffLocationName ||
          (item as any).dropoffLocationName ||
          t("orders.defaultDestination");

        return {
          id: resolvedShipperRequestUniqueId,
          shipperRequestId: resolvedShipperRequestId,
          batchId: resolvedBatchId,
          requestIdDisplay,
          batchIdDisplay,
          fullRequestId,
          fullBatchId,
          displayId,
          fullId,
          shipper: shipperName,
          type: mode,
          vehicleType: vehicleTypeName,
          vehicleTypeUniqueId: resolvedVehicleTypeUniqueId,
          item: itemName,
          origin: originPlace,
          destination: destPlace,
          originLatitude: originLat,
          originLongitude: originLng,
          destinationLatitude: req.destinationLatitude ?? (item as any).destinationLatitude ?? null,
          destinationLongitude: req.destinationLongitude ?? (item as any).destinationLongitude ?? null,
          quintal: quintalNum,
          cost: costNum,
          status: isComplete ? "complete" : "ongoing",
          phone: req.phoneNumber || (item as any).phoneNumber || (req as any).shipperUser?.phoneNumber || "",
          createdAt: req.shipperRequestCreatedAt || (item as any).shipperRequestCreatedAt || "",
          isBiddingApproved,
          driverRequests,
          decisions: rawDecisions,
          queueOrganizationUniqueId: resolvedQueueOrgId,
          rawItem: item,
        };
      });
    }

    return baseList
      .filter((o) => !deletedIds.has(o.id))
      .map((o) => editedOrders[o.id] || o);
  }, [backendOrdersData, deletedIds, editedOrders, t]);

  // Sort & filter
  const processedOrders = useMemo(() => {
    const phoneFilter = searchParams.get("phone") || "";
    const filtered = orders
      .filter((o) => o.status === activeTab)
      .filter((o) => !phoneFilter || o.phone === phoneFilter);
    return [...filtered].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortCol) {
        case "id": valA = (a.displayId || a.id).toLowerCase(); valB = (b.displayId || b.id).toLowerCase(); break;
        case "shipper": valA = a.shipper.toLowerCase(); valB = b.shipper.toLowerCase(); break;
        case "type": valA = a.type; valB = b.type; break;
        case "vehicleType": valA = a.vehicleType.toLowerCase(); valB = b.vehicleType.toLowerCase(); break;
        case "item": valA = a.item.toLowerCase(); valB = b.item.toLowerCase(); break;
        case "location": valA = `${a.origin} ${a.destination}`.toLowerCase(); valB = `${b.origin} ${b.destination}`.toLowerCase(); break;
        case "quintal": valA = a.quintal; valB = b.quintal; break;
        case "cost": valA = a.cost; valB = b.cost; break;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [orders, activeTab, sortCol, sortAsc, searchParams]);

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
          onViewRequests={setViewingRequestsOrder}
        />

        {/* ── Mobile Cards ── */}
        <OrdersMobileCards
          orders={paginatedOrders}
          activeTab={activeTab}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={setViewingRequestsOrder}
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
            }}
            onOrderUpdated={() => {
              refetchOrders();
            }}
            onRefresh={() => {
              refetchOrders();
            }}
            isRefreshing={isFetchingOrders}
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
