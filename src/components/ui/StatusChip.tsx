import React from "react";

export interface StatusChipProps {
  label: string;
  status?: string;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  className?: string;
  icon?: React.ReactNode;
}

export function StatusChip({
  label,
  status,
  variant = "neutral",
  className = "",
  icon,
}: StatusChipProps) {
  const statusClass = status ? `status-${status.toLowerCase()}` : "";
  const variantClass = `status-chip--${variant}`;

  return (
    <span className={`status-chip ${variantClass} ${statusClass} ${className}`}>
      {icon && <span className="status-chip-icon">{icon}</span>}
      <span className="status-chip-text">{label}</span>
    </span>
  );
}

export default StatusChip;
