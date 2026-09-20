import { useTranslation } from "react-i18next";
import type { DriverQueueEntry } from "../../../types/queue";
import { formatPhone } from "../../../utils/formatters";

export interface OrgQueueDesktopTableProps {
  entries: DriverQueueEntry[];
}

export function OrgQueueDesktopTable({ entries }: OrgQueueDesktopTableProps) {
  const { t } = useTranslation();

  return (
    <table className="od-desktop-table">
      <thead>
        <tr
          style={{
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            color: "#64748b",
          }}
        >
          <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
            {t("reports.ticketNo", "Positions")}
          </th>
          <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
            {t("reports.driverName", "Driver")}
          </th>
          <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
            {t("reports.phone", "Phone")}
          </th>
          <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
            {t("reports.vehicleType", "Vehicle Type")}
          </th>
          <th
            style={{
              padding: "0.6rem 0.75rem",
              fontWeight: 600,
              textAlign: "right",
            }}
          >
            {t("reports.status", "Status")}
          </th>
        </tr>
      </thead>
      <tbody>
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
            ? "rgba(22, 163, 74, 0.1)"
            : isOffered
            ? "rgba(234, 88, 12, 0.1)"
            : "rgba(2, 132, 199, 0.1)";

          return (
            <tr
              key={entry.queueUniqueId}
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <td
                style={{
                  padding: "0.65rem 0.75rem",
                  fontWeight: 700,
                  color: "#0B4D6D",
                }}
              >
                {entry.queueNumber}
              </td>
              <td
                style={{
                  padding: "0.65rem 0.75rem",
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span>{entry.driverName || t("reports.driverName")}</span>
                  {entry.driverAddress && (
                    <span
                      style={{
                        fontSize: "0.725rem",
                        color: "#64748b",
                        fontWeight: 400,
                      }}
                    >
                      {entry.driverAddress}
                    </span>
                  )}
                </div>
              </td>
              <td
                style={{
                  padding: "0.65rem 0.75rem",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                }}
              >
                {formatPhone(entry.driverPhoneNumber)}
              </td>
              <td style={{ padding: "0.65rem 0.75rem", color: "#475569" }}>
                {entry.vehicleTypeName || t("orgDetails.vehicleGeneral")}
              </td>
              <td
                style={{
                  padding: "0.65rem 0.75rem",
                  textAlign: "right",
                }}
              >
                <span
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "9999px",
                    fontSize: "0.725rem",
                    fontWeight: 600,
                    background: statusBg,
                    color: statusColor,
                  }}
                >
                  {entry.statusLabel || t(`reports.${statusKey}`, statusKey)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default OrgQueueDesktopTable;
