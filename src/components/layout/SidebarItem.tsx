import React from "react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active,
  onClick,
  disabled = false,
  className = "",
}) => (
  <div
    className={`sidebar-link ${active ? "active" : ""} ${
      disabled ? "opacity-40 cursor-not-allowed" : ""
    } ${className}`}
    title={label}
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
  >
    {icon}
    <span>{label}</span>
  </div>
);

export default SidebarItem;
