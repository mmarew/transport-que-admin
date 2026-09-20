import { useTranslation } from "react-i18next";

export interface KpiCardsProps {
  totalDriversCount: number;
  waitingCount: number;
  totalOrdersCount: number;
  totalOrgs: number;
  activeOrgs: number;
}

/**
 * KpiCards renders the 4 top metrics summary cards for the reports dashboard.
 */
export function KpiCards({
  totalDriversCount,
  waitingCount,
  totalOrdersCount,
  totalOrgs,
  activeOrgs,
}: KpiCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="rep-kpi-grid">
      <div className="rep-kpi-card">
        <span className="rep-kpi-label">
          {t("reports.totalDriver", "Total Driver")}
        </span>
        <span className="rep-kpi-val orange">{totalDriversCount}</span>
        <span className="rep-kpi-sub green">
          {t("reports.checkedIn", "Checked In")}
        </span>
      </div>

      <div className="rep-kpi-card">
        <span className="rep-kpi-label">
          {t("reports.waitingNow", "Waiting Now")}
        </span>
        <span className="rep-kpi-val blue">{waitingCount}</span>
        <span className="rep-kpi-sub blue">
          {t("reports.acrossQueues", "Across all queues")}
        </span>
      </div>

      <div className="rep-kpi-card">
        <span className="rep-kpi-label">
          {t("reports.ordersNow", "Orders Now")}
        </span>
        <span className="rep-kpi-val green">{totalOrdersCount}</span>
        <span className="rep-kpi-sub blue">
          {t("reports.created", "Created")}
        </span>
      </div>

      <div className="rep-kpi-card">
        <span className="rep-kpi-label">
          {t("reports.totalOrganizations", "Total Organizations")}
        </span>
        <span className="rep-kpi-val">{totalOrgs}</span>
        <span className="rep-kpi-sub green">
          {t("reports.activeCount", {
            count: activeOrgs,
            defaultValue: `Active (${activeOrgs})`,
          })}
        </span>
      </div>
    </div>
  );
}

export default KpiCards;
