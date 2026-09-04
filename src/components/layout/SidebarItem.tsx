import React from "react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  badge?: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active,
  onClick,
  disabled = false,
  className = "",
  badge,
}) => (
  <div
    className={`sidebar-link ${active ? "active" : ""} ${
      disabled ? "sidebar-link--disabled" : ""
    } ${className}`}
    title={disabled ? `${label} (Select an organization to manage)` : label}
    onClick={disabled ? undefined : onClick}
    onKeyDown={(e) => {
      if (!disabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    }}
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-pressed={active}
    aria-disabled={disabled}
  >
    {icon}
    <span>{label}</span>
    {!disabled && badge != null && <span className="sidebar-link-badge">{badge}</span>}
  </div>
);

export default SidebarItem;
