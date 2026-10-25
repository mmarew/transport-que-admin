import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
  useGetBidsForOrderQuery,
  useGetQueueStatusQuery,
  useListVehicleDriversQuery,
  useGetDriverAccountStatusQuery,
} from "../../../lib/redux/api";
import { useQueueSocket } from "../../../hooks/useQueueSocket";
import { useQueueAdminStore } from "../../../store/queueAdminStore";
import { normalizeOrgList, extractCity } from "../../../utils/formatters";
import { isUUID, extractUUID } from "../../../components/orders/bids/orderIdLookup";
import type { OrderDisplayItem } from "../../../components/orders/OrdersTypes";
import { getConnectedJourneyStatus } from "../../../components/orders/OrdersTypes";
import { mapBackendOrdersToDisplayItems } from "../ordersDataMapper";
import { buildDriverDetailsModel } from "./driverDetailsMapper";
import { DriverHeaderAndStats } from "./components/DriverHeaderAndStats";
import { DriverLocationMap } from "./components/DriverLocationMap";
import { DriverCurrentOrderCard } from "./components/DriverCurrentOrderCard";
import { DriverVehicleLicenceCards } from "./components/DriverVehicleLicenceCards";
import { DriverActivityAndCostCards } from "./components/DriverActivityAndCostCards";
import { DriverPhonePopover } from "./components/DriverPhonePopover";
import MobileHeader from "../../../components/common/MobileHeader";
import "./DriverDetailsPage.css";

export function DriverDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobilePhonePopoverOpen, setIsMobilePhonePopoverOpen] = useState(false);
  const mobilePhoneBtnRef = useRef<HTMLButtonElement>(null);
  const {
    orderId: paramOrderId,
    queueOrganizationUniqueId: paramOrgId,
    batchId: paramBatchId,
    shipperRequestId: paramReqId,
  } = useParams<{
    orderId?: string;
    queueOrganizationUniqueId?: string;
    batchId?: string;
    shipperRequestId?: string;
  }>();

  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const targetOrgId = paramOrgId || selectedOrgId || "";

  // 1. Fetch organization details
  const { data: orgListData } = useListQueueOrganizationsQuery();
  const orgList = useMemo(() => normalizeOrgList(orgListData), [orgListData]);

  const activeOrg = useMemo(() => {
    if (location.state?.activeOrg) return location.state.activeOrg;
    if (!targetOrgId) return orgList[0]?.organization || null;
    return (
      orgList.find(
        (item) => item.organization?.queueOrganizationUniqueId === targetOrgId
      )?.organization ||
      orgList[0]?.organization ||
      null
    );
  }, [location.state?.activeOrg, orgList, targetOrgId]);

  const orgUniqueId = targetOrgId || activeOrg?.queueOrganizationUniqueId || "";

  const stateOrder = location.state?.order as OrderDisplayItem | undefined;
  const candidateBatchKey = location.state?.batchKey
    ? String(location.state.batchKey).replace(/^batch-/, "")
    : "";

  // 2. Fetch batches to support batch UUID lookup & direct URL refresh
  const { data: backendBatchesData, refetch: refetchBatches } = useGetShipperRequestBatchesQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      requestMode: "company_target",
      includeBids: true,
      limit: 100,
    },
    { skip: !orgUniqueId }
  );

  // Safely resolve the 36-character batch UUID (never numeric "1")
  const resolvedBatchUid = useMemo(() => {
    const directCandidates = [
      stateOrder?.batchUniqueId,
      (stateOrder as any)?.shipperRequestBatchUniqueId,
      (stateOrder as any)?.rawItem?.shipperRequestBatchUniqueId,
      (stateOrder as any)?.rawItem?.shipperRequest?.shipperRequestBatchUniqueId,
      (stateOrder as any)?.rawItem?.uniqueId,
      candidateBatchKey,
    ];
    for (const c of directCandidates) {
      const u = extractUUID(c);
      if (u) return u;
    }

    const batches = Array.isArray((backendBatchesData as any)?.data)
      ? (backendBatchesData as any).data
      : [];
    const targetNumeric = String(stateOrder?.batchId || candidateBatchKey || "").trim();
    if (targetNumeric) {
      const match = batches.find((b: any) => {
        return (
          String(b?.batchId) === targetNumeric ||
          b?.shipperRequestBatchUniqueId === targetNumeric ||
          b?.batchUniqueId === targetNumeric
        );
      });
      if (match) {
        const u = extractUUID(
          match.shipperRequestBatchUniqueId ||
          match.batchUniqueId ||
          match.uniqueId ||
          match.batch_unique_id
        );
        if (u) return u;
      }
    }
    return undefined;
  }, [stateOrder, candidateBatchKey, backendBatchesData]);

  const isBatchUidValid = Boolean(resolvedBatchUid && isUUID(resolvedBatchUid));

  // 3. Fetch orders (general and per-batch if valid UUID)
  const { data: backendOrdersData, refetch: refetchOrders } = useGetShipperRequestsQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      target: "all",
      limit: 100,
    },
    { skip: !orgUniqueId }
  );

  const { data: backendBatchOrdersData, refetch: refetchBatchOrders } = useGetShipperRequestsQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      target: "all",
      shipperRequestBatchUniqueId: resolvedBatchUid,
      limit: 100,
    },
    { skip: !orgUniqueId || !isBatchUidValid }
  );

  // Combine general orders with per-batch truck records
  const mergedOrdersData = useMemo(() => {
    const list1 = Array.isArray((backendOrdersData as any)?.data)
      ? (backendOrdersData as any).data
      : Array.isArray(backendOrdersData)
        ? backendOrdersData
        : [];
    const list2 = Array.isArray((backendBatchOrdersData as any)?.data)
      ? (backendBatchOrdersData as any).data
      : Array.isArray(backendBatchOrdersData)
        ? backendBatchOrdersData
        : [];
    if (!list2.length) return backendOrdersData;
    const existing = new Set(
      list1.map((r: any) => r?.shipperRequest?.shipperRequestUniqueId || r?.shipperRequestUniqueId || r?.uniqueId)
    );
    const newRows = list2.filter(
      (r: any) => !existing.has(r?.shipperRequest?.shipperRequestUniqueId || r?.shipperRequestUniqueId || r?.uniqueId)
    );
    return {
      ...(backendOrdersData as any || {}),
      data: [...list1, ...newRows],
    };
  }, [backendOrdersData, backendBatchOrdersData]);

  // Derive mapped orders list
  const mappedOrders = useMemo<OrderDisplayItem[]>(() => {
    return mapBackendOrdersToDisplayItems({
      ordersData: mergedOrdersData,
      batchesData: backendBatchesData,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg,
      targetOrgId,
      t,
    });
  }, [mergedOrdersData, backendBatchesData, activeOrg, targetOrgId, t]);

  // Find the target order (prioritizes fresh liveMatch from mappedOrders over frozen stateOrder)
  const resolvedOrder = useMemo<OrderDisplayItem | null>(() => {
    const targetId = (paramOrderId || paramBatchId || paramReqId || stateOrder?.id || stateOrder?.shipperRequestUniqueId || "").trim();
    const cleanSearch = targetId.replace(/^#/, "");

    // 1. Look for live updated order in mappedOrders FIRST
    let liveMatch: OrderDisplayItem | undefined = undefined;

    if (targetId) {
      liveMatch = mappedOrders.find(
        (o) =>
          o.id === targetId ||
          o.id === cleanSearch ||
          o.shipperRequestUniqueId === targetId ||
          (cleanSearch && o.displayId?.replace(/^#/, "") === cleanSearch) ||
          (cleanSearch && o.id?.replace(/^#/, "") === cleanSearch)
      );
    }

    if (!liveMatch && stateOrder) {
      liveMatch = mappedOrders.find(
        (o) =>
          (stateOrder.shipperRequestUniqueId && o.shipperRequestUniqueId === stateOrder.shipperRequestUniqueId) ||
          (stateOrder.id && o.id === stateOrder.id) ||
          (stateOrder.displayId && o.displayId === stateOrder.displayId) ||
          (stateOrder.batchId && stateOrder.shipperRequestId &&
            String(o.batchId) === String(stateOrder.batchId) &&
            String(o.shipperRequestId) === String(stateOrder.shipperRequestId))
      );
    }

    if (liveMatch) {
      return {
        ...(stateOrder || {}),
        ...liveMatch,
        journeyStatusId: liveMatch.journeyStatusId ?? stateOrder?.journeyStatusId,
        journeyStatus: liveMatch.journeyStatus ?? stateOrder?.journeyStatus,
        status: liveMatch.status ?? stateOrder?.status,
        rawItem: liveMatch.rawItem ?? stateOrder?.rawItem,
      };
    }

    // 2. Fallback to stateOrder if backend has not finished loading
    if (stateOrder) {
      return stateOrder;
    }

    // 3. Fallback to first mapped order
    return mappedOrders[0] || null;
  }, [mappedOrders, stateOrder, paramOrderId, paramBatchId, paramReqId]);

  // Target shipper request UUID for live bidding query
  const rawTargetReqUid =
    resolvedOrder?.shipperRequestUniqueId ||
    (resolvedOrder as any)?.rawItem?.shipperRequest?.shipperRequestUniqueId ||
    (resolvedOrder as any)?.rawItem?.uniqueId ||
    "";
  const targetReqUid = extractUUID(rawTargetReqUid) || "";
  const isReqUidValid = Boolean(targetReqUid && isUUID(targetReqUid));

  const { data: bidsData, refetch: refetchBids } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: targetReqUid },
    { skip: !isReqUidValid }
  );

  // Live queue status to access current queue vehicle assignments
  const {
    data: queueStatusData,
    error: queueStatusError,
    refetch: refetchQueueStatus,
  } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: orgUniqueId },
    { skip: !orgUniqueId }
  );

  const isQueueStatusForbidden = Boolean(
    queueStatusError &&
    typeof queueStatusError === "object" &&
    "status" in queueStatusError &&
    (queueStatusError.status === 403 || queueStatusError.status === 401)
  );

  // 3. Live WebSocket subscription and refetch callback
  const refetchAll = useCallback(() => {
    refetchOrders();
    refetchBatches();
    if (isBatchUidValid) {
      refetchBatchOrders();
    }
    if (isReqUidValid) {
      refetchBids();
    }
    if (!isQueueStatusForbidden) {
      refetchQueueStatus();
    }
  }, [
    refetchOrders,
    refetchBatches,
    refetchBatchOrders,
    refetchBids,
    refetchQueueStatus,
    isQueueStatusForbidden,
    isBatchUidValid,
    isReqUidValid,
  ]);

  useQueueSocket(orgUniqueId, refetchAll);

  // Poll while order is not completed to guarantee real-time updates even if WS is dropped
  useEffect(() => {
    const isCompleted =
      resolvedOrder?.status === "complete" ||
      (resolvedOrder?.journeyStatusId != null &&
        (resolvedOrder.journeyStatusId === 9 || resolvedOrder.journeyStatusId === 14));

    if (isCompleted) return;

    const interval = setInterval(() => {
      refetchAll();
    }, 8000);

    return () => clearInterval(interval);
  }, [refetchAll, resolvedOrder?.status, resolvedOrder?.journeyStatusId]);

  // Live vehicle directory to access vehicle plates and colors
  const candidatePhone =
    resolvedOrder?.driverRequests?.[0]?.phoneNumber ||
    (resolvedOrder as any)?.rawItem?.driverPhoneNumber ||
    (resolvedOrder as any)?.rawItem?.shipperRequest?.driverPhoneNumber;

  const candidateName =
    resolvedOrder?.driverRequests?.[0]?.fullName ||
    (resolvedOrder as any)?.rawItem?.driverName ||
    (resolvedOrder as any)?.rawItem?.shipperRequest?.driverName;

  const { data: directoryData } = useListVehicleDriversQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      phone: candidatePhone ? String(candidatePhone).replace(/[^0-9]/g, "").slice(-9) : undefined,
      name: !candidatePhone && candidateName ? String(candidateName) : undefined,
      vehicleTypeUniqueId: resolvedOrder?.vehicleTypeUniqueId || undefined,
      limit: 50,
    },
    {
      skip: !orgUniqueId || (!candidatePhone && !candidateName && !resolvedOrder?.vehicleTypeUniqueId),
    }
  );

  // Driver account status & verified documents (vehicle plate, insurance, driver's license)
  const candidateDriverUserUid =
    resolvedOrder?.driverRequests?.[0]?.userUniqueId ||
    (resolvedOrder?.driverRequests?.[0] as any)?.driverUserUniqueId ||
    (resolvedOrder as any)?.rawItem?.driverUserUniqueId ||
    (resolvedOrder as any)?.rawItem?.userUniqueId;

  const { data: accountStatusData } = useGetDriverAccountStatusQuery(
    {
      ownerUserUniqueId: candidateDriverUserUid || undefined,
      phoneNumber: !candidateDriverUserUid && candidatePhone ? String(candidatePhone) : undefined,
      roleId: 2,
    },
    {
      skip: !candidateDriverUserUid && !candidatePhone,
    }
  );

  // Driver details model from mapped order, real bids, queue status, directory, and driver account status
  const activeModel = useMemo(() => {
    return buildDriverDetailsModel(resolvedOrder, activeOrg, bidsData, {
      queueStatusData,
      directoryData,
      accountStatusData,
    });
  }, [resolvedOrder, activeOrg, bidsData, queueStatusData, directoryData, accountStatusData]);

  const isCompletedOrder =
    resolvedOrder && getConnectedJourneyStatus(resolvedOrder).type === "completed";
  const returnTab =
    location.state?.fromTab || (isCompletedOrder ? "complete" : undefined);
  const backToOrdersUrl =
    location.state?.returnUrl ||
    (targetOrgId
      ? `/orgs/${targetOrgId}/orders${returnTab === "complete" ? "?tab=complete" : ""}`
      : `/orders${returnTab === "complete" ? "?tab=complete" : ""}`);

  const handleBackToOrders = () => {
    navigate(backToOrdersUrl, { state: location.state });
  };

  const orgName = activeOrg?.queueOrganizationName || "Cement Factory";
  const orgCity = extractCity(activeOrg?.queueOrganizationAddress) || "Addis Ababa";

  return (
    <DashboardLayout activeTab="orders">
      <div className="driver-details-page-container">
        {/* ── App Common Mobile Header (Back to Orders navigation) ── */}
        <div
          className="driver-mobile-nav-header"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(".mobile-sub-header__title")) {
              handleBackToOrders();
            }
          }}
        >
          <MobileHeader
            title={t("orders.backToOrders", "Back to Orders")}
            onBack={handleBackToOrders}
          />
        </div>

        {/* ── Dedicated Mobile Top Header (Matches Mobile Design Mockup) ── */}
        <div className="driver-mobile-header">
          <h1 className="driver-mobile-title">{activeModel.driverName}</h1>
          {activeModel.companyName ? (
            <div className="driver-mobile-company-tag" style={{ fontSize: "0.8rem", color: "var(--color-primary, #0B4D6D)", fontWeight: 600, marginTop: "2px" }}>
              Company · {activeModel.companyName}
            </div>
          ) : null}
          <div className="driver-mobile-route">
            <span>{activeModel.route.origin}</span>
            <span className="driver-mobile-route-arrow">→</span>
            <span>{activeModel.route.destination}</span>
          </div>
          <div className="driver-mobile-meta-row">
            <Link
              to={backToOrdersUrl}
              state={location.state}
              className="driver-mobile-order-link"
            >
              Order #{activeModel.orderNumber}
            </Link>
            <ChevronRight size={13} className="driver-mobile-meta-separator" />
            {activeModel.driverPhone && activeModel.driverPhone !== "—" ? (
              <button
                ref={mobilePhoneBtnRef}
                type="button"
                onClick={() => setIsMobilePhonePopoverOpen((prev) => !prev)}
                className={`driver-mobile-phone-link driver-mobile-phone-btn ${isMobilePhonePopoverOpen ? "active" : ""}`}
                title="View driver phone contact"
                aria-expanded={isMobilePhonePopoverOpen}
                aria-haspopup="dialog"
              >
                {activeModel.driverPhone}
              </button>
            ) : (
              <span className="driver-mobile-phone-link">
                {activeModel.driverPhone}
              </span>
            )}
          </div>

          <DriverPhonePopover
            isOpen={isMobilePhonePopoverOpen}
            onClose={() => setIsMobilePhonePopoverOpen(false)}
            triggerRef={mobilePhoneBtnRef}
            phone={activeModel.driverPhone}
            driverName={activeModel.driverName}
            companyName={activeModel.companyName}
            driverId={activeModel.driverId}
            plateNumber={activeModel.vehicle?.plateNumber}
          />
        </div>

        {/* ── Top Navigation & Breadcrumbs (Desktop) ── */}
        <div className="driver-top-bar">
          <button
            type="button"
            className="driver-back-button"
            onClick={handleBackToOrders}
          >
            <ArrowLeft size={16} />
            <span>{t("orders.backToOrders", "Back to Orders")}</span>
          </button>

          <div className="driver-breadcrumb">
            <Link
              to={backToOrdersUrl}
              state={location.state}
              className="driver-breadcrumb-link"
            >
              Order #{activeModel.orderNumber}
            </Link>
            <ChevronRight size={14} className="driver-breadcrumb-separator" />
            <span className="driver-breadcrumb-current">
              {activeModel.driverName}
            </span>
          </div>
        </div>

        {/* ── Main Page Title ── */}
        <div className="driver-page-header">
          <h1 className="driver-page-title">
            {t("driverDetails.title", "Driver details")}
          </h1>
          <p className="driver-page-subtitle">
            {orgName} — {orgCity}
          </p>
        </div>

        {/* ── Driver Profile Banner & 4 KPI Metric Cards ── */}
        <DriverHeaderAndStats model={activeModel} />

        {/* ── Middle Row: Current Location Map & Current Order ── */}
        <div className="driver-middle-row">
          <div className="driver-middle-col-left">
            <DriverLocationMap model={activeModel} />
          </div>
          <div className="driver-middle-col-right">
            <DriverCurrentOrderCard model={activeModel} />
          </div>
        </div>

        {/* ── Row 3: Vehicle details & Driving licence ── */}
        <DriverVehicleLicenceCards model={activeModel} />

        {/* ── Row 4: Trip activity timeline & Cost & dispatch ── */}
        <DriverActivityAndCostCards model={activeModel} />
      </div>
    </DashboardLayout>
  );
}

export default DriverDetailsPage;
