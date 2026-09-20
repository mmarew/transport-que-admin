import { useTranslation } from "react-i18next";
import type { DriverQueueEntry } from "../../../types/queue";
import { formatPhone } from "../../../utils/formatters";

export interface OrgQueueMobileCardsProps {
  entries: DriverQueueEntry[];
}

export function OrgQueueMobileCards({ entries }: OrgQueueMobileCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="od-mobile-cards">
      {entries.map((entry) => {
        const statusKey = entry.status || "waiting";
        const isOffered = statusKey === "offered";
        const isLoaded =
          (statusKey as string) === "loaded" ||
          (statusKey as string) === "assigned" ||
          (statusKey as string) === "completed";
        const statusColor = isLoaded
          ? "#16a34a"
          : isOffered
          ? "#ea580c"
          : "#0284c7";
        const statusBg = isLoaded
          ? "rgba(22, 163, 74, 0.12)"
          : isOffered
          ? "rgba(234, 88, 12, 0.12)"
          : "rgba(2, 132, 199, 0.12)";

        return (
          <div key={entry.queueUniqueId} className="od-mobile-card">
            <div className="od-mobile-card-pos">{entry.queueNumber}</div>
            <div className="od-mobile-card-content">
              <span className="od-mobile-driver-name">
                {entry.driverName || t("reports.driverName")}
              </span>
              <div className="od-mobile-driver-sub">
                <span style={{ fontFamily: "monospace" }}>
                  {formatPhone(entry.driverPhoneNumber)}
                </span>
                {entry.vehicleTypeName && (
                  <span className="od-mobile-vtype">
                    {entry.vehicleTypeName}
                  </span>
                )}
              </div>
            </div>
            <span
              style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 600,
                background: statusBg,
                color: statusColor,
                flexShrink: 0,
              }}
            >
              {t(`reports.${statusKey}`, statusKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default OrgQueueMobileCards;
