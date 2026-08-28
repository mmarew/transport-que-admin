import React from "react";
import {
  Building2,
  BarChart2,
  Database,
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

export type QueueSidebarTab =
  | "dashboard"
  | "organizations"
  | "reports"
  | "settings";

interface SidebarProps {
  activeTab?: QueueSidebarTab;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  const currentPath = location.pathname;
  const derivedTab: QueueSidebarTab =
    activeTab ??
    (currentPath.startsWith("/reports")
      ? "reports"
      : currentPath.startsWith("/settings")
      ? "settings"
      : "organizations");

  const isOrgActive =
    derivedTab === "organizations" ||
    derivedTab === "dashboard" ||
    currentPath.startsWith("/dashboard") ||
    currentPath.startsWith("/organizations") ||
    currentPath.startsWith("/orgs/") ||
    currentPath === "/";

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""}`}>
        {/* Brand Header: Dynamic */}
        <div className="sidebar-brand">
          {!isCollapsed && (
            <div
              className="sidebar-brand-left"
              onClick={() => navigate("/dashboard")}
              role="button"
              tabIndex={0}
            >
              <span className="sidebar-brand-name">Dynamic</span>
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

        {/* Desktop Navigation Items: Organizations, Reports */}
        <nav className="sidebar-nav">
          <SidebarItem
            icon={<Building2 size={19} />}
            label={t("nav.organizations")}
            active={isOrgActive}
            onClick={() => navigate("/dashboard")}
          />
          <SidebarItem
            icon={<BarChart2 size={19} />}
            label={t("nav.reports")}
            active={derivedTab === "reports"}
            onClick={() => navigate("/reports")}
          />
        </nav>

        {/* Desktop Bottom Actions: Settings & Sign out */}
        <div className="sidebar-bottom">
          <SidebarItem
            icon={<Settings size={19} />}
            label={t("nav.settings")}
            active={derivedTab === "settings"}
            onClick={() => navigate("/settings")}
          />
          <SidebarItem
            icon={<LogOut size={19} />}
            label={t("nav.signOut")}
            active={false}
            onClick={handleLogout}
            className="sidebar-link--logout"
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Organizations, Reports, Settings) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${isOrgActive ? "active" : ""}`}
          onClick={() => navigate("/organizations")}
        >
          <Building2 size={20} />
          <span>{t("nav.organizations")}</span>
        </button>
        <button
          className={`mobile-nav-item ${derivedTab === "reports" ? "active" : ""}`}
          onClick={() => navigate("/reports")}
        >
          <Database size={20} />
          <span>{t("nav.reports")}</span>
        </button>
        <button
          className={`mobile-nav-item ${derivedTab === "settings" ? "active" : ""}`}
          onClick={() => navigate("/settings")}
        >
          <Settings size={20} />
          <span>{t("nav.settings")}</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
