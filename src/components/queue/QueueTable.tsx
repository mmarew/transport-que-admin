import { ChevronDown } from "lucide-react";
import type { DriverQueueEntry, QueueStatus } from "../../types/queue";
import "./QueueBoard.css";

export const STATUS_STYLES: Record<QueueStatus, string> = {
  waiting: "waiting",
  offered: "offered",
  loaded: "loaded",
  removed: "removed",
};

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
  return (
    <div className="qb-table-responsive">
      <table className="qb-table-grid">
        <thead>
          <tr>
            <th style={{ width: "60px" }}>#</th>
            <th>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                Driver <ChevronDown size={13} />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                Phone <ChevronDown size={13} />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                Joined <ChevronDown size={13} />
              </span>
            </th>
            <th>Status</th>
            <th style={{ textAlign: "center", width: "190px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="qb-empty-row-text">
                No drivers currently waiting in queue
              </td>
            </tr>
          ) : (
            entries.map((entry, index) => {
              const statusKey = (entry.status || "waiting") as QueueStatus;
              return (
                <tr key={entry.queueUniqueId || `${entry.queueNumber}-${index}`}>
                  <td>
                    <span className="qb-num-circle">{entry.queueNumber || index + 1}</span>
                  </td>
                  <td className="qb-driver-name">{entry.driverName}</td>
                  <td>{entry.driverPhoneNumber}</td>
                  <td>{formatJoinedTime(entry.joinedAt)}</td>
                  <td>
                    <span className="qb-status-cell">
                      <span className={`qb-status-dot-circle ${statusKey}`} />
                      {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="qb-actions-cell">
                      <button
                        type="button"
                        className="qb-btn-override-outline"
                        onClick={() => onOverride(entry)}
                      >
                        Override
                      </button>
                      <button
                        type="button"
                        className="qb-btn-cancel-outline"
                        onClick={() => onRemove(entry)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default QueueTable;
