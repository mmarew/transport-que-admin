import { useTranslation } from "react-i18next";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface MonthlyBarChartProps {
  currentMonthRequests: number;
  maxMonthlyCount: number;
  monthlyRequests: number[];
  currentMonthIdx: number;
}

/**
 * MonthlyBarChart renders the 12-month requests bar chart with dynamic Y-axis markers.
 */
export function MonthlyBarChart({
  currentMonthRequests,
  maxMonthlyCount,
  monthlyRequests,
  currentMonthIdx,
}: MonthlyBarChartProps) {
  const { t } = useTranslation();

  return (
    <div className="rep-chart-card">
      <h3 className="rep-card-title">
        {t("reports.numberOfRequests", "Number of Requests")}
      </h3>
      <div className="rep-bar-header">
        <span className="rep-bar-total">{currentMonthRequests}</span>
      </div>

      <div className="rep-bar-chart-layout">
        {/* Dynamic Y-Axis markers */}
        <div className="rep-y-axis">
          <span>{maxMonthlyCount}</span>
          <span>{Math.round(maxMonthlyCount * 0.75)}</span>
          <span>{Math.round(maxMonthlyCount * 0.5)}</span>
          <span>{Math.round(maxMonthlyCount * 0.25)}</span>
          <span>0</span>
        </div>

        <div className="rep-bar-chart-container">
          {MONTH_NAMES.map((month, idx) => {
            const val = monthlyRequests[idx] || 0;
            const heightPercent =
              val > 0
                ? Math.min(100, Math.max(12, (val / maxMonthlyCount) * 100))
                : 4;
            const isCurrentMonth = idx === currentMonthIdx;
            const monthTranslated = t(`reports.months.${month}`, month);

            return (
              <div key={month} className="rep-bar-col">
                <div
                  className={`rep-bar-pillar ${isCurrentMonth ? "active-month" : ""}`}
                  style={{ height: `${heightPercent}%` }}
                  title={t("reports.requestsCount", {
                    month: monthTranslated,
                    count: val,
                    defaultValue: `${monthTranslated}: ${val} requests`,
                  })}
                />
                <span
                  className="rep-bar-label"
                  style={{
                    color: isCurrentMonth ? "#0284c7" : "#64748b",
                    fontWeight: isCurrentMonth ? 700 : 500,
                  }}
                >
                  {monthTranslated}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonthlyBarChart;
