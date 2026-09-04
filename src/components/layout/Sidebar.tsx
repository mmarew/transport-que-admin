import React, { useMemo } from "react";
import {
  LayoutDashboard,
  Radio,
  Layers,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SidebarItem from "./SidebarItem";
import { useAuth } from "../../context/AuthContext";
import { disconnectSocket } from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { useGetShipperRequestsQuery } from "../../lib/redux/api";

export type QueueSidebarTab =
  | "dashboard"
  | "liveQueue"
  | "orders"
  | "organizations"
  | "reports"
  | "settings";

interface SidebarProps {
  activeTab?: QueueSidebarTab;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ShipperRequestResponseRaw {
  shipperRequest?: {
    journeyStatusId?: number;
    isCompleted?: boolean;
    status?: string;
    requestStatus?: string;
  };
  journeyStatusId?: number;
  isCompleted?: boolean;
  status?: string;
  requestStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const currentPath = location.pathname;
  const currentSearch = location.search;

  // An organization is active ONLY when selected via Manage or explicitly in URL
  const urlOrgId = new URLSearchParams(currentSearch).get("orgId");
  const routeOrgId = currentPath.startsWith("/orgs/") ? currentPath.split("/")[2] : "";

  // The organization is actively being managed if an orgId is in URL, activeTab is liveQueue/orders, or on orders page
  const isManagingOrg =
    Boolean(urlOrgId) ||
    Boolean(routeOrgId) ||
    currentPath.startsWith("/orders") ||
    activeTab === "liveQueue" ||
    activeTab === "orders";

  // Effective organization ID when an organization is actively being managed
  const effectiveOrgId = isManagingOrg ? (urlOrgId || routeOrgId || selectedOrgId || "") : "";
  const hasActiveOrg = Boolean(effectiveOrgId);

  // Check remaining orders for the managed organization
  const { data: ordersData } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: effectiveOrgId, target: "all", limit: 100 },
    { skip: !effectiveOrgId }
  );

  const remainingOrdersCount = useMemo(() => {
    const list = ordersData?.data as unknown as ShipperRequestResponseRaw[] | undefined;
    if (!Array.isArray(list)) return 0;
    return list.filter((item) => {
      const req = item?.shipperRequest || item;
      const statusId = req?.journeyStatusId;
      const isComplete = Boolean(
        req?.isCompleted ||
        statusId === 9 ||
        statusId === 6 ||
        String(req?.status || "").toLowerCase() === "completed" ||
        String(req?.status || "").toLowerCase() === "delivered" ||
        String(req?.requestStatus || "").toLowerCase() === "completed"
      );
      return !isComplete;
    }).length;
  }, [ordersData]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  // Active state calculations
  const isOrdersActive =
    hasActiveOrg && (activeTab === "orders" || currentPath.startsWith("/orders"));

  const isLiveQueueActive =
    hasActiveOrg &&
    !isOrdersActive &&
    (activeTab === "liveQueue" || Boolean(urlOrgId) || currentPath.startsWith("/orgs/"));

  const isReportsActive =
    activeTab === "reports" || currentPath.startsWith("/reports");

  const isSettingsActive =
    activeTab === "settings" || currentPath.startsWith("/settings");

  const isDashboardActive =
    !isLiveQueueActive && !isOrdersActive && !isReportsActive && !isSettingsActive;

  const handleNavigateDashboard = () => {
    setSelectedOrgId("");
    navigate("/dashboard");
  };

  const handleNavigateLiveQueue = () => {
    if (!hasActiveOrg) return;
    navigate(`/dashboard?orgId=${effectiveOrgId}`);
  };

  const handleNavigateOrders = () => {
    if (!hasActiveOrg) return;
    navigate(`/orders?orgId=${effectiveOrgId}`);
  };

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""}`}>
        {/* Brand Header: Dynamic */}
        <div className="sidebar-brand">
          {!isCollapsed && (
            <div
              className="sidebar-brand-left"
              onClick={handleNavigateDashboard}
              role="button"
              tabIndex={0}
            >
              <span className="sidebar-brand-name">{t("nav.brand", "Dynamic")}</span>
            </div>
          )}
          {onToggleCollapse && (
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Desktop Navigation Items */}
        <nav className="sidebar-nav">
          <SidebarItem
            icon={<LayoutDashboard size={19} />}
            label={t("nav.dashboard", "Dashboard")}
            active={isDashboardActive}
            onClick={handleNavigateDashboard}
          />
          {/* Live Queue: Active & clickable ONLY when an organization is managed */}
          <SidebarItem
            icon={<Radio size={19} />}
            label={t("nav.liveQueue", "Live Queue")}
            active={isLiveQueueActive}
            disabled={!hasActiveOrg}
            onClick={handleNavigateLiveQueue}
          />
          {/* Orders: Active & checks remaining orders ONLY when an organization is managed */}
          <SidebarItem
            icon={<Layers size={19} />}
            label={t("nav.orders", "Orders")}
            active={isOrdersActive}
            disabled={!hasActiveOrg}
            onClick={handleNavigateOrders}
            badge={hasActiveOrg && remainingOrdersCount > 0 ? remainingOrdersCount : undefined}
          />
          <SidebarItem
            icon={<BarChart2 size={19} />}
            label={t("nav.reports", "Reports")}
            active={isReportsActive}
            onClick={() => navigate("/reports")}
          />
        </nav>

        {/* Desktop Bottom Actions: Settings & Sign out */}
        <div className="sidebar-bottom">
          <SidebarItem
            icon={<Settings size={19} />}
            label={t("nav.settings", "Settings")}
            active={isSettingsActive}
            onClick={() => navigate("/settings")}
          />
          <SidebarItem
            icon={<LogOut size={19} />}
            label={t("nav.signOut", "Logout")}
            active={false}
            onClick={handleLogout}
            className="sidebar-link--logout"
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${isDashboardActive ? "active" : ""}`}
          onClick={handleNavigateDashboard}
        >
          <LayoutDashboard size={20} />
          <span>{t("nav.dashboard", "Dashboard")}</span>
        </button>
        {hasActiveOrg && (
          <>
            <button
              className={`mobile-nav-item ${isLiveQueueActive ? "active" : ""}`}
              onClick={handleNavigateLiveQueue}
            >
              <Radio size={20} />
              <span>{t("nav.liveQueue", "Live Queue")}</span>
            </button>
            <button
              className={`mobile-nav-item ${isOrdersActive ? "active" : ""}`}
              onClick={handleNavigateOrders}
            >
              <Layers size={20} />
              <span>{t("nav.orders", "Orders")}</span>
            </button>
          </>
        )}
        <button
          className={`mobile-nav-item ${isSettingsActive ? "active" : ""}`}
          onClick={() => navigate("/settings")}
        >
          <Settings size={20} />
          <span>{t("nav.settings", "Settings")}</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
