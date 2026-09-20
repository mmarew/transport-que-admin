import { useTranslation } from "react-i18next";
import { Users, Clock, Truck, CheckCircle2 } from "lucide-react";

export interface OrgQueueMetricsGridProps {
  totalDrivers: number;
  waitingCount: number;
  offeredCount: number;
  loadedCount: number;
}

export function OrgQueueMetricsGrid({
  totalDrivers,
  waitingCount,
  offeredCount,
  loadedCount,
}: OrgQueueMetricsGridProps) {
  const { t } = useTranslation();

  return (
    <div className="od-metrics-grid">
      <div className="od-metric-card total">
        <span className="od-metric-label" style={{ color: "#64748b" }}>
          <Users size={13} /> {t("reports.totalDrivers", "Total Drivers")}
        </span>
        <div className="od-metric-val" style={{ color: "#0B4D6D" }}>
          {totalDrivers}
        </div>
      </div>

      <div className="od-metric-card waiting">
        <span className="od-metric-label" style={{ color: "#0284c7" }}>
          <Clock size={13} /> {t("reports.waitingDrivers", "Waiting")}
        </span>
        <div className="od-metric-val" style={{ color: "#0284c7" }}>
          {waitingCount}
        </div>
      </div>

      <div className="od-metric-card offered">
        <span className="od-metric-label" style={{ color: "#ea580c" }}>
          <Truck size={13} /> {t("reports.offeredDrivers", "Offered")}
        </span>
        <div className="od-metric-val" style={{ color: "#ea580c" }}>
          {offeredCount}
        </div>
      </div>

      <div className="od-metric-card loaded">
        <span className="od-metric-label" style={{ color: "#16a34a" }}>
          <CheckCircle2 size={13} /> {t("reports.loadedDrivers", "Loaded")}
        </span>
        <div className="od-metric-val" style={{ color: "#16a34a" }}>
          {loadedCount}
        </div>
      </div>
    </div>
  );
}

export default OrgQueueMetricsGrid;
