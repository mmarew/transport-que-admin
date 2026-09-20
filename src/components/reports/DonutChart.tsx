import { useTranslation } from "react-i18next";

export interface DonutChartProps {
  waitingCount: number;
  waitingPercent: number;
  offeredCount: number;
  offeredPercent: number;
  loadedCount: number;
  loadedPercent: number;
}

/**
 * DonutChart renders the driver status breakdown SVG donut chart and legend list.
 */
export function DonutChart({
  waitingCount,
  waitingPercent,
  offeredCount,
  offeredPercent,
  loadedCount,
  loadedPercent,
}: DonutChartProps) {
  const { t } = useTranslation();

  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const waitingStroke = (waitingPercent / 100) * circumference;
  const offeredStroke = (offeredPercent / 100) * circumference;
  const loadedStroke = (loadedPercent / 100) * circumference;

  const waitingOffset = 0;
  const offeredOffset = -waitingStroke;
  const loadedOffset = -(waitingStroke + offeredStroke);

  return (
    <div className="rep-chart-card">
      <h3 className="rep-card-title">{t("reports.status", "Status")}</h3>
      <div className="rep-donut-wrap">
        <div className="rep-donut-svg-box">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="18"
            />
            {waitingStroke > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#16a34a"
                strokeWidth="18"
                strokeDasharray={`${waitingStroke} ${circumference}`}
                strokeDashoffset={waitingOffset}
              />
            )}
            {offeredStroke > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#ea580c"
                strokeWidth="18"
                strokeDasharray={`${offeredStroke} ${circumference}`}
                strokeDashoffset={offeredOffset}
              />
            )}
            {loadedStroke > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#034b6e"
                strokeWidth="18"
                strokeDasharray={`${loadedStroke} ${circumference}`}
                strokeDashoffset={loadedOffset}
              />
            )}
          </svg>
        </div>

        <div className="rep-legend-list">
          <div className="rep-legend-item">
            <span className="rep-legend-dot waiting" />
            <span>
              {t("reports.waiting", "Waiting")} ({waitingCount} • {waitingPercent}%)
            </span>
          </div>
          <div className="rep-legend-item">
            <span className="rep-legend-dot offered" />
            <span>
              {t("reports.offered", "Offered")} ({offeredCount} • {offeredPercent}%)
            </span>
          </div>
          <div className="rep-legend-item">
            <span className="rep-legend-dot loaded" />
            <span>
              {t("reports.loaded", "Loaded")} ({loadedCount} • {loadedPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonutChart;
