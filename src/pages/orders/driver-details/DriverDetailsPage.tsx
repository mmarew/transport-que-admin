import { useMemo } from "react";
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
import { useQueueAdminStore } from "../../../store/queueAdminStore";
import { normalizeOrgList, extractCity } from "../../../utils/formatters";
import type { OrderDisplayItem } from "../../../components/orders/OrdersTypes";
import { getConnectedJourneyStatus } from "../../../components/orders/OrdersTypes";
import { mapBackendOrdersToDisplayItems } from "../ordersDataMapper";
import { buildDriverDetailsModel } from "./driverDetailsMapper";
import { DriverHeaderAndStats } from "./components/DriverHeaderAndStats";
import { DriverLocationMap } from "./components/DriverLocationMap";
import { DriverCurrentOrderCard } from "./components/DriverCurrentOrderCard";
import { DriverVehicleLicenceCards } from "./components/DriverVehicleLicenceCards";
import { DriverActivityAndCostCards } from "./components/DriverActivityAndCostCards";
import MobileHeader from "../../../components/common/MobileHeader";
import "./DriverDetailsPage.css";

export function DriverDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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

  // 2. Fetch orders and batches to support direct URL refresh / bookmarks
  const { data: backendOrdersData } = useGetShipperRequestsQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      target: "all",
      limit: 100,
    },
    { skip: !orgUniqueId }
  );

  const { data: backendBatchesData } = useGetShipperRequestBatchesQuery(
    {
      queueOrganizationUniqueId: orgUniqueId,
      requestMode: "company_target",
      includeBids: true,
      limit: 100,
    },
    { skip: !orgUniqueId }
  );

  // Derive mapped orders list
  const mappedOrders = useMemo<OrderDisplayItem[]>(() => {
    return mapBackendOrdersToDisplayItems({
      ordersData: backendOrdersData,
      batchesData: backendBatchesData,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg,
      targetOrgId,
      t,
    });
  }, [backendOrdersData, backendBatchesData, activeOrg, targetOrgId, t]);

  // Target ID to match
  const searchId = (paramOrderId || paramBatchId || "").trim();

  // Find the target order
  const resolvedOrder = useMemo<OrderDisplayItem | null>(() => {
    if (location.state?.order) {
      return location.state.order as OrderDisplayItem;
    }

    if (!searchId && !paramReqId) {
      return mappedOrders[0] || null;
    }

    const cleanSearch = searchId.replace(/^#/, "");

    // 1. Exact match on id or unique id
    let found = mappedOrders.find(
      (o) =>
        o.id === searchId ||
        o.id === cleanSearch ||
        o.shipperRequestUniqueId === searchId ||
        o.batchUniqueId === searchId
    );
    if (found) return found;

    // 2. Match on displayId (e.g. "#558/1" or "#558")
    found = mappedOrders.find((o) => {
      const disp = (o.displayId || "").replace(/^#/, "");
      return disp === cleanSearch || o.displayId === searchId;
    });
    if (found) return found;

    // 3. Match on batchId or shipperRequestId
    found = mappedOrders.find((o) => {
      if (paramBatchId && paramReqId) {
        return (
          String(o.batchId) === String(paramBatchId) &&
          String(o.shipperRequestId) === String(paramReqId)
        );
      }
      return (
        String(o.batchId) === cleanSearch ||
        String(o.shipperRequestId) === cleanSearch
      );
    });
    if (found) return found;

    return mappedOrders[0] || null;
  }, [location.state?.order, searchId, paramBatchId, paramReqId, mappedOrders]);

  // Target shipper request UUID for live bidding query
  const targetReqUid =
    resolvedOrder?.shipperRequestUniqueId ||
    (resolvedOrder as any)?.rawItem?.shipperRequest?.shipperRequestUniqueId ||
    "";

  const { data: bidsData } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: targetReqUid },
    { skip: !targetReqUid }
  );

  // Live queue status to access current queue vehicle assignments
  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: orgUniqueId },
    { skip: !orgUniqueId }
  );

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
            <a
              href={`tel:${activeModel.driverPhone}`}
              className="driver-mobile-phone-link"
            >
              {activeModel.driverPhone}
            </a>
          </div>
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
