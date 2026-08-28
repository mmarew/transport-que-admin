import { ArrowUp, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DriverQueueEntry, QueueStatus } from "../../types/queue";
import "./QueueBoard.css";

interface QueueTableProps {
  typeId: string;
  entries: DriverQueueEntry[];
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

function formatJoinedTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export function QueueTable({ entries, onOverride, onRemove }: QueueTableProps) {
  const { t } = useTranslation();

  const rows = entries.map((entry, index) => {
    const statusKey = (entry.status || "waiting") as QueueStatus;
    const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    const num = entry.queueNumber || index + 1;
    const joinedTime = formatJoinedTime(entry.joinedAt);
    const key = entry.queueUniqueId || `${entry.queueNumber}-${index}`;
    return { entry, statusKey, statusLabel, num, joinedTime, key };
  });

  return (
    <>
      {/* ── Desktop Table: 6 columns with phone + text action buttons ── */}
      <div className="qb-table-responsive qb-table--desktop">
        <table className="qb-table-grid">
          <thead>
            <tr>
              <th className="qb-th-num">#</th>
              <th>{t("queue.driver")}</th>
              <th>{t("queue.phone")}</th>
              <th>{t("queue.joined")}</th>
              <th>{t("queue.status")}</th>
              <th style={{ textAlign: "center", width: "220px" }}>{t("queue.action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="qb-empty-row-text">{t("queue.noDrivers")}</td>
              </tr>
            ) : rows.map(({ entry, statusKey, statusLabel, num, joinedTime, key }) => (
              <tr key={key}>
                <td className="qb-th-num">
                  <span className="qb-num-circle">{num}</span>
                </td>
                <td className="qb-driver-name">{entry.driverName}</td>
                <td className="qb-time-text">{entry.driverPhoneNumber}</td>
                <td className="qb-time-text">{joinedTime}</td>
                <td>
                  <span className={`qb-status-text ${statusKey}`}>{statusLabel}</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  {statusKey === "removed" ? (
                    <span className="qb-action-dash">—</span>
                  ) : (
                    <div className="qb-actions-cell">
                      <button
                        type="button"
                        className="qb-btn-text-override"
                        onClick={() => onOverride(entry)}
                      >
                        {t("queue.override")}
                      </button>
                      <button
                        type="button"
                        className="qb-btn-text-cancel"
                        onClick={() => onRemove(entry)}
                      >
                        {t("queue.cancelDriver")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Table: 5 columns (no phone) + icon-only action buttons ── */}
      <div className="qb-table-responsive qb-table--mobile">
        <table className="qb-table-grid qb-table-grid--mobile">
          <thead>
            <tr>
              <th className="qb-th-num">#</th>
              <th>{t("queue.driver")}</th>
              <th>{t("queue.joined")}</th>
              <th>{t("queue.status")}</th>
              <th className="qb-th-action">{t("queue.action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="qb-empty-row-text">{t("queue.noDrivers")}</td>
              </tr>
            ) : rows.map(({ entry, statusKey, statusLabel, num, joinedTime, key }) => (
              <tr key={key}>
                <td className="qb-th-num">
                  <span className="qb-num-circle">{num}</span>
                </td>
                <td className="qb-driver-name">{entry.driverName}</td>
                <td className="qb-time-text">{joinedTime}</td>
                <td>
                  <span className={`qb-status-text ${statusKey}`}>{statusLabel}</span>
                </td>
                <td className="qb-th-action">
                  {statusKey === "removed" ? (
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
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default QueueTable;
