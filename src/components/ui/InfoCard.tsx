import type { ReactNode } from "react";

export interface InfoCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function InfoCard({
  icon,
  label,
  value,
  subValue,
  className = "",
  onClick,
}: InfoCardProps) {
  return (
    <div
      className={`info-card ${onClick ? "info-card--clickable" : ""} ${className}`}
      onClick={onClick}
    >
      {icon && <div className="info-card-icon">{icon}</div>}
      <div className="info-card-content">
        <span className="info-card-label">{label}</span>
        <span className="info-card-value">{value}</span>
        {subValue && <span className="info-card-subvalue">{subValue}</span>}
      </div>
    </div>
  );
}

export default InfoCard;
