import React from "react";
import {
  LayoutDashboard,
  Building2,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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
    (currentPath.startsWith("/organizations") || currentPath.startsWith("/orgs/")
      ? "organizations"
      : currentPath.startsWith("/reports")
      ? "reports"
      : currentPath.startsWith("/settings")
      ? "settings"
      : "dashboard");

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

        {/* Navigation Items: Dashboard, Organizations, Reports */}
        <nav className="sidebar-nav">
          <SidebarItem
            icon={<LayoutDashboard size={19} />}
            label="Dashboard"
            active={derivedTab === "dashboard"}
            onClick={() => navigate("/dashboard")}
          />
          <SidebarItem
            icon={<Building2 size={19} />}
            label="Organizations"
            active={derivedTab === "organizations"}
            onClick={() => navigate("/organizations")}
          />
          <SidebarItem
            icon={<BarChart2 size={19} />}
            label="Reports"
            active={derivedTab === "reports"}
            onClick={() => navigate("/reports")}
          />
        </nav>

        {/* Bottom Actions: Settings & Sign out */}
        <div className="sidebar-bottom">
          <SidebarItem
            icon={<Settings size={19} />}
            label="Settings"
            active={derivedTab === "settings"}
            onClick={() => navigate("/settings")}
          />
          <SidebarItem
            icon={<LogOut size={19} />}
            label="Sign out"
            active={false}
            onClick={handleLogout}
            className="sidebar-link--logout"
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${derivedTab === "dashboard" ? "active" : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={`mobile-nav-item ${derivedTab === "organizations" ? "active" : ""}`}
          onClick={() => navigate("/organizations")}
        >
          <Building2 size={20} />
          <span>Organizations</span>
        </button>
        <button
          className={`mobile-nav-item ${derivedTab === "reports" ? "active" : ""}`}
          onClick={() => navigate("/reports")}
        >
          <BarChart2 size={20} />
          <span>Reports</span>
        </button>
        <button
          className={`mobile-nav-item ${derivedTab === "settings" ? "active" : ""}`}
          onClick={() => navigate("/settings")}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
