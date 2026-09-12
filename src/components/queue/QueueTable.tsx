import { useState } from "react";
import { ArrowUp, ChevronRight, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DriverQueueEntry, QueueStatus } from "../../types/queue";
import { normalizeQueueEntry } from "../../utils/formatters";
import {
  ShipperRequestsModal,
  type ShipperRequestDetail,
} from "./ShipperRequestsModal";
import "./QueueBoard.css";

interface ShipperInfo {
  fullName?: string;
  phoneNumber?: string;
}

interface QueueTableProps {
  typeId: string;
  entries: DriverQueueEntry[];
  shipperLookup?: Record<string, ShipperInfo>;
  shipperByUserLookup?: Record<string, ShipperInfo>;
  shipperByDriverLookup?: Record<string, ShipperInfo>;
  shipperRequestsByPhone?: Record<string, ShipperRequestDetail[]>;
  queueOrganizationUniqueId?: string;
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

export function QueueTable({
  entries,
  shipperLookup,
  shipperByUserLookup,
  shipperByDriverLookup,
  shipperRequestsByPhone,
  queueOrganizationUniqueId,
  onOverride,
  onRemove,
}: QueueTableProps) {
  const { t } = useTranslation();
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [shipperModal, setShipperModal] = useState<{
    phone: string;
    name: string | null;
    requests: ShipperRequestDetail[];
  } | null>(null);
  console.log("🚀 ~ QueueTable ~ entries:", entries);

  const openShipperModal = (
    phone: string,
    name: string | null,
    entry: DriverQueueEntry,
  ) => {
    // Only the CURRENT actve request for this driver/row — never history.
    const TERMINAL_STATUSES = [9, 10, 11, 12, 13, 14, 15, 16, 19, 20];
    const isActive = (r: ShipperRequestDetail) =>
      !r.journeyStatusId || !TERMINAL_STATUSES.includes(r.journeyStatusId);
    const history = (shipperRequestsByPhone?.[phone] || []).filter(isActive);
    const current = history.filter(
      (r) =>
        r.driverRequests?.some((d) => d.userUniqueId === entry.driverUserUniqueId) ||
        (entry.shipperRequest?.shipperRequestUniqueId &&
          r.shipperRequestUniqueId === entry.shipperRequest.shipperRequestUniqueId),
    );
    setShipperModal({
      phone,
      name,
      requests: current.length ? current : history,
    });
  };

  const toggleAddress = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rows = (entries || []).map((rawEntry, index) => {
    const entry = normalizeQueueEntry(rawEntry);
    const statusKey = (entry.status || "waiting") as QueueStatus;
    const statusLabel =
      entry.statusLabel ||
      statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    const num = entry.queueNumber || index + 1;
    const joinedTime = formatJoinedTime(entry.joinedAt);
    const key = entry.queueUniqueId || `${entry.queueNumber}-${index}`;
    const shipper = entry.shipperRequestUniqueId
      ? shipperLookup?.[entry.shipperRequestUniqueId]
      : undefined;
    const targetedShipper = entry.targetedShipperUserUUID
      ? shipperByUserLookup?.[entry.targetedShipperUserUUID]
      : undefined;
    const boundShipper = entry.driverUserUniqueId
      ? shipperByDriverLookup?.[entry.driverUserUniqueId]
      : undefined;
    const shipperName =
      entry.shipperRequest?.fullName ||
      shipper?.fullName ||
      targetedShipper?.fullName ||
      boundShipper?.fullName ||
      null;
    const shipperPhone =
      entry.shipperRequest?.phoneNumber ||
      shipper?.phoneNumber ||
      targetedShipper?.phoneNumber ||
      boundShipper?.phoneNumber ||
      null;

    return {
      entry,
      statusKey,
      statusLabel,
      num,
      joinedTime,
      key,
      shipperName,
      shipperPhone,
    };
  });

  return (
    <>
      {/* ── Desktop Table: 7 columns with phone + address + text action buttons ── */}
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
                            onClick={(e) => toggleAddress(key, e)}
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
                            openShipperModal(shipperPhone, shipperName, entry)
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

      {/* ── Mobile Table: 5 columns (no phone) + icon-only action buttons ── */}
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
      {shipperModal && (
        <ShipperRequestsModal
          phone={shipperModal.phone}
          name={shipperModal.name}
          requests={shipperModal.requests}
          queueOrganizationUniqueId={queueOrganizationUniqueId || ""}
          onClose={() => setShipperModal(null)}
        />
      )}
    </>
  );
}

export default QueueTable;
