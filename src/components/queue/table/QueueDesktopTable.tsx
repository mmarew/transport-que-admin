import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DriverQueueEntry } from "../../../types/queue";
import type { QueueRowItem } from "./types";

interface QueueDesktopTableProps {
  rows: QueueRowItem[];
  expandedAddresses: Set<string>;
  onToggleAddress: (key: string, e: React.MouseEvent) => void;
  onOpenShipper: (
    phone: string,
    name: string | null,
    entry: DriverQueueEntry,
  ) => void;
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

export function QueueDesktopTable({
  rows,
  expandedAddresses,
  onToggleAddress,
  onOpenShipper,
  onOverride,
  onRemove,
}: QueueDesktopTableProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-table-responsive qb-table--desktop">
      <table className="qb-table-grid">
        <thead>
          <tr>
            <th className="qb-th-num">{t("queue.positions", "Positions")}</th>
            <th>{t("queue.driver")}</th>
            <th>{t("queue.phone")}</th>
            <th>{t("queue.address", "Address")}</th>
            <th>{t("queue.shipperColumn", "Shipper Name / Phone")}</th>
            <th>{t("queue.joined")}</th>
            <th>{t("queue.status")}</th>
            <th style={{ textAlign: "center", width: "220px" }}>
              {t("queue.action")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="qb-empty-row-text">
                {t("queue.noDrivers")}
              </td>
            </tr>
          ) : (
            rows.map(
              ({
                entry,
                statusKey,
                statusLabel,
                num,
                joinedTime,
                key,
                shipperName,
                shipperPhone,
              }) => (
                <tr key={key}>
                  <td className="qb-th-num">
                    <span className="qb-num-circle">{num}</span>
                  </td>
                  <td className="qb-driver-name">{entry.driverName}</td>
                  <td className="qb-time-text">{entry.driverPhoneNumber}</td>
                  <td
                    className="qb-time-text"
                    style={{ color: "#334155", fontWeight: 500 }}
                  >
                    {entry.driverAddress ? (
                      entry.driverAddress.length > 22 ? (
                        <button
                          type="button"
                          className={`qb-address-toggle-btn ${expandedAddresses.has(key) ? "expanded" : ""}`}
                          onClick={(e) => onToggleAddress(key, e)}
                          title={
                            expandedAddresses.has(key)
                              ? t(
                                  "common.clickToCollapse",
                                  "Click to collapse",
                                )
                              : `${entry.driverAddress} (${t("common.clickForFull", "Click for full address")})`
                          }
                        >
                          {expandedAddresses.has(key)
                            ? entry.driverAddress
                            : `${entry.driverAddress.slice(0, 20)}…`}
                        </button>
                      ) : (
                        entry.driverAddress
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {shipperPhone ? (
                      <button
                        type="button"
                        className="qb-shipper-link"
                        onClick={() =>
                          onOpenShipper(shipperPhone, shipperName, entry)
                        }
                        aria-label={t(
                          "queue.viewShipperRequests",
                          "View requests posted by this shipper",
                        )}
                      >
                        <span className="qb-shipper-text">
                          {shipperName && (
                            <span className="qb-time-text qb-shipper-name">
                              {shipperName}
                            </span>
                          )}
                          <span className="qb-time-text">{shipperPhone}</span>
                        </span>
                        <ChevronRight size={14} className="qb-shipper-chev" />
                      </button>
                    ) : (
                      <span className="qb-time-text">—</span>
                    )}
                  </td>
                  <td className="qb-time-text">{joinedTime}</td>
                  <td>
                    <span className={`qb-status-text ${statusKey}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {statusKey === "removed" || statusKey === "completed" ? (
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
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
