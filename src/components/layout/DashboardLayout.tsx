import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar, { type QueueSidebarTab } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import "../../styles/dashboard.css";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  activeTab?: QueueSidebarTab;
  actions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  activeTab,
  actions,
}) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("queue_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handleStorage = () => {
      setIsCollapsed(localStorage.getItem("queue_sidebar_collapsed") === "true");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const userName = auth?.userData?.fullName || "Admin User";
  const userAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userName
  )}&background=0B4D6D&color=ffffff&bold=true`;

  return (
    <div className={`dashboard-container ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => {
          const next = !isCollapsed;
          setIsCollapsed(next);
          localStorage.setItem("queue_sidebar_collapsed", String(next));
        }}
      />

      <div className="main-content-wrapper">
        {/* ── Topbar ── */}
        <header className="mc-topbar">
          <div className="mc-topbar-icons">
            {/* Notification Bell */}
            <button
              className="mc-icon-btn"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={1.8} />
              <span className="notification-dot" />
            </button>

            {/* User Profile Avatar */}
            <button
              className="mc-avatar-btn"
              title={userName}
              onClick={() => navigate("/settings")}
            >
              <img
                src={userAvatarUrl}
                alt={userName}
                className="mc-avatar-img"
              />
            </button>
          </div>
        </header>

        {/* ── Main Lavender Background Content ── */}
        <main className="main-content">
          {(title || actions) && (
            <div className="mc-title-row">
              <div className="mc-title-left">
                {title && <h1 className="mc-title">{title}</h1>}
                {subtitle && <p className="mc-subtitle">{subtitle}</p>}
              </div>
              {actions && <div className="mc-title-actions">{actions}</div>}
            </div>
          )}

          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
