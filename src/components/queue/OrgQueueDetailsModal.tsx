import React, { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  X,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  ExternalLink,
  Truck,
} from "lucide-react";
import { useGetQueueStatusQuery } from "../../lib/redux/api";
import type { QueueOrganization, DriverQueueEntry } from "../../types/queue";
import { formatPhone, extractCity, normalizeQueueEntry } from "../../utils/formatters";
import MobileHeader from "../common/MobileHeader";
import "./QueueModals.css";

interface OrgQueueDetailsModalProps {
  org: QueueOrganization | null;
  onClose: () => void;
}

export const OrgQueueDetailsModal: React.FC<OrgQueueDetailsModalProps> = ({
  org,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const orgId = org?.queueOrganizationUniqueId || "";

  const { data: queueData, isLoading } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: orgId },
    { skip: !orgId }
  );

  const allEntries: DriverQueueEntry[] = useMemo(() => {
    if (!queueData?.data?.queues) return [];
    return Object.values(queueData.data.queues)
      .flat()
      .map(normalizeQueueEntry);
  }, [queueData]);

  const waitingCount = allEntries.filter(
    (e) => !e.status || e.status === "waiting"
  ).length;

  const offeredCount = allEntries.filter((e) => e.status === "offered").length;

  const loadedCount = allEntries.filter(
    (e) =>
      (e.status as string) === "loaded" ||
      (e.status as string) === "assigned" ||
      (e.status as string) === "completed"
  ).length;

  const totalDrivers = allEntries.length;

  if (!org) return null;

  const approvalStatusLower = (org.approvalStatus || "").toLowerCase();
  const isApproved = approvalStatusLower === "approved";
  const displayStatus = isApproved
    ? t("reports.approved", "Approved")
    : approvalStatusLower === "pending"
    ? t("reports.pending", "Pending")
    : org.approvalStatus
    ? org.approvalStatus.charAt(0).toUpperCase() + org.approvalStatus.slice(1)
    : t("reports.approved", "Approved");

  const handleOpenFullBoard = () => {
    onClose();
    navigate(`/dashboard?orgId=${org.queueOrganizationUniqueId}`);
  };

  return createPortal(
    <div className="qm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="qm-modal qm-modal--org-details"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header */}
        <div className="qm-mobile-header">
          <MobileHeader title={org.queueOrganizationName} onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="qm-header qm-header--desktop">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(11, 77, 109, 0.1)",
                color: "#0B4D6D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 className="qm-title" style={{ fontSize: "1.15rem", margin: 0 }}>
                  {org.queueOrganizationName}
                </h3>
                <span
                  style={{
                    fontSize: "0.725rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    background: isApproved ? "rgba(22, 163, 74, 0.12)" : "rgba(234, 88, 12, 0.12)",
                    color: isApproved ? "#16a34a" : "#ea580c",
                  }}
                >
                  {displayStatus}
                </span>
              </div>
              <p className="qm-subtitle" style={{ margin: "0.2rem 0 0", fontSize: "0.825rem", color: "#64748b" }}>
                {org.queueOrganizationAddress || extractCity(org.queueOrganizationAddress) || t("reports.terminalLocation", "Terminal Location")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="qm-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Metric Cards Summary */}
        <div className="od-metrics-grid">
          <div className="od-metric-card total">
            <span className="od-metric-label" style={{ color: "#64748b" }}>
              <Users size={13} /> {t("reports.totalDrivers", "Total Drivers")}
            </span>
            <div className="od-metric-val" style={{ color: "#0B4D6D" }}>
              {totalDrivers}
            </div>
          </div>

          <div className="od-metric-card waiting">
            <span className="od-metric-label" style={{ color: "#0284c7" }}>
              <Clock size={13} /> {t("reports.waitingDrivers", "Waiting")}
            </span>
            <div className="od-metric-val" style={{ color: "#0284c7" }}>
              {waitingCount}
            </div>
          </div>

          <div className="od-metric-card offered">
            <span className="od-metric-label" style={{ color: "#ea580c" }}>
              <Truck size={13} /> {t("reports.offeredDrivers", "Offered")}
            </span>
            <div className="od-metric-val" style={{ color: "#ea580c" }}>
              {offeredCount}
            </div>
          </div>

          <div className="od-metric-card loaded">
            <span className="od-metric-label" style={{ color: "#16a34a" }}>
              <CheckCircle2 size={13} /> {t("reports.loadedDrivers", "Loaded")}
            </span>
            <div className="od-metric-val" style={{ color: "#16a34a" }}>
              {loadedCount}
            </div>
          </div>
        </div>

        {/* Drivers Queue Table / Content */}
        <div className="od-table-container">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <div className="add-docs-spinner" style={{ width: 26, height: 26, margin: "0 auto 0.75rem" }} />
              <span style={{ fontSize: "0.875rem" }}>{t("common.loading", "Loading...")}</span>
            </div>
          ) : allEntries.length > 0 ? (
            <>
              {/* Desktop Table */}
              <table className="od-desktop-table">
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{t("reports.ticketNo", "Positions")}</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{t("reports.driverName", "Driver")}</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{t("reports.phone", "Phone")}</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{t("reports.vehicleType", "Vehicle Type")}</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 600, textAlign: "right" }}>{t("reports.status", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map((entry) => {
                    const statusKey = entry.status || "waiting";
                    const isOffered = statusKey === "offered";
                    const isLoaded = (statusKey as string) === "loaded" || (statusKey as string) === "assigned" || (statusKey as string) === "completed";
                    const statusColor = isLoaded ? "#16a34a" : isOffered ? "#ea580c" : "#0284c7";
                    const statusBg = isLoaded ? "rgba(22, 163, 74, 0.1)" : isOffered ? "rgba(234, 88, 12, 0.1)" : "rgba(2, 132, 199, 0.1)";

                    return (
                      <tr
                        key={entry.queueUniqueId}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: "#0B4D6D" }}>
                          {entry.queueNumber}
                        </td>
                        <td style={{ padding: "0.65rem 0.75rem", fontWeight: 600, color: "#1e293b" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>{entry.driverName || "Driver"}</span>
                            {entry.driverAddress && (
                              <span style={{ fontSize: "0.725rem", color: "#64748b", fontWeight: 400 }}>
                                {entry.driverAddress}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "#475569", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {formatPhone(entry.driverPhoneNumber)}
                        </td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "#475569" }}>
                          {entry.vehicleTypeName || "General"}
                        </td>
                        <td style={{ padding: "0.65rem 0.75rem", textAlign: "right" }}>
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
                            {t(`reports.${statusKey}`, statusKey)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="od-mobile-cards">
                {allEntries.map((entry) => {
                  const statusKey = entry.status || "waiting";
                  const isOffered = statusKey === "offered";
                  const isLoaded = (statusKey as string) === "loaded" || (statusKey as string) === "assigned" || (statusKey as string) === "completed";
                  const statusColor = isLoaded ? "#16a34a" : isOffered ? "#ea580c" : "#0284c7";
                  const statusBg = isLoaded ? "rgba(22, 163, 74, 0.12)" : isOffered ? "rgba(234, 88, 12, 0.12)" : "rgba(2, 132, 199, 0.12)";

                  return (
                    <div key={entry.queueUniqueId} className="od-mobile-card">
                      <div className="od-mobile-card-pos">
                        {entry.queueNumber}
                      </div>
                      <div className="od-mobile-card-content">
                        <span className="od-mobile-driver-name">{entry.driverName || "Driver"}</span>
                        <div className="od-mobile-driver-sub">
                          <span style={{ fontFamily: "monospace" }}>{formatPhone(entry.driverPhoneNumber)}</span>
                          {entry.vehicleTypeName && (
                            <span className="od-mobile-vtype">{entry.vehicleTypeName}</span>
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
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
              <Truck size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.6 }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                {t("reports.noDriversInQueue", "No drivers currently registered in this queue.")}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #f1f5f9",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("common.close", "Close")}
          </button>

          <button
            type="button"
            onClick={handleOpenFullBoard}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              border: "none",
              background: "#0B4D6D",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>{t("reports.openFullBoard", "Manage Full Queue")}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrgQueueDetailsModal;
