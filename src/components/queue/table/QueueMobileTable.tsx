import { ArrowUp, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DriverQueueEntry } from "../../../types/queue";
import type { QueueRowItem } from "./types";

interface QueueMobileTableProps {
  rows: QueueRowItem[];
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

export function QueueMobileTable({
  rows,
  onOverride,
  onRemove,
}: QueueMobileTableProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-table-responsive qb-table--mobile">
      <table className="qb-table-grid qb-table-grid--mobile">
        <thead>
          <tr>
            <th className="qb-th-num">{t("queue.positions", "Positions")}</th>
            <th>{t("queue.driver")}</th>
            <th>{t("queue.joined")}</th>
            <th>{t("queue.status")}</th>
            <th className="qb-th-action">{t("queue.action")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="qb-empty-row-text">
                {t("queue.noDrivers")}
              </td>
            </tr>
          ) : (
            rows.map(
              ({ entry, statusKey, statusLabel, num, joinedTime, key }) => (
                <tr key={key}>
                  <td className="qb-th-num">
                    <span className="qb-num-circle">{num}</span>
                  </td>
                  <td className="qb-driver-name">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {entry.driverName}
                      </span>
                      {entry.driverAddress && (
                        <span
                          style={{
                            fontSize: "0.74rem",
                            color: "#64748b",
                            fontWeight: 400,
                          }}
                        >
                          {entry.driverAddress}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="qb-time-text">{joinedTime}</td>
                  <td>
                    <span className={`qb-status-text ${statusKey}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="qb-th-action">
                    {statusKey === "removed" || statusKey === "completed" ? (
                      <span className="qb-action-dash">—</span>
                    ) : (
                      <div className="qb-actions-cell">
                        <button
                          type="button"
                          className="qb-btn-icon-override"
                          onClick={() => onOverride(entry)}
                          title={t("queue.override")}
                          aria-label={t("queue.override")}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          type="button"
                          className="qb-btn-icon-cancel"
                          onClick={() => onRemove(entry)}
                          title={t("queue.cancelDriver")}
                          aria-label={t("queue.cancelDriver")}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
